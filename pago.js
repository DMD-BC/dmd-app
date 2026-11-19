"use strict";

/* ==========================================================================
   dmd - Vista real de suscripción y pago (pago.html)
   Conectado a los endpoints reales de Mercado Pago de DMD:
   - Base: https://crear.dmdmx.dev/api/mp (siempre con credentials: "include")
   - GET  /api/mp/subscription -> consulta la suscripción real del usuario
   - POST /api/mp/subscribe    -> crea la suscripción ({ plan }) y redirige a init_point
   - POST /api/mp/cancel       -> cancela la suscripción real del usuario

   Seguridad:
   - Nunca pide ni guarda números de tarjeta, vencimientos ni CVC en el navegador.
   - La autorización del cobro ocurre únicamente en la página de Mercado Pago.

   BLOQUEO CONOCIDO (PENDIENTE EN OTRO REPOSITORIO):
   - En DMD-BC/dmd-paginas-web-ia (api/mp.js), el parámetro back_url está fijo
     a "https://crear.dmdmx.dev/app.html?sub=ok". Por ello, al terminar de
     autorizar el pago en Mercado Pago, el usuario regresará a crear.dmdmx.dev
     y no a dmd.dmdmx.dev. Resolver esto requiere modificar api/mp.js en ese
     otro repositorio para aceptar el origen de retorno https://dmd.dmdmx.dev.
   ========================================================================== */

const API_MP_BASE = "https://crear.dmdmx.dev/api/mp";

// Planes reales definidos en DMD-BC/dmd-paginas-web-ia (api/_mp.js).
const PLANES_DMD = [
  {
    id: "pro",
    nombre: "Plan Emprendedor Pro - DMD",
    precioMxn: 79,
    periodicidad: "al mes"
  },
  {
    id: "pyme",
    nombre: "Plan Crecimiento PyME - DMD",
    precioMxn: 189,
    periodicidad: "al mes"
  },
  {
    id: "elite",
    nombre: "Plan Corporativo Elite - DMD",
    precioMxn: 299,
    periodicidad: "al mes"
  }
];

(function inicializarVistaPago() {
  const GIROS_ETIQUETAS = {
    tienda: "Tienda",
    comida: "Comida",
    servicios: "Servicios",
    "salud y belleza": "Salud y belleza",
    "taller u oficio": "Taller u oficio",
    otro: "Otro"
  };

  const ESTADOS_SUSCRIPCION = {
    authorized: "Activa",
    active: "Activa",
    pending: "Pendiente",
    paused: "Pausada",
    cancelled: "Cancelada",
    canceled: "Cancelada"
  };

  let suscripcionActual = null;
  let consultandoSuscripcion = false;
  let procesandoAccion = false;

  function obtenerPlanPorId(planId) {
    const clave = String(planId || "").trim().toLowerCase();
    return PLANES_DMD.find((p) => p.id === clave) || null;
  }

  function formatearEstadoSuscripcion(status) {
    const clave = String(status || "").trim().toLowerCase();
    return ESTADOS_SUSCRIPCION[clave] || (status ? String(status) : "Sin estado");
  }

  function esEstadoCancelado(status) {
    const clave = String(status || "").trim().toLowerCase();
    return clave === "cancelled" || clave === "canceled";
  }

  function formatearFecha(valor) {
    if (!valor) {
      return "";
    }
    const texto = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
      return texto.slice(0, 10);
    }
    return texto;
  }

  function normalizarSuscripcion(data) {
    if (!data || typeof data !== "object") {
      return null;
    }
    const sub =
      data.subscription && typeof data.subscription === "object"
        ? data.subscription
        : data.suscripcion && typeof data.suscripcion === "object"
          ? data.suscripcion
          : data;

    const planId = String(sub.plan || sub.plan_id || sub.planId || "").trim().toLowerCase();
    const status = String(sub.status || sub.estado || "").trim().toLowerCase();
    if (!planId && !status) {
      return null;
    }

    const planDef = obtenerPlanPorId(planId);
    const montoCrudo =
      sub.amount !== undefined
        ? sub.amount
        : sub.price !== undefined
          ? sub.price
          : sub.precio !== undefined
            ? sub.precio
            : sub.transaction_amount !== undefined
              ? sub.transaction_amount
              : planDef
                ? planDef.precioMxn
                : null;
    const monto = Number(montoCrudo);

    const fecha = formatearFecha(
      sub.created_at || sub.createdAt || sub.date_created || sub.creado || sub.created || ""
    );

    return {
      plan: planId,
      nombrePlan: planDef ? planDef.nombre : planId || "Plan DMD",
      montoMxn: Number.isFinite(monto) && monto > 0 ? monto : planDef ? planDef.precioMxn : null,
      status: status || "pending",
      creado: fecha
    };
  }

  async function solicitarMp(ruta, opciones) {
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
    try {
      resp = await window.fetch(`${API_MP_BASE}${ruta}`, fetchOpts);
    } catch (error) {
      return {
        ok: false,
        status: 0,
        sinConexion: true,
        noAutenticado: false,
        data: null,
        mensaje:
          "No se pudo conectar con el servicio de suscripciones (crear.dmdmx.dev). Intenta de nuevo."
      };
    }

    let data = null;
    try {
      const texto = await resp.text();
      data = texto ? JSON.parse(texto) : null;
    } catch (error) {
      data = null;
    }

    if (!resp.ok) {
      const msgServidor =
        (data && (data.error || data.message || data.mensaje)) || "";
      return {
        ok: false,
        status: resp.status,
        sinConexion: resp.status >= 500,
        noAutenticado: resp.status === 401 || resp.status === 403,
        data,
        mensaje:
          msgServidor ||
          (resp.status === 401
            ? "Inicia sesión primero para continuar con tu suscripción."
            : "No se pudo completar la solicitud con Mercado Pago.")
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

  function leerBorradores() {
    if (window.dmdAlmacen && typeof window.dmdAlmacen.leer === "function") {
      const lista = window.dmdAlmacen.leer("dmd_borradores_v1", []);
      return Array.isArray(lista) ? lista : [];
    }
    return [];
  }

  function obtenerBorradorSeleccionado() {
    const borradores = leerBorradores();
    const propietario =
      window.dmdCuenta && typeof window.dmdCuenta.obtenerClavePropietario === "function"
        ? window.dmdCuenta.obtenerClavePropietario()
        : "invitado";

    let idBuscado = "";
    try {
      const params = new URLSearchParams(window.location.search);
      idBuscado = params.get("borrador") || "";
    } catch (error) {
      idBuscado = "";
    }

    if (idBuscado) {
      const exacto = borradores.find((b) => b && b.id === idBuscado);
      if (exacto) {
        return exacto;
      }
    }

    if (window.dmdAlmacen && typeof window.dmdAlmacen.leer === "function") {
      const activo = window.dmdAlmacen.leer("dmd_borrador_activo_v1", null);
      if (activo && activo.id) {
        const hallado = borradores.find(
          (b) => b && b.id === activo.id && b.cuentaId === propietario
        );
        if (hallado) {
          return hallado;
        }
      }
    }

    return borradores.find((b) => b && b.cuentaId === propietario) || null;
  }

  function renderizarResumenBorrador() {
    const tarjetaResumen = document.getElementById("pago-resumen-borrador");
    const nombreEl = document.getElementById("titulo-resumen-pagina");
    const metaEl = document.getElementById("pago-meta-borrador");
    const estadoEl = document.getElementById("pago-estado-borrador");

    const borrador = obtenerBorradorSeleccionado();
    if (!tarjetaResumen || !nombreEl || !metaEl || !estadoEl) {
      return;
    }

    if (borrador && borrador.datos) {
      tarjetaResumen.hidden = false;
      nombreEl.textContent = borrador.datos.nombre;
      const giro = GIROS_ETIQUETAS[borrador.datos.giro] || borrador.datos.giro;
      metaEl.textContent = `${giro} · ${borrador.datos.ciudad}`;
      estadoEl.textContent = borrador.publicadaSlug ? "Publicada" : "Borrador";
    } else {
      tarjetaResumen.hidden = true;
    }
  }

  function mostrarErrorGeneral(mensaje) {
    const caja = document.getElementById("pago-error-general");
    if (!caja) {
      return;
    }
    if (mensaje) {
      caja.textContent = mensaje;
      caja.hidden = false;
    } else {
      caja.textContent = "";
      caja.hidden = true;
    }
  }

  function mostrarEstadoPago(mensaje) {
    const el = document.getElementById("estado-pago");
    if (el) {
      el.textContent = mensaje || "";
    }
  }

  function obtenerSesion() {
    if (window.dmdCuenta && typeof window.dmdCuenta.obtenerSesionActual === "function") {
      return window.dmdCuenta.obtenerSesionActual();
    }
    return null;
  }

  function mostrarBloqueRequiereSesion(mensajePersonalizado) {
    const cargandoEl = document.getElementById("pago-cargando-sesion");
    const reqCard = document.getElementById("pago-requiere-sesion");
    const reqMsg = document.getElementById("pago-requiere-sesion-msg");
    const subCard = document.getElementById("pago-suscripcion-card");

    if (cargandoEl) {
      cargandoEl.hidden = true;
    }
    if (subCard) {
      subCard.hidden = true;
    }
    if (reqCard) {
      reqCard.hidden = false;
    }
    if (reqMsg && mensajePersonalizado) {
      reqMsg.textContent = mensajePersonalizado;
    }
  }

  function renderizarTarjetaSuscripcion(estadoConsulta) {
    const subCard = document.getElementById("pago-suscripcion-card");
    const tituloEl = document.getElementById("titulo-suscripcion");
    const badgeEl = document.getElementById("pago-suscripcion-badge");
    const detalleEl = document.getElementById("pago-suscripcion-detalle");
    const fechaEl = document.getElementById("pago-suscripcion-fecha");
    const accionesEl = document.getElementById("pago-suscripcion-acciones");
    const confirmBox = document.getElementById("confirmar-cancelar-suscripcion");

    if (!subCard) {
      return;
    }

    subCard.hidden = false;
    if (confirmBox) {
      confirmBox.hidden = true;
    }

    if (consultandoSuscripcion) {
      tituloEl.textContent = "Consultando suscripción...";
      badgeEl.hidden = true;
      detalleEl.textContent = "";
      fechaEl.hidden = true;
      accionesEl.hidden = true;
      return;
    }

    if (estadoConsulta && estadoConsulta.error) {
      tituloEl.textContent = "No se pudo consultar tu suscripción";
      badgeEl.hidden = true;
      detalleEl.textContent = estadoConsulta.error;
      fechaEl.hidden = true;
      accionesEl.hidden = true;
      return;
    }

    if (!suscripcionActual) {
      tituloEl.textContent = "Sin suscripción activa";
      badgeEl.textContent = "Sin plan";
      badgeEl.hidden = false;
      detalleEl.textContent = "Elige uno de los planes de abajo para activar tu suscripción con Mercado Pago.";
      fechaEl.hidden = true;
      accionesEl.hidden = true;
      return;
    }

    tituloEl.textContent = suscripcionActual.nombrePlan;
    badgeEl.textContent = formatearEstadoSuscripcion(suscripcionActual.status);
    badgeEl.hidden = false;

    const montoTxt = suscripcionActual.montoMxn
      ? `$${suscripcionActual.montoMxn} MXN al mes`
      : "";
    detalleEl.textContent = montoTxt
      ? `Plan ${suscripcionActual.plan} · ${montoTxt}`
      : `Plan ${suscripcionActual.plan}`;

    if (suscripcionActual.creado) {
      fechaEl.textContent = `Creada: ${suscripcionActual.creado}`;
      fechaEl.hidden = false;
    } else {
      fechaEl.hidden = true;
    }

    accionesEl.hidden = esEstadoCancelado(suscripcionActual.status);
  }

  function renderizarPlanes() {
    const contenedor = document.getElementById("lista-planes-pago");
    if (!contenedor) {
      return;
    }
    contenedor.textContent = "";

    const sesion = obtenerSesion();

    PLANES_DMD.forEach((plan) => {
      const card = document.createElement("article");
      card.className = "plan-card";
      card.dataset.planId = plan.id;

      const esActual =
        suscripcionActual &&
        suscripcionActual.plan === plan.id &&
        !esEstadoCancelado(suscripcionActual.status);

      const head = document.createElement("div");
      head.className = "plan-card-head";

      const nombre = document.createElement("h3");
      nombre.className = "plan-card-title";
      nombre.textContent = plan.nombre;
      head.appendChild(nombre);

      if (esActual) {
        const badge = document.createElement("span");
        badge.className = "status-pill";
        badge.textContent = formatearEstadoSuscripcion(suscripcionActual.status);
        head.appendChild(badge);
      }

      const precio = document.createElement("p");
      precio.className = "plan-card-price";
      precio.textContent = `$${plan.precioMxn} MXN`;

      const periodo = document.createElement("span");
      periodo.className = "plan-card-period";
      periodo.textContent = ` ${plan.periodicidad}`;
      precio.appendChild(periodo);

      card.appendChild(head);
      card.appendChild(precio);

      if (sesion) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-primary btn-full";
        btn.dataset.planSubscribe = plan.id;
        btn.disabled = procesandoAccion;
        btn.textContent = "Suscribirme con Mercado Pago";
        btn.addEventListener("click", () => iniciarSuscripcion(plan));
        card.appendChild(btn);
      } else {
        const enlaceLogin = document.createElement("a");
        enlaceLogin.className = "btn btn-secondary btn-full";
        enlaceLogin.href = "login.html";
        enlaceLogin.textContent = "Inicia sesión para suscribirte";
        card.appendChild(enlaceLogin);
      }

      contenedor.appendChild(card);
    });
  }

  async function cargarSuscripcionReal() {
    const sesion = obtenerSesion();
    if (!sesion) {
      suscripcionActual = null;
      return;
    }

    consultandoSuscripcion = true;
    mostrarErrorGeneral("");
    renderizarTarjetaSuscripcion(null);

    const res = await solicitarMp("/subscription", { method: "GET" });
    consultandoSuscripcion = false;

    if (res.noAutenticado) {
      suscripcionActual = null;
      mostrarBloqueRequiereSesion("Tu sesión no está activa. Inicia sesión para consultar o activar un plan.");
      renderizarPlanes();
      return;
    }

    if (!res.ok) {
      if (res.status === 404) {
        suscripcionActual = null;
        renderizarTarjetaSuscripcion(null);
        renderizarPlanes();
        return;
      }
      suscripcionActual = null;
      mostrarErrorGeneral(res.mensaje);
      renderizarTarjetaSuscripcion({ error: res.mensaje });
      renderizarPlanes();
      return;
    }

    suscripcionActual = normalizarSuscripcion(res.data);
    renderizarTarjetaSuscripcion(null);
    renderizarPlanes();
  }

  async function iniciarSuscripcion(plan) {
    if (procesandoAccion) {
      return;
    }
    const sesion = obtenerSesion();
    if (!sesion) {
      mostrarBloqueRequiereSesion("Inicia sesión primero para suscribirte a un plan.");
      renderizarPlanes();
      return;
    }

    procesandoAccion = true;
    mostrarErrorGeneral("");
    mostrarEstadoPago(`Conectando ${plan.nombre} con Mercado Pago...`);
    renderizarPlanes();

    try {
      const res = await solicitarMp("/subscribe", {
        method: "POST",
        body: { plan: plan.id }
      });

      if (res.noAutenticado) {
        mostrarEstadoPago("");
        mostrarBloqueRequiereSesion("Tu sesión expiró. Inicia sesión primero para suscribirte.");
        if (window.dmdCuenta && typeof window.dmdCuenta.verificarSesion === "function") {
          window.dmdCuenta.verificarSesion();
        }
        return;
      }

      if (!res.ok) {
        mostrarEstadoPago("");
        mostrarErrorGeneral(res.mensaje);
        return;
      }

      const initPoint =
        res.data &&
        (res.data.init_point || res.data.initPoint || res.data.url || "");

      if (typeof initPoint === "string" && /^https:\/\//i.test(initPoint.trim())) {
        mostrarEstadoPago("Redirigiendo a Mercado Pago...");
        window.location.assign(initPoint.trim());
        return;
      }

      mostrarEstadoPago("");
      mostrarErrorGeneral(
        "El servidor no devolvió un enlace válido de Mercado Pago (init_point)."
      );
    } finally {
      procesandoAccion = false;
      renderizarPlanes();
    }
  }

  async function cancelarSuscripcionReal() {
    if (procesandoAccion) {
      return;
    }
    const btnConfirmar = document.getElementById("btn-confirmar-cancelar-sub");
    const confirmBox = document.getElementById("confirmar-cancelar-suscripcion");

    procesandoAccion = true;
    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = "Cancelando...";
    }
    mostrarErrorGeneral("");
    mostrarEstadoPago("Cancelando suscripción...");

    try {
      const res = await solicitarMp("/cancel", { method: "POST" });

      if (res.noAutenticado) {
        mostrarEstadoPago("");
        mostrarBloqueRequiereSesion("Tu sesión expiró. Inicia sesión para gestionar tu suscripción.");
        return;
      }

      if (!res.ok) {
        mostrarEstadoPago("");
        mostrarErrorGeneral(res.mensaje);
        return;
      }

      if (confirmBox) {
        confirmBox.hidden = true;
      }
      mostrarEstadoPago("Suscripción cancelada.");
      await cargarSuscripcionReal();
    } finally {
      procesandoAccion = false;
      if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = "Sí, cancelar";
      }
      renderizarPlanes();
    }
  }

  async function sincronizarVistaPago() {
    renderizarResumenBorrador();

    const cargandoEl = document.getElementById("pago-cargando-sesion");
    const reqCard = document.getElementById("pago-requiere-sesion");
    const subCard = document.getElementById("pago-suscripcion-card");

    const verificada =
      window.dmdCuenta && typeof window.dmdCuenta.estaVerificada === "function"
        ? window.dmdCuenta.estaVerificada()
        : true;

    if (!verificada) {
      if (cargandoEl) {
        cargandoEl.hidden = false;
      }
      if (reqCard) {
        reqCard.hidden = true;
      }
      if (subCard) {
        subCard.hidden = true;
      }
      renderizarPlanes();
      return;
    }

    if (cargandoEl) {
      cargandoEl.hidden = true;
    }

    const sesion = obtenerSesion();
    const errorAuth =
      window.dmdCuenta && typeof window.dmdCuenta.obtenerUltimoErrorServicio === "function"
        ? window.dmdCuenta.obtenerUltimoErrorServicio()
        : "";

    if (!sesion) {
      suscripcionActual = null;
      mostrarErrorGeneral(errorAuth || "");
      mostrarBloqueRequiereSesion(
        errorAuth
          ? "No se pudo verificar tu sesión con login.dmdmx.dev. Inicia sesión cuando el servicio responda."
          : "Necesitas iniciar sesión con tu cuenta de DMD para consultar tu suscripción o activar un plan."
      );
      renderizarPlanes();
      return;
    }

    if (reqCard) {
      reqCard.hidden = true;
    }
    renderizarPlanes();
    await cargarSuscripcionReal();
  }

  window.dmdPago = {
    apiMpBase: API_MP_BASE,
    planes: PLANES_DMD.slice(),
    recargarSuscripcion: cargarSuscripcionReal
  };

  function montar() {
    const btnPedirCancelar = document.getElementById("btn-cancelar-suscripcion");
    const confirmBox = document.getElementById("confirmar-cancelar-suscripcion");
    const btnConfirmarCancelar = document.getElementById("btn-confirmar-cancelar-sub");
    const btnMantener = document.getElementById("btn-mantener-sub");

    if (btnPedirCancelar && confirmBox) {
      btnPedirCancelar.addEventListener("click", () => {
        confirmBox.hidden = false;
        if (btnConfirmarCancelar) {
          btnConfirmarCancelar.focus();
        }
      });
    }

    if (btnMantener && confirmBox) {
      btnMantener.addEventListener("click", () => {
        confirmBox.hidden = true;
        if (btnPedirCancelar) {
          btnPedirCancelar.focus();
        }
      });
    }

    if (btnConfirmarCancelar) {
      btnConfirmarCancelar.addEventListener("click", cancelarSuscripcionReal);
    }

    if (window.dmdAlmacen && typeof window.dmdAlmacen.alHidratar === "function") {
      window.dmdAlmacen.alHidratar(renderizarResumenBorrador);
    }

    if (window.dmdCuenta && typeof window.dmdCuenta.alCambiarSesion === "function") {
      window.dmdCuenta.alCambiarSesion(() => {
        sincronizarVistaPago();
      });
    }

    sincronizarVistaPago();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montar);
  } else {
    montar();
  }
})();
