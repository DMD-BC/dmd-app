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
   ========================================================================== */

const API_MP_BASE = "https://crear.dmdmx.dev/api/mp";

// Planes reales con los precios vigentes ($79, $189 y $299 MXN al mes) y funciones existentes en dmd.
const PLANES_DMD = [
  {
    id: "pro",
    nombre: "Básico",
    subtitulo: "Ideal para publicar tu primera página web y recibir mensajes.",
    precioMxn: 79,
    periodicidad: "al mes",
    recomendado: false,
    incluye: [
      "Creación guiada desde el chat y edición manual de textos",
      "Las 3 plantillas profesionales (Clásica, Editorial y Directa)",
      "Foto de portada según tu giro o subida de tu logo e imagen",
      "Botón y formulario conectados directo a tu WhatsApp",
      "Publicación con enlace compartible para celular y escritorio"
    ]
  },
  {
    id: "pyme",
    nombre: "Emprendedor",
    subtitulo: "Para negocios que quieren cuidar su SEO y medir resultados.",
    precioMxn: 189,
    periodicidad: "al mes",
    recomendado: true,
    incluye: [
      "Todo lo incluido en el plan Básico",
      "Configuración de SEO (título, descripción, palabras clave y vista en buscador)",
      "Historial de versiones con restauración confirmada y respaldo (.json)",
      "Panel de actividad con visitas, clics en WhatsApp y consultas",
      "Campos listos para tu ID de analítica y tu ID de píxel"
    ]
  },
  {
    id: "elite",
    nombre: "Negocio",
    subtitulo: "Para marcas con varias líneas, sucursales o dominio propio.",
    precioMxn: 299,
    periodicidad: "al mes",
    recomendado: false,
    incluye: [
      "Todo lo incluido en el plan Emprendedor",
      "Gestión de múltiples borradores, páginas duplicadas y conversaciones",
      "Configuración de subdominio en dmd y opción de dominio propio",
      "Edición continua con vista previa real a 360 px y escritorio",
      "Respaldo completo y control de cambios desde un solo lugar"
    ]
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
  let planSeleccionadoId = "pyme";

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
      nombrePlan: planDef ? `Plan ${planDef.nombre}` : planId || "Plan dmd",
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

    const controlador = typeof AbortController === "function" ? new AbortController() : null;
    const temporizador = controlador ? window.setTimeout(() => controlador.abort(), 10000) : null;
    if (controlador) {
      fetchOpts.signal = controlador.signal;
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
          "No se pudo conectar con el servicio de suscripciones en este momento. Intenta de nuevo."
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
      const giro = borrador.datos.giroTexto || GIROS_ETIQUETAS[borrador.datos.giro] || borrador.datos.giro;
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

  function crearIconoCheckPlan() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "plan-check-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.4");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M20 6 9 17l-5-5");
    svg.appendChild(path);
    return svg;
  }

  function renderizarPasosCheckout() {
    const plan = obtenerPlanPorId(planSeleccionadoId) || PLANES_DMD[1];
    const sesion = obtenerSesion();

    const nombreEl = document.getElementById("checkout-plan-nombre");
    const precioEl = document.getElementById("checkout-plan-precio");
    const paso1Desc = document.getElementById("checkout-paso1-desc");
    const paso2Item = document.getElementById("checkout-paso2-item");
    const paso2Desc = document.getElementById("checkout-paso2-desc");
    const authActions = document.getElementById("checkout-auth-actions");
    const btnLogin = document.getElementById("btn-pago-ir-login");
    const paso3Desc = document.getElementById("checkout-paso3-desc");
    const btnMp = document.getElementById("btn-continuar-mp");

    if (nombreEl) {
      nombreEl.textContent = plan.nombre;
    }
    if (precioEl) {
      precioEl.textContent = `$${plan.precioMxn} MXN ${plan.periodicidad}`;
    }
    if (paso1Desc) {
      paso1Desc.textContent = `Elegiste el plan ${plan.nombre} ($${plan.precioMxn} MXN ${plan.periodicidad}). Puedes cambiarlo arriba en cualquier momento.`;
    }
    if (btnLogin) {
      btnLogin.href = `login.html?plan=${encodeURIComponent(plan.id)}`;
    }

    if (sesion) {
      if (paso2Item) {
        paso2Item.classList.add("is-done");
      }
      if (paso2Desc) {
        paso2Desc.textContent = `Sesión confirmada como ${sesion.nombre} (${sesion.correo}).`;
      }
      if (authActions) {
        authActions.hidden = true;
      }
      if (paso3Desc) {
        paso3Desc.textContent = `Haz clic abajo para autorizar tu plan ${plan.nombre} ($${plan.precioMxn} MXN al mes) directamente en Mercado Pago.`;
      }
      if (btnMp) {
        btnMp.disabled = procesandoAccion;
        btnMp.textContent = procesandoAccion
          ? "Conectando con Mercado Pago..."
          : `Pagar plan ${plan.nombre} en Mercado Pago`;
      }
    } else {
      if (paso2Item) {
        paso2Item.classList.remove("is-done");
      }
      if (paso2Desc) {
        paso2Desc.textContent = "Inicia sesión o crea tu cuenta para asociar tu suscripción antes de pasar a Mercado Pago.";
      }
      if (authActions) {
        authActions.hidden = false;
      }
      if (paso3Desc) {
        paso3Desc.textContent = "Cuando inicies sesión, este botón te llevará directo a la pasarela segura de Mercado Pago.";
      }
      if (btnMp) {
        btnMp.disabled = false;
        btnMp.textContent = `Continuar con plan ${plan.nombre}`;
      }
    }
  }

  function seleccionarPlan(planId, desplazar) {
    const plan = obtenerPlanPorId(planId);
    if (!plan) {
      return;
    }
    planSeleccionadoId = plan.id;
    renderizarPlanes();
    renderizarPasosCheckout();
    mostrarEstadoPago(`Plan ${plan.nombre} seleccionado ($${plan.precioMxn} MXN al mes).`);

    if (desplazar) {
      const seccionPasos = document.getElementById("pago-checkout-pasos");
      if (seccionPasos && typeof seccionPasos.scrollIntoView === "function") {
        seccionPasos.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
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
      ? `${suscripcionActual.nombrePlan} · ${montoTxt}`
      : suscripcionActual.nombrePlan;

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

    PLANES_DMD.forEach((plan) => {
      const esActual =
        suscripcionActual &&
        suscripcionActual.plan === plan.id &&
        !esEstadoCancelado(suscripcionActual.status);
      const esSeleccionado = planSeleccionadoId === plan.id;

      const card = document.createElement("article");
      card.className = "plan-card";
      if (plan.recomendado) {
        card.classList.add("plan-card-recommended");
      }
      if (esSeleccionado) {
        card.classList.add("plan-card-selected");
      }
      card.dataset.planId = plan.id;

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
      } else if (plan.recomendado) {
        const badgeRec = document.createElement("span");
        badgeRec.className = "plan-badge-recommended";
        badgeRec.textContent = "Recomendado";
        head.appendChild(badgeRec);
      }

      const desc = document.createElement("p");
      desc.className = "plan-card-desc";
      desc.textContent = plan.subtitulo;

      const precio = document.createElement("p");
      precio.className = "plan-card-price";
      precio.textContent = `$${plan.precioMxn} MXN`;

      const periodo = document.createElement("span");
      periodo.className = "plan-card-period";
      periodo.textContent = ` ${plan.periodicidad}`;
      precio.appendChild(periodo);

      const ul = document.createElement("ul");
      ul.className = "plan-features-list";
      plan.incluye.forEach((itemTxt) => {
        const li = document.createElement("li");
        li.className = "plan-feature-item";
        li.appendChild(crearIconoCheckPlan());
        const sp = document.createElement("span");
        sp.textContent = itemTxt;
        li.appendChild(sp);
        ul.appendChild(li);
      });

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        plan.recomendado || esSeleccionado
          ? "btn btn-primary btn-full plan-select-btn"
          : "btn btn-secondary btn-full plan-select-btn";
      btn.dataset.planSelect = plan.id;
      btn.setAttribute("aria-pressed", esSeleccionado ? "true" : "false");
      btn.disabled = procesandoAccion;
      if (esActual) {
        btn.textContent = "Plan actual";
      } else if (esSeleccionado) {
        btn.textContent = `Plan ${plan.nombre} elegido`;
      } else {
        btn.textContent = `Elegir plan ${plan.nombre}`;
      }
      btn.addEventListener("click", () => seleccionarPlan(plan.id, true));

      card.appendChild(head);
      card.appendChild(desc);
      card.appendChild(precio);
      card.appendChild(ul);
      card.appendChild(btn);
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
      const subCard = document.getElementById("pago-suscripcion-card");
      if (subCard) {
        subCard.hidden = true;
      }
      renderizarPlanes();
      renderizarPasosCheckout();
      return;
    }

    if (!res.ok) {
      if (res.status === 404) {
        suscripcionActual = null;
        renderizarTarjetaSuscripcion(null);
        renderizarPlanes();
        renderizarPasosCheckout();
        return;
      }
      suscripcionActual = null;
      mostrarErrorGeneral(res.mensaje);
      renderizarTarjetaSuscripcion({ error: res.mensaje });
      renderizarPlanes();
      renderizarPasosCheckout();
      return;
    }

    suscripcionActual = normalizarSuscripcion(res.data);
    renderizarTarjetaSuscripcion(null);
    renderizarPlanes();
    renderizarPasosCheckout();
  }

  async function iniciarSuscripcion(plan) {
    if (procesandoAccion) {
      return;
    }
    const sesion = obtenerSesion();
    if (!sesion) {
      mostrarEstadoPago(`Inicia sesión para activar el plan ${plan.nombre}.`);
      const paso2 = document.getElementById("checkout-paso2-item");
      if (paso2 && typeof paso2.scrollIntoView === "function") {
        paso2.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const btnLogin = document.getElementById("btn-pago-ir-login");
      if (btnLogin) {
        btnLogin.focus();
      }
      return;
    }

    procesandoAccion = true;
    mostrarErrorGeneral("");
    mostrarEstadoPago(`Conectando plan ${plan.nombre} con Mercado Pago...`);
    renderizarPlanes();
    renderizarPasosCheckout();

    try {
      const res = await solicitarMp("/subscribe", {
        method: "POST",
        body: { plan: plan.id }
      });

      if (res.noAutenticado) {
        mostrarEstadoPago("");
        mostrarErrorGeneral("Tu sesión expiró. Inicia sesión primero para continuar al pago.");
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
        mostrarEstadoPago("Redirigiendo a la pasarela segura de Mercado Pago...");
        window.location.assign(initPoint.trim());
        return;
      }

      mostrarEstadoPago("");
      mostrarErrorGeneral(
        "El servicio de pago no devolvió un enlace válido de Mercado Pago. Intenta de nuevo."
      );
    } finally {
      procesandoAccion = false;
      renderizarPlanes();
      renderizarPasosCheckout();
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
        mostrarErrorGeneral("Tu sesión expiró. Inicia sesión para gestionar tu suscripción.");
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
      renderizarPasosCheckout();
    }
  }

  async function sincronizarVistaPago() {
    renderizarResumenBorrador();
    renderizarPlanes();
    renderizarPasosCheckout();

    const cargandoEl = document.getElementById("pago-cargando-sesion");
    const avisoBar = document.getElementById("pago-sesion-aviso");
    const sesionTit = document.getElementById("pago-sesion-titulo");
    const sesionSub = document.getElementById("pago-sesion-sub");
    const btnReintentar = document.getElementById("btn-pago-reintentar-sesion");
    const btnLoginTop = document.getElementById("btn-pago-ir-login-top");
    const subCard = document.getElementById("pago-suscripcion-card");

    const verificada =
      window.dmdCuenta && typeof window.dmdCuenta.estaVerificada === "function"
        ? window.dmdCuenta.estaVerificada()
        : true;

    if (!verificada) {
      if (cargandoEl) {
        cargandoEl.hidden = false;
      }
      if (avisoBar) {
        avisoBar.hidden = true;
      }
      if (subCard) {
        subCard.hidden = true;
      }
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
      if (subCard) {
        subCard.hidden = true;
      }
      if (avisoBar) {
        avisoBar.hidden = false;
      }
      if (sesionTit) {
        sesionTit.textContent = errorAuth
          ? "No pudimos verificar tu sesión en este momento"
          : "Puedes explorar y elegir tu plan ahora";
      }
      if (sesionSub) {
        sesionSub.textContent = errorAuth
          ? "Puedes revisar los planes abajo y reintentar la conexión cuando quieras."
          : "Para finalizar el cobro en Mercado Pago solo te pediremos iniciar sesión en tu cuenta.";
      }
      if (btnReintentar) {
        btnReintentar.hidden = !errorAuth;
      }
      if (btnLoginTop) {
        btnLoginTop.hidden = false;
        btnLoginTop.href = `login.html?plan=${encodeURIComponent(planSeleccionadoId)}`;
      }
      renderizarPlanes();
      renderizarPasosCheckout();
      return;
    }

    if (avisoBar) {
      avisoBar.hidden = false;
    }
    if (sesionTit) {
      sesionTit.textContent = `Sesión iniciada: ${sesion.nombre}`;
    }
    if (sesionSub) {
      sesionSub.textContent = sesion.correo;
    }
    if (btnReintentar) {
      btnReintentar.hidden = true;
    }
    if (btnLoginTop) {
      btnLoginTop.hidden = true;
    }

    await cargarSuscripcionReal();
  }

  window.dmdPago = {
    apiMpBase: API_MP_BASE,
    planes: PLANES_DMD.slice(),
    recargarSuscripcion: cargarSuscripcionReal
  };

  function montar() {
    try {
      const params = new URLSearchParams(window.location.search);
      const planUrl = params.get("plan");
      if (planUrl && obtenerPlanPorId(planUrl)) {
        planSeleccionadoId = planUrl.trim().toLowerCase();
      }
    } catch (error) {
      // Ignorar
    }

    const btnPedirCancelar = document.getElementById("btn-cancelar-suscripcion");
    const confirmBox = document.getElementById("confirmar-cancelar-suscripcion");
    const btnConfirmarCancelar = document.getElementById("btn-confirmar-cancelar-sub");
    const btnMantener = document.getElementById("btn-mantener-sub");
    const btnReintentarSesion = document.getElementById("btn-pago-reintentar-sesion");
    const btnContinuarMp = document.getElementById("btn-continuar-mp");

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

    if (btnReintentarSesion) {
      btnReintentarSesion.addEventListener("click", async () => {
        if (!window.dmdCuenta || typeof window.dmdCuenta.verificarSesion !== "function") {
          return;
        }
        btnReintentarSesion.disabled = true;
        btnReintentarSesion.textContent = "Verificando...";
        await window.dmdCuenta.verificarSesion();
        btnReintentarSesion.disabled = false;
        btnReintentarSesion.textContent = "Reintentar";
        sincronizarVistaPago();
      });
    }

    if (btnContinuarMp) {
      btnContinuarMp.addEventListener("click", () => {
        const plan = obtenerPlanPorId(planSeleccionadoId) || PLANES_DMD[1];
        iniciarSuscripcion(plan);
      });
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
