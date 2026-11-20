"use strict";

/* ==========================================================================
   dmd - Autenticación real vía SSO de DMD (https://login.dmdmx.dev/api/auth/)
   - Usa credentials: "include" con la cookie de sesión compartida
     Domain=.dmdmx.dev.
   - Endpoints:
       GET  /api/auth/me
       POST /api/auth/login
       POST /api/auth/register
       POST /api/auth/logout
   - Sin autenticación local ni cuentas en localStorage: toda identidad y
     sesión provienen únicamente del servidor.
   - Para acceso con Google se redirige a https://login.dmdmx.dev/ (sesión
     compartida en .dmdmx.dev), sin incrustar Google Identity Services aquí.
   ========================================================================== */

const API_AUTH_BASE = "https://login.dmdmx.dev/api/auth";
const URL_LOGIN_GOOGLE_SSO = "https://login.dmdmx.dev/";

function limpiarTextoCuenta(valor) {
  return String(valor || "").replace(/\s+/g, " ").trim();
}

function normalizarCorreo(correo) {
  return String(correo || "").trim().toLowerCase();
}

function esCorreoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
}

// Limpieza de posibles residuos heredados de autenticación local anterior.
(function limpiarResiduosAuthLocal() {
  try {
    if (window.localStorage) {
      window.localStorage.removeItem("dmd_cuentas_v1");
      window.localStorage.removeItem("dmd_sesion_v1");
    }
    if (window.sessionStorage) {
      window.sessionStorage.removeItem("dmd_cuentas_v1");
      window.sessionStorage.removeItem("dmd_sesion_v1");
    }
  } catch (error) {
    // Ignorar si el almacenamiento está restringido.
  }
})();

function extraerCuotaTexto(data, usuario) {
  const candidatos = [
    data && data.quota,
    data && data.cuota,
    usuario && usuario.quota,
    usuario && usuario.cuota
  ];

  for (let i = 0; i < candidatos.length; i += 1) {
    const c = candidatos[i];
    if (typeof c === "number" && Number.isFinite(c)) {
      return { valor: c, texto: String(c) };
    }
    if (typeof c === "string" && c.trim() !== "") {
      return { valor: c.trim(), texto: c.trim() };
    }
    if (c && typeof c === "object") {
      const restante =
        c.remaining !== undefined
          ? c.remaining
          : c.disponible !== undefined
            ? c.disponible
            : null;
      const limite =
        c.limit !== undefined
          ? c.limit
          : c.limite !== undefined
            ? c.limite
            : c.total !== undefined
              ? c.total
              : null;
      const usado =
        c.used !== undefined ? c.used : c.usado !== undefined ? c.usado : null;

      if (restante !== null && limite !== null) {
        return { valor: c, texto: `${restante} de ${limite}` };
      }
      if (usado !== null && limite !== null) {
        return { valor: c, texto: `${usado} / ${limite}` };
      }
      if (limite !== null) {
        return { valor: c, texto: String(limite) };
      }
      if (restante !== null) {
        return { valor: c, texto: String(restante) };
      }
    }
  }

  return { valor: null, texto: "" };
}

function normalizarUsuarioServidor(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  if (data.authenticated === false || data.loggedIn === false) {
    return null;
  }

  const u =
    data.user && typeof data.user === "object"
      ? data.user
      : data.usuario && typeof data.usuario === "object"
        ? data.usuario
        : data;

  const correo = normalizarCorreo(u.email || u.correo || "");
  const idCrudo = u.id !== undefined && u.id !== null
    ? u.id
    : u._id !== undefined && u._id !== null
      ? u._id
      : u.userId !== undefined && u.userId !== null
        ? u.userId
        : u.sub || correo;

  if (!idCrudo && !correo) {
    return null;
  }

  const nombreBase = limpiarTextoCuenta(
    u.name || u.nombre || u.fullName || u.displayName || ""
  );
  const nombre = nombreBase || (correo ? correo.split("@")[0] : "Usuario");
  const cuotaInfo = extraerCuotaTexto(data, u);

  return {
    id: String(idCrudo),
    nombre,
    correo,
    cuota: cuotaInfo.valor,
    cuotaTexto: cuotaInfo.texto,
    db: data.db === true
  };
}

async function solicitarAuth(ruta, opciones) {
  const metodo = (opciones && opciones.method) || "GET";
  const fetchOpts = {
    method: metodo,
    credentials: "include",
    headers: {
      Accept: "application/json"
    }
  };

  if (opciones && opciones.body !== undefined) {
    fetchOpts.headers["Content-Type"] = "application/json";
    fetchOpts.body = JSON.stringify(opciones.body);
  }

  let resp;
  const controlador = typeof AbortController === "function" ? new AbortController() : null;
  const temporizador = controlador ? window.setTimeout(() => controlador.abort(), 8000) : null;
  if (controlador) {
    fetchOpts.signal = controlador.signal;
  }
  try {
    resp = await window.fetch(`${API_AUTH_BASE}${ruta}`, fetchOpts);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      sinConexion: true,
      data: null,
      mensaje:
        "No se pudo conectar con el servicio de cuenta en este momento. Comprueba tu conexión o intenta de nuevo."
    };
  } finally {
    if (temporizador) {
      window.clearTimeout(temporizador);
    }
  }

  let data = null;
  try {
    const texto = await resp.text();
    data = texto ? JSON.parse(texto) : null;
  } catch (error) {
    data = null;
  }

  if (!resp.ok) {
    const mensajeServidor =
      (data && (data.error || data.message || data.mensaje)) || "";
    const esErrorServidor = resp.status >= 500;
    return {
      ok: false,
      status: resp.status,
      sinConexion: esErrorServidor,
      noAutenticado: resp.status === 401 || resp.status === 403,
      data,
      mensaje:
        mensajeServidor ||
        (esErrorServidor
          ? "El servicio de inicio de sesión no está disponible en este momento."
          : "No se pudo completar la solicitud.")
    };
  }

  return {
    ok: true,
    status: resp.status,
    sinConexion: false,
    noAutenticado: false,
    data,
    mensaje: ""
  };
}

(function inicializarModuloCuenta() {
  let sesionActual = null;
  let verificacionInicialCompleta = false;
  let ultimoErrorServicio = "";
  const escuchasCambio = [];

  function clonarSesion(sesion) {
    return sesion ? { ...sesion } : null;
  }

  function notificarCambioSesion(motivo) {
    const copia = clonarSesion(sesionActual);
    escuchasCambio.forEach((fn) => {
      try {
        fn(copia, motivo || "cambio");
      } catch (error) {
        // Evitar que un fallo detenga otros módulos.
      }
    });
  }

  async function verificarSesionDesdeServidor(motivo) {
    const res = await solicitarAuth("/me", { method: "GET" });

    if (res.sinConexion) {
      ultimoErrorServicio = res.mensaje;
      sesionActual = null;
      verificacionInicialCompleta = true;
      notificarCambioSesion(motivo || "error");
      return {
        ok: false,
        sinConexion: true,
        sesion: null,
        mensaje: res.mensaje
      };
    }

    ultimoErrorServicio = "";

    if (!res.ok) {
      sesionActual = null;
      verificacionInicialCompleta = true;
      notificarCambioSesion(motivo || "me");
      return {
        ok: true,
        sinConexion: false,
        sesion: null,
        mensaje: ""
      };
    }

    const usuario = normalizarUsuarioServidor(res.data);
    sesionActual = usuario;
    verificacionInicialCompleta = true;
    notificarCambioSesion(motivo || "me");
    return {
      ok: true,
      sinConexion: false,
      sesion: clonarSesion(sesionActual),
      mensaje: ""
    };
  }

  const promesaVerificacionInicial = verificarSesionDesdeServidor("me");

  const dmdCuenta = {
    apiAuthBase: API_AUTH_BASE,
    urlGoogleSso: URL_LOGIN_GOOGLE_SSO,

    obtenerSesionActual() {
      return clonarSesion(sesionActual);
    },

    obtenerClavePropietario() {
      return sesionActual ? sesionActual.id : "invitado";
    },

    estaVerificada() {
      return verificacionInicialCompleta;
    },

    obtenerUltimoErrorServicio() {
      return ultimoErrorServicio;
    },

    esperarSesion() {
      return promesaVerificacionInicial.then(() => clonarSesion(sesionActual));
    },

    verificarSesion() {
      return verificarSesionDesdeServidor("me");
    },

    alCambiarSesion(callback) {
      if (typeof callback === "function") {
        escuchasCambio.push(callback);
      }
    },

    async crearCuenta({ nombre, correo, password }) {
      const nombreLimpio = limpiarTextoCuenta(nombre);
      const correoLimpio = normalizarCorreo(correo);
      const clave = String(password || "");

      const res = await solicitarAuth("/register", {
        method: "POST",
        body: {
          name: nombreLimpio,
          email: correoLimpio,
          password: clave
        }
      });

      if (!res.ok) {
        return {
          ok: false,
          sinConexion: Boolean(res.sinConexion),
          campo: res.status === 409 ? "correo" : "",
          mensaje:
            res.status === 409 && !res.data
              ? "Ese correo ya tiene cuenta. Inicia sesión."
              : res.mensaje
        };
      }

      const verif = await verificarSesionDesdeServidor("registro");
      if (verif.sesion) {
        return { ok: true, sesion: verif.sesion };
      }

      const usuarioDirecto = normalizarUsuarioServidor(res.data);
      if (usuarioDirecto) {
        sesionActual = usuarioDirecto;
        ultimoErrorServicio = "";
        notificarCambioSesion("registro");
        return { ok: true, sesion: clonarSesion(sesionActual) };
      }

      return {
        ok: false,
        sinConexion: Boolean(verif.sinConexion),
        mensaje:
          verif.mensaje ||
          "La cuenta se registró, pero no se pudo confirmar la sesión con el servidor. Inicia sesión."
      };
    },

    async iniciarSesion({ correo, password }) {
      const correoLimpio = normalizarCorreo(correo);
      const clave = String(password || "");

      const res = await solicitarAuth("/login", {
        method: "POST",
        body: {
          email: correoLimpio,
          password: clave
        }
      });

      if (!res.ok) {
        return {
          ok: false,
          sinConexion: Boolean(res.sinConexion),
          mensaje:
            res.noAutenticado && !(res.data && (res.data.error || res.data.message || res.data.mensaje))
              ? "Correo o contraseña incorrectos."
              : res.mensaje
        };
      }

      const verif = await verificarSesionDesdeServidor("login");
      if (verif.sesion) {
        return { ok: true, sesion: verif.sesion };
      }

      const usuarioDirecto = normalizarUsuarioServidor(res.data);
      if (usuarioDirecto) {
        sesionActual = usuarioDirecto;
        ultimoErrorServicio = "";
        notificarCambioSesion("login");
        return { ok: true, sesion: clonarSesion(sesionActual) };
      }

      return {
        ok: false,
        sinConexion: Boolean(verif.sinConexion),
        mensaje:
          verif.mensaje ||
          "No se pudo confirmar la sesión con el servidor. Verifica que las cookies estén habilitadas."
      };
    },

    async cerrarSesion() {
      const res = await solicitarAuth("/logout", { method: "POST" });
      if (!res.ok && !res.noAutenticado) {
        return {
          ok: false,
          sinConexion: Boolean(res.sinConexion),
          mensaje: res.mensaje
        };
      }

      sesionActual = null;
      ultimoErrorServicio = "";
      notificarCambioSesion("logout");
      return { ok: true };
    }
  };

  window.dmdCuenta = dmdCuenta;

  function montarInterfazCuenta() {
    const seccion = document.getElementById("seccion-cuenta");
    if (!seccion) {
      return;
    }

    const cargandoEl = document.getElementById("cuenta-cargando");
    const errorServicioBox = document.getElementById("cuenta-error-servicio");
    const errorServicioMsg = document.getElementById("cuenta-error-servicio-msg");
    const btnReintentarAuth = document.getElementById("btn-reintentar-auth");

    const vistaInvitado = document.getElementById("cuenta-invitado");
    const vistaActiva = document.getElementById("cuenta-activa");
    const estadoCuenta = document.getElementById("estado-cuenta");

    const tabLogin = document.getElementById("tab-login");
    const tabRegistro = document.getElementById("tab-registro");
    const formLogin = document.getElementById("form-login");
    const formRegistro = document.getElementById("form-registro");

    const loginCorreo = document.getElementById("login-correo");
    const loginPassword = document.getElementById("login-password");
    const loginErrorGeneral = document.getElementById("error-login-general");
    const loginErrorCorreo = document.getElementById("error-login-correo");
    const loginErrorPassword = document.getElementById("error-login-password");
    const btnIniciarSesion = document.getElementById("btn-iniciar-sesion");

    const regNombre = document.getElementById("reg-nombre");
    const regCorreo = document.getElementById("reg-correo");
    const regPassword = document.getElementById("reg-password");
    const regErrorGeneral = document.getElementById("error-reg-general");
    const regErrorNombre = document.getElementById("error-reg-nombre");
    const regErrorCorreo = document.getElementById("error-reg-correo");
    const regErrorPassword = document.getElementById("error-reg-password");
    const btnCrearCuenta = document.getElementById("btn-crear-cuenta");

    const sesionNombreEl = document.getElementById("sesion-nombre");
    const sesionCorreoEl = document.getElementById("sesion-correo");
    const sesionCuotaEl = document.getElementById("sesion-cuota");
    const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

    let enviando = false;

    function fijarError(input, nodoError, mensaje) {
      if (nodoError) {
        nodoError.textContent = mensaje || "";
      }
      if (input) {
        if (mensaje) {
          input.classList.add("is-invalid");
          input.setAttribute("aria-invalid", "true");
        } else {
          input.classList.remove("is-invalid");
          input.removeAttribute("aria-invalid");
        }
      }
    }

    function limpiarErroresAuth() {
      fijarError(loginCorreo, loginErrorCorreo, "");
      fijarError(loginPassword, loginErrorPassword, "");
      loginErrorGeneral.textContent = "";
      loginErrorGeneral.hidden = true;

      fijarError(regNombre, regErrorNombre, "");
      fijarError(regCorreo, regErrorCorreo, "");
      fijarError(regPassword, regErrorPassword, "");
      regErrorGeneral.textContent = "";
      regErrorGeneral.hidden = true;
    }

    function cambiarPestana(modo) {
      limpiarErroresAuth();
      const esRegistro = modo === "registro";

      tabLogin.setAttribute("aria-selected", esRegistro ? "false" : "true");
      tabRegistro.setAttribute("aria-selected", esRegistro ? "true" : "false");
      tabLogin.classList.toggle("auth-tab-active", !esRegistro);
      tabRegistro.classList.toggle("auth-tab-active", esRegistro);

      formLogin.hidden = esRegistro;
      formRegistro.hidden = !esRegistro;
    }

    function actualizarVistaCuenta() {
      const verificada = dmdCuenta.estaVerificada();
      const sesion = dmdCuenta.obtenerSesionActual();
      const errorSrv = dmdCuenta.obtenerUltimoErrorServicio();

      if (cargandoEl) {
        cargandoEl.hidden = verificada;
      }

      if (errorServicioBox && errorServicioMsg) {
        if (verificada && !sesion && errorSrv) {
          errorServicioMsg.textContent = errorSrv;
          errorServicioBox.hidden = false;
        } else {
          errorServicioMsg.textContent = "";
          errorServicioBox.hidden = true;
        }
      }

      if (!verificada) {
        vistaInvitado.hidden = true;
        vistaActiva.hidden = true;
        return;
      }

      if (sesion) {
        vistaInvitado.hidden = true;
        vistaActiva.hidden = false;
        sesionNombreEl.textContent = sesion.nombre;
        sesionCorreoEl.textContent = sesion.correo;
        if (sesionCuotaEl) {
          if (sesion.cuotaTexto) {
            sesionCuotaEl.textContent = `Cuota disponible: ${sesion.cuotaTexto}`;
            sesionCuotaEl.hidden = false;
          } else {
            sesionCuotaEl.textContent = "";
            sesionCuotaEl.hidden = true;
          }
        }
      } else {
        vistaInvitado.hidden = false;
        vistaActiva.hidden = true;
      }
    }

    async function manejarRegistro(evento) {
      if (evento) {
        evento.preventDefault();
        evento.stopPropagation();
      }
      if (enviando) {
        return;
      }
      limpiarErroresAuth();
      estadoCuenta.textContent = "";

      const nombre = limpiarTextoCuenta(regNombre.value);
      const correo = normalizarCorreo(regCorreo.value);
      const password = regPassword.value;

      let primero = null;

      if (nombre.length < 2) {
        fijarError(regNombre, regErrorNombre, "Escribe tu nombre.");
        primero = primero || regNombre;
      }

      if (!esCorreoValido(correo)) {
        fijarError(regCorreo, regErrorCorreo, "Escribe un correo válido.");
        primero = primero || regCorreo;
      }

      if (password.length < 6) {
        fijarError(
          regPassword,
          regErrorPassword,
          "La contraseña debe tener al menos 6 caracteres."
        );
        primero = primero || regPassword;
      }

      if (primero) {
        primero.focus();
        return;
      }

      enviando = true;
      btnCrearCuenta.disabled = true;
      btnCrearCuenta.textContent = "Creando cuenta...";

      try {
        const resultado = await dmdCuenta.crearCuenta({ nombre, correo, password });
        if (!resultado.ok) {
          if (resultado.campo === "correo") {
            fijarError(regCorreo, regErrorCorreo, resultado.mensaje);
            regCorreo.focus();
          } else {
            regErrorGeneral.textContent = resultado.mensaje;
            regErrorGeneral.hidden = false;
          }
          return;
        }

        formRegistro.reset();
        estadoCuenta.textContent = `Sesión iniciada: ${resultado.sesion.nombre}.`;
        actualizarVistaCuenta();
      } finally {
        enviando = false;
        btnCrearCuenta.disabled = false;
        btnCrearCuenta.textContent = "Crear cuenta";
      }
    }

    async function manejarLogin(evento) {
      if (evento) {
        evento.preventDefault();
        evento.stopPropagation();
      }
      if (enviando) {
        return;
      }
      limpiarErroresAuth();
      estadoCuenta.textContent = "";

      const correo = normalizarCorreo(loginCorreo.value);
      const password = loginPassword.value;

      let primero = null;

      if (!esCorreoValido(correo)) {
        fijarError(loginCorreo, loginErrorCorreo, "Escribe tu correo.");
        primero = primero || loginCorreo;
      }

      if (password.length === 0) {
        fijarError(loginPassword, loginErrorPassword, "Escribe tu contraseña.");
        primero = primero || loginPassword;
      }

      if (primero) {
        primero.focus();
        return;
      }

      enviando = true;
      btnIniciarSesion.disabled = true;
      btnIniciarSesion.textContent = "Iniciando sesión...";

      try {
        const resultado = await dmdCuenta.iniciarSesion({ correo, password });
        if (!resultado.ok) {
          loginErrorGeneral.textContent = resultado.mensaje;
          loginErrorGeneral.hidden = false;
          loginPassword.focus();
          return;
        }

        formLogin.reset();
        estadoCuenta.textContent = `Hola, ${resultado.sesion.nombre}.`;
        actualizarVistaCuenta();
      } finally {
        enviando = false;
        btnIniciarSesion.disabled = false;
        btnIniciarSesion.textContent = "Iniciar sesión";
      }
    }

    tabLogin.addEventListener("click", () => cambiarPestana("login"));
    tabRegistro.addEventListener("click", () => cambiarPestana("registro"));

    btnCrearCuenta.addEventListener("click", manejarRegistro);
    formRegistro.addEventListener("submit", manejarRegistro);
    [regNombre, regCorreo, regPassword].forEach((campo) => {
      campo.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          manejarRegistro(e);
        }
      });
    });

    btnIniciarSesion.addEventListener("click", manejarLogin);
    formLogin.addEventListener("submit", manejarLogin);
    [loginCorreo, loginPassword].forEach((campo) => {
      campo.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          manejarLogin(e);
        }
      });
    });

    regNombre.addEventListener("input", () => fijarError(regNombre, regErrorNombre, ""));
    regCorreo.addEventListener("input", () => fijarError(regCorreo, regErrorCorreo, ""));
    regPassword.addEventListener("input", () => fijarError(regPassword, regErrorPassword, ""));
    loginCorreo.addEventListener("input", () => fijarError(loginCorreo, loginErrorCorreo, ""));
    loginPassword.addEventListener("input", () => fijarError(loginPassword, loginErrorPassword, ""));

    btnCerrarSesion.addEventListener("click", async () => {
      if (enviando) {
        return;
      }
      enviando = true;
      btnCerrarSesion.disabled = true;
      btnCerrarSesion.textContent = "Cerrando...";
      estadoCuenta.textContent = "";

      try {
        const res = await dmdCuenta.cerrarSesion();
        if (!res.ok) {
          estadoCuenta.textContent = res.mensaje;
          return;
        }
        estadoCuenta.textContent = "Sesión cerrada.";
        cambiarPestana("login");
        actualizarVistaCuenta();
      } finally {
        enviando = false;
        btnCerrarSesion.disabled = false;
        btnCerrarSesion.textContent = "Cerrar sesión";
      }
    });

    if (btnReintentarAuth) {
      btnReintentarAuth.addEventListener("click", async () => {
        btnReintentarAuth.disabled = true;
        btnReintentarAuth.textContent = "Verificando...";
        estadoCuenta.textContent = "Consultando servicio de cuenta...";
        await dmdCuenta.verificarSesion();
        estadoCuenta.textContent = "";
        btnReintentarAuth.disabled = false;
        btnReintentarAuth.textContent = "Reintentar conexión";
        actualizarVistaCuenta();
      });
    }

    // Mostrar u ocultar contraseña
    const togglesPassword = Array.from(document.querySelectorAll("[data-toggle-password]"));
    togglesPassword.forEach((btnToggle) => {
      const targetId = btnToggle.getAttribute("data-toggle-password");
      const campo = targetId ? document.getElementById(targetId) : null;
      if (!campo) {
        return;
      }
      btnToggle.addEventListener("click", () => {
        const visible = campo.type === "text";
        campo.type = visible ? "password" : "text";
        btnToggle.textContent = visible ? "Mostrar" : "Ocultar";
        btnToggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
        btnToggle.setAttribute("aria-pressed", visible ? "false" : "true");
        campo.focus();
      });
    });

    // Recuperar contraseña
    const btnAbrirRecuperar = document.getElementById("btn-abrir-recuperar");
    const bloqueRecuperar = document.getElementById("bloque-recuperar-password");
    const btnCerrarRecuperar = document.getElementById("btn-cerrar-recuperar");
    if (btnAbrirRecuperar && bloqueRecuperar) {
      btnAbrirRecuperar.addEventListener("click", () => {
        const abierto = !bloqueRecuperar.hidden;
        bloqueRecuperar.hidden = abierto;
        btnAbrirRecuperar.setAttribute("aria-expanded", abierto ? "false" : "true");
      });
    }
    if (btnCerrarRecuperar && bloqueRecuperar && btnAbrirRecuperar) {
      btnCerrarRecuperar.addEventListener("click", () => {
        bloqueRecuperar.hidden = true;
        btnAbrirRecuperar.setAttribute("aria-expanded", "false");
        btnAbrirRecuperar.focus();
      });
    }

    // Abrir pestaña de registro si viene ?modo=registro y conservar ?plan=
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("modo") === "registro") {
        cambiarPestana("registro");
      }
      const planParam = params.get("plan");
      const btnIrPlanes = document.getElementById("btn-ir-planes");
      if (planParam && btnIrPlanes) {
        btnIrPlanes.href = `pago.html?plan=${encodeURIComponent(planParam)}`;
        btnIrPlanes.textContent = "Continuar con tu plan";
      }
    } catch (error) {
      // Ignorar si URLSearchParams no está disponible
    }

    dmdCuenta.alCambiarSesion(actualizarVistaCuenta);
    actualizarVistaCuenta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montarInterfazCuenta);
  } else {
    montarInterfazCuenta();
  }
})();
