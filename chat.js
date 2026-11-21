"use strict";

/* ==========================================================================
   dmd - Controlador de chat de dmd (app.html)
   Conversación guiada paso a paso con indicador de progreso, estado de carga,
   un solo borrador agrupado por conversación, sanitización de rellenos y
   capitalización de nombres propios, confirmación y Deshacer al borrar.
   ========================================================================== */

(function inicializarChatDmd() {
  const KEY_CONVERSACIONES = "dmd_conversaciones_v1";
  const KEY_CONV_ACTIVA = "dmd_conversacion_activa_v1";
  const KEY_BORRADORES = "dmd_borradores_v1";
  const KEY_BORRADOR_ACTIVO = "dmd_borrador_activo_v1";
  const KEY_PUBLICADAS = "dmd_paginas_publicadas_v1";

  const PASOS = [
    {
      campo: "nombre",
      etiqueta: "Nombre del negocio",
      pregunta: "¿Cómo se llama tu negocio?",
      chips: []
    },
    {
      campo: "giro",
      etiqueta: "Giro del negocio",
      pregunta: "¿Cuál es el giro de tu negocio?",
      chips: ["Panadería", "Ferretería", "Cafetería", "Taquería", "Estética", "Servicios"]
    },
    {
      campo: "ciudad",
      etiqueta: "Ciudad",
      pregunta: "¿En qué ciudad estás?",
      chips: []
    },
    {
      campo: "direccion",
      etiqueta: "Calle o colonia (opcional)",
      pregunta: "¿En qué calle o colonia estás? (opcional, o toca Continuar sin dirección)",
      chips: ["Continuar sin dirección"]
    },
    {
      campo: "horario",
      etiqueta: "Horario (opcional)",
      pregunta: "¿Cuál es tu horario de atención? (ej. Lunes a viernes de 9 a 6 y sábado de 9 a 2, o toca Continuar sin horario)",
      chips: ["Continuar sin horario"]
    },
    {
      campo: "oferta",
      etiqueta: "Productos o servicios",
      pregunta: "¿Qué vendes o qué servicios ofreces?",
      chips: []
    },
    {
      campo: "tono",
      etiqueta: "Tono del texto",
      pregunta: "¿Qué tono prefieres?",
      chips: ["Cercano", "Profesional", "Formal"]
    },
    {
      campo: "whatsapp",
      etiqueta: "WhatsApp (opcional)",
      pregunta: "¿Cuál es tu WhatsApp? (opcional, con lada ej. 528112345678, o toca Continuar sin teléfono)",
      chips: ["Continuar sin teléfono"]
    }
  ];

  const RESPUESTAS_NO_OFERTA = new Set([
    "omitir",
    "saltar",
    "ok",
    "listo",
    "gracias",
    "muchas gracias",
    "ninguno",
    "ninguna",
    "nada",
    "no",
    "si",
    "sí",
    "cancelar",
    "pendiente",
    "despues",
    "después",
    "hola",
    "buenas",
    "sin whatsapp",
    "no tengo whatsapp",
    "seguir sin whatsapp",
    "continuar sin telefono",
    "continuar sin teléfono",
    "continuar sin direccion",
    "continuar sin dirección",
    "continuar sin horario"
  ]);

  function leer(clave, defecto) {
    if (window.dmdAlmacen && typeof window.dmdAlmacen.leer === "function") {
      return window.dmdAlmacen.leer(clave, defecto);
    }
    try {
      const v = window.localStorage.getItem(clave);
      return v ? JSON.parse(v) : defecto;
    } catch (e) {
      return defecto;
    }
  }

  function guardar(clave, valor, opciones) {
    if (window.dmdAlmacen && typeof window.dmdAlmacen.guardar === "function") {
      return window.dmdAlmacen.guardar(clave, valor, opciones);
    }
    try {
      if (valor === null || valor === undefined) {
        window.localStorage.removeItem(clave);
      } else {
        window.localStorage.setItem(clave, JSON.stringify(valor));
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function propietarioActual() {
    if (window.dmdCuenta && typeof window.dmdCuenta.obtenerClavePropietario === "function") {
      return window.dmdCuenta.obtenerClavePropietario();
    }
    return "invitado";
  }

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function crearId(prefijo) {
    return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function formatearFecha(iso) {
    try {
      return new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch (e) {
      return "";
    }
  }

  function formatearHoraCorta(iso) {
    try {
      return new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch (e) {
      return "";
    }
  }

  function copiarConTextarea(texto) {
    try {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.width = "1px";
      ta.style.height = "1px";
      ta.style.fontSize = "16px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        ta.setSelectionRange(0, texto.length);
      } catch (errSel) {
        // Ignorar si no aplica
      }
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return Boolean(ok);
    } catch (e) {
      return false;
    }
  }

  function copiarTexto(texto) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(texto).then(
        () => true,
        () => copiarConTextarea(texto)
      );
    }
    return Promise.resolve(copiarConTextarea(texto));
  }

  function crearIconoWhatsapp() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "btn-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5Z");
    svg.appendChild(path);
    return svg;
  }

  function crearIconoCheck() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "benefit-check");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M20 6 9 17l-5-5");
    svg.appendChild(path);
    return svg;
  }

  function montarChat() {
    const hilo = document.getElementById("chat-mensajes");
    if (!hilo || !window.dmdGenerador) {
      return;
    }

    const gen = window.dmdGenerador;
    const appShell = document.querySelector(".app-shell");
    const sidebar = document.getElementById("app-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    const btnAbrirSidebar = document.getElementById("btn-abrir-sidebar");
    const btnCerrarSidebar = document.getElementById("btn-cerrar-sidebar");
    const btnNuevaSidebar = document.getElementById("btn-nueva-conv-sidebar");
    const btnNuevaIcono = document.getElementById("btn-nueva-conv-icono");
    const btnSidebarAjustes = document.getElementById("btn-sidebar-ajustes");
    const sidebarBuscar = document.getElementById("sidebar-buscar");
    const badgeBorradoresMobile = document.getElementById("badge-borradores-mobile");
    const sidebarStorageLabel = document.getElementById("sidebar-storage-label");

    const tabModoChat = document.getElementById("tab-modo-chat");
    const tabModoEditor = document.getElementById("tab-modo-editor");
    const vistaChat = document.getElementById("vista-chat");
    const vistaEditor = document.getElementById("vista-editor");
    const vistaArchivos = document.getElementById("vista-archivos");
    const vistaProyectos = document.getElementById("vista-proyectos");
    const vistaSuscripcion = document.getElementById("vista-suscripcion");
    const vistaCuenta = document.getElementById("vista-cuenta");

    const panelArchivosPaginas = document.getElementById("panel-archivos-paginas");
    const panelArchivosMedia = document.getElementById("panel-archivos-media");
    const archivosPaginasVacio = document.getElementById("archivos-paginas-vacio");
    const gridArchivosPaginas = document.getElementById("grid-archivos-paginas");
    const archivosMediaVacio = document.getElementById("archivos-media-vacio");
    const gridArchivosMedia = document.getElementById("grid-archivos-media");
    const btnArchivosCrear = document.getElementById("btn-archivos-crear");
    const btnArchivosSubirIr = document.getElementById("btn-archivos-subir-ir");

    const contadorProyectos = document.getElementById("contador-proyectos");
    const proyectosVacio = document.getElementById("proyectos-vacio");
    const listaProyectos = document.getElementById("lista-proyectos");
    const btnProyectosNuevo = document.getElementById("btn-proyectos-nuevo");
    const btnProyectosIrChat = document.getElementById("btn-proyectos-ir-chat");
    const proyectosUndoBanner = document.getElementById("proyectos-undo-banner");
    const proyectosUndoTexto = document.getElementById("proyectos-undo-texto");
    const btnProyectosUndo = document.getElementById("btn-proyectos-undo");
    const btnProyectosUndoCerrar = document.getElementById("btn-proyectos-undo-cerrar");

    const btnConfigDescargar = document.getElementById("btn-config-descargar");
    const btnConfigImportar = document.getElementById("btn-config-importar");
    const inputImportar = document.getElementById("input-importar-respaldo");
    const estadoRespaldo = document.getElementById("estado-respaldo-sidebar");

    const appCuentaCargando = document.getElementById("app-cuenta-cargando");
    const appCuentaAutenticada = document.getElementById("app-cuenta-autenticada");
    const appCuentaMiniLogin = document.getElementById("app-cuenta-mini-login");
    const appCuentaNombre = document.getElementById("app-cuenta-nombre");
    const appCuentaCorreo = document.getElementById("app-cuenta-correo");
    const appCuentaPlanBadge = document.getElementById("app-cuenta-plan-badge");
    const appCuentaPlan = document.getElementById("app-cuenta-plan");
    const appCuentaPlanEstado = document.getElementById("app-cuenta-plan-estado");
    const appCuentaUso = document.getElementById("app-cuenta-uso");
    const appCuentaUsoDetalle = document.getElementById("app-cuenta-uso-detalle");
    const appCuentaPlanDetalle = document.getElementById("app-cuenta-plan-detalle");
    const appCuentaEstado = document.getElementById("app-cuenta-estado");
    const btnAppCuentaVerPlanes = document.getElementById("btn-app-cuenta-ver-planes");
    const btnAppCuentaRefrescar = document.getElementById("btn-app-cuenta-refrescar");
    const btnAppCuentaSalir = document.getElementById("btn-app-cuenta-salir");

    const miniLoginAvisoServicio = document.getElementById("app-mini-login-aviso-servicio");
    const miniLoginAvisoTitulo = document.getElementById("app-mini-login-aviso-titulo");
    const btnAppCuentaReintentar = document.getElementById("btn-app-cuenta-reintentar");
    const formMiniLogin = document.getElementById("form-mini-login");
    const miniLoginErrorGeneral = document.getElementById("mini-login-error-general");
    const miniLoginCorreo = document.getElementById("mini-login-correo");
    const errorMiniLoginCorreo = document.getElementById("error-mini-login-correo");
    const miniLoginPassword = document.getElementById("mini-login-password");
    const errorMiniLoginPassword = document.getElementById("error-mini-login-password");
    const btnMiniTogglePassword = document.getElementById("btn-mini-toggle-password");
    const btnMiniLoginEntrar = document.getElementById("btn-mini-login-entrar");
    const btnMiniLoginGoogle = document.getElementById("btn-mini-login-google");
    const miniLoginGoogleEstado = document.getElementById("mini-login-google-estado");

    const modalMediaVisor = document.getElementById("modal-media-visor");
    const mediaModalImg = document.getElementById("media-modal-img");
    const mediaModalTitulo = document.getElementById("media-modal-titulo");
    const mediaModalMeta = document.getElementById("media-modal-meta");
    const btnCerrarMediaModal = document.getElementById("btn-cerrar-media-modal");
    const btnMediaUsarPortada = document.getElementById("btn-media-usar-portada");
    const btnMediaUsarLogo = document.getElementById("btn-media-usar-logo");

    const botonesVistaApp = Array.from(document.querySelectorAll("[data-app-vista]"));
    const botonesTabArchivos = Array.from(document.querySelectorAll("[data-archivos-tab]"));

    const contadorConv = document.getElementById("contador-conversaciones");
    const convVacio = document.getElementById("conversaciones-vacio");
    const listaConvEl = document.getElementById("lista-conversaciones");

    const progresoTexto = document.getElementById("chat-progreso-texto");
    const progresoPaso = document.getElementById("chat-progreso-porcentaje");
    const progresoBarra = document.getElementById("chat-progreso-barra");

    const chatErrorBanner = document.getElementById("chat-error-banner");
    const chatErrorTexto = document.getElementById("chat-error-texto");
    const btnChatReintentar = document.getElementById("btn-chat-reintentar");

    const sugerenciasEl = document.getElementById("chat-sugerencias");
    const estadoChatEl = document.getElementById("chat-estado");
    const formChat = document.getElementById("form-chat");
    const entradaChat = document.getElementById("chat-entrada");
    const btnEnviar = document.getElementById("btn-chat-enviar");

    const undoToast = document.getElementById("app-undo-toast");
    const undoTexto = document.getElementById("app-undo-texto");
    const btnUndo = document.getElementById("btn-app-undo");
    const btnUndoCerrar = document.getElementById("btn-app-undo-cerrar");

    const sidebarUndoBanner = document.getElementById("sidebar-undo-banner");
    const sidebarUndoTexto = document.getElementById("sidebar-undo-texto");
    const btnSidebarUndo = document.getElementById("btn-sidebar-undo");
    const btnSidebarUndoCerrar = document.getElementById("btn-sidebar-undo-cerrar");

    let todasConversaciones = [];
    let todosBorradores = [];
    let todasPublicadas = [];
    let convActivaId = null;
    let convBorradorMemoria = null;
    let borradorActivoId = null;
    let editandoMsgId = null;
    let modoActual = "chat";
    let vistaActual = "chat";
    let tabArchivosActual = "paginas";
    let terminoBusquedaSidebar = "";
    let chipsSeguimiento = [];
    let mediaModalActual = null;
    let generandoAhora = false;
    let ultimaAccionFallida = null;

    let confirmandoBorrarDraftId = null;
    let confirmandoBorrarConvId = null;
    let ultimoEliminado = null;
    let timerUndoToast = null;

    let cuentaDatosCargadosParaId = "";
    let miniLoginEnviando = false;

    let plantillaInicialUrl = "";
    try {
      const params = new URLSearchParams(window.location.search);
      const p = (params.get("plantilla") || "").trim().toLowerCase();
      if (["clasica", "editorial", "directa"].includes(p)) {
        plantillaInicialUrl = p;
      }
    } catch (error) {
      plantillaInicialUrl = "";
    }

    function actualizarIndicadorGuardado() {
      if (!sidebarStorageLabel) {
        return;
      }
      const hora = formatearHoraCorta(new Date().toISOString());
      sidebarStorageLabel.textContent = hora
        ? `Guardado en este navegador · ${hora}`
        : "Guardado en este navegador";
    }

    function mostrarErrorChat(mensaje, accionReintentar) {
      ultimaAccionFallida = typeof accionReintentar === "function" ? accionReintentar : null;
      if (!chatErrorBanner || !chatErrorTexto) {
        return;
      }
      if (mensaje) {
        chatErrorTexto.textContent = mensaje;
        chatErrorBanner.hidden = false;
        if (btnChatReintentar) {
          btnChatReintentar.hidden = !ultimaAccionFallida;
        }
      } else {
        chatErrorTexto.textContent = "";
        chatErrorBanner.hidden = true;
      }
    }

    function fijarEstadoGeneracion(activo, mensaje) {
      generandoAhora = Boolean(activo);
      if (btnEnviar) {
        btnEnviar.disabled = generandoAhora;
        btnEnviar.textContent = "Enviar";
      }
      if (entradaChat) {
        entradaChat.disabled = generandoAhora;
      }
      if (hilo) {
        hilo.setAttribute("aria-busy", generandoAhora ? "true" : "false");
      }
      if (mensaje !== undefined) {
        estadoChatEl.textContent = mensaje;
      }
      renderizarHilo({ scrollSuave: true, forzarScroll: true });
    }

    function ocultarUndoToast() {
      if (timerUndoToast) {
        window.clearTimeout(timerUndoToast);
        timerUndoToast = null;
      }
      ultimoEliminado = null;
      if (undoToast) {
        undoToast.hidden = true;
      }
      if (sidebarUndoBanner) {
        sidebarUndoBanner.hidden = true;
      }
      if (proyectosUndoBanner) {
        proyectosUndoBanner.hidden = true;
      }
    }

    function mostrarUndoToast(mensaje, restaurarDatos) {
      if (timerUndoToast) {
        window.clearTimeout(timerUndoToast);
        timerUndoToast = null;
      }
      ultimoEliminado = restaurarDatos;
      if (undoTexto) {
        undoTexto.textContent = mensaje;
      }
      if (undoToast) {
        undoToast.hidden = false;
      }
      if (sidebarUndoTexto) {
        sidebarUndoTexto.textContent = mensaje;
      }
      if (sidebarUndoBanner) {
        sidebarUndoBanner.hidden = false;
      }
      if (proyectosUndoTexto) {
        proyectosUndoTexto.textContent = mensaje;
      }
      if (proyectosUndoBanner) {
        proyectosUndoBanner.hidden = false;
      }
      timerUndoToast = window.setTimeout(() => {
        ocultarUndoToast();
      }, 15000);
    }

    function esTextoOmision(texto) {
      if (typeof gen.esOmisionCampoOpcional === "function" && gen.esOmisionCampoOpcional(texto)) {
        return true;
      }
      if (typeof gen.esOmisionWhatsapp === "function" && gen.esOmisionWhatsapp(texto)) {
        return true;
      }
      if (typeof gen.esTextoRelleno === "function" && gen.esTextoRelleno(texto)) {
        return true;
      }
      return /^(omitir|saltar|sin\s+whats?app|no\s+tengo|continuar\s+sin)/i.test(String(texto || "").trim());
    }

    function obtenerEtiquetaGiroLimpia(datos) {
      if (!datos) {
        return "";
      }
      if (typeof gen.inferirEtiquetaGiroEspecifico === "function") {
        const esp = gen.inferirEtiquetaGiroEspecifico(datos);
        if (esp) {
          return esp;
        }
      }
      return datos.giroTexto || (gen.GIROS_ETIQUETAS && gen.GIROS_ETIQUETAS[datos.giro]) || datos.giro || "";
    }

    function limpiarDigitosWhatsappValidos(valor) {
      if (esTextoOmision(valor)) {
        return "";
      }
      const dig = gen.limpiarDigitos(valor);
      return dig.length >= 10 && dig.length <= 15 ? dig : "";
    }

    function normalizarCiudadEjemplo(nombre, ciudad) {
      const nNorm = String(nombre || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      const cNorm = String(ciudad || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      if (nNorm === "panaderia la espiga" && cNorm === "mexicali") {
        return "Guadalajara";
      }
      return ciudad;
    }

    function sanearColeccionesCargadas() {
      let huboAjuste = false;
      const formatearNombre =
        typeof gen.formatearNombrePropio === "function" ? gen.formatearNombrePropio : (v) => v;
      const limpiarOferta =
        typeof gen.limpiarOfertaDeRelleno === "function" ? gen.limpiarOfertaDeRelleno : (v) => v;

      todosBorradores.forEach((b) => {
        if (!b || !b.datos) {
          return;
        }
        const nomNuevo = formatearNombre(b.datos.nombre, "nombre");
        const ciuBase = formatearNombre(b.datos.ciudad, "ciudad");
        const ciuNueva = normalizarCiudadEjemplo(nomNuevo, ciuBase);
        const ofNueva = limpiarOferta(b.datos.oferta);
        const waLimpio = limpiarDigitosWhatsappValidos(b.datos.whatsapp);

        let necesitaRegenerar = false;
        if (nomNuevo && nomNuevo !== b.datos.nombre) {
          b.datos.nombre = nomNuevo;
          huboAjuste = true;
        }
        if (ciuNueva && ciuNueva !== b.datos.ciudad) {
          b.datos.ciudad = ciuNueva;
          necesitaRegenerar = true;
          huboAjuste = true;
        }
        if (typeof b.datos.direccion !== "string") {
          b.datos.direccion = "";
        }
        if (typeof b.datos.horario !== "string") {
          b.datos.horario = "";
        }
        const giroEsp = obtenerEtiquetaGiroLimpia(b.datos);
        if (
          giroEsp &&
          giroEsp !== b.datos.giroTexto &&
          (!b.datos.giroTexto || /^(comida|tienda|otro|negocio|comercio)$/i.test(String(b.datos.giroTexto).trim()))
        ) {
          b.datos.giroTexto = giroEsp;
          huboAjuste = true;
        }
        if (waLimpio !== (b.datos.whatsapp || "")) {
          b.datos.whatsapp = waLimpio;
          huboAjuste = true;
        }
        if (b.borrador && waLimpio !== (b.borrador.whatsapp || "")) {
          b.borrador.whatsapp = waLimpio;
          huboAjuste = true;
        }
        if (ofNueva && ofNueva !== b.datos.oferta) {
          b.datos.oferta = ofNueva;
          necesitaRegenerar = true;
          huboAjuste = true;
        }
        if (
          b.borrador &&
          (/\b(omitir|sin\s+whats?app)\b/i.test(JSON.stringify(b.borrador)) || necesitaRegenerar)
        ) {
          b.borrador = gen.generarBorrador(b.datos, b.borrador.variante || 0);
          huboAjuste = true;
        } else if (typeof gen.sanearBorradorLegado === "function" && gen.sanearBorradorLegado(b)) {
          huboAjuste = true;
        }
        if (
          b.seo &&
          b.datos.ciudad === "Guadalajara" &&
          /panader[ií]a\s+la\s+espiga/i.test(b.datos.nombre || "")
        ) {
          ["titulo", "descripcion", "palabrasClave"].forEach((k) => {
            if (typeof b.seo[k] === "string" && /mexicali/i.test(b.seo[k])) {
              b.seo[k] = b.seo[k].replace(/mexicali/gi, "Guadalajara");
              huboAjuste = true;
            }
          });
        }
        if (Array.isArray(b.versiones)) {
          b.versiones.forEach((v) => {
            if (!v) {
              return;
            }
            if (typeof v.etiqueta === "string" && /\bomitir\b/i.test(v.etiqueta)) {
              v.etiqueta = "Actualización de borrador";
              huboAjuste = true;
            }
            if (typeof v.detalle === "string" && /\bomitir\b/i.test(v.detalle)) {
              v.detalle = "Contenido actualizado";
              huboAjuste = true;
            }
          });
        }
        if (window.dmdEditor && typeof window.dmdEditor.asegurarEstructuraBorrador === "function") {
          window.dmdEditor.asegurarEstructuraBorrador(b);
        }
      });

      todasPublicadas.forEach((p) => {
        if (!p || !p.datos || !p.borrador) {
          return;
        }
        const giroPubEsp = obtenerEtiquetaGiroLimpia(p.datos);
        if (
          giroPubEsp &&
          giroPubEsp !== p.datos.giroTexto &&
          (!p.datos.giroTexto || /^(comida|tienda|otro|negocio|comercio)$/i.test(String(p.datos.giroTexto).trim()))
        ) {
          p.datos.giroTexto = giroPubEsp;
          huboAjuste = true;
        }
        const waPub = limpiarDigitosWhatsappValidos(p.datos.whatsapp);
        if (waPub !== (p.datos.whatsapp || "")) {
          p.datos.whatsapp = waPub;
          p.borrador.whatsapp = waPub;
          huboAjuste = true;
        }
        if (typeof gen.sanearBorradorLegado === "function" && gen.sanearBorradorLegado(p)) {
          huboAjuste = true;
        }
      });

      function normalizarClaveTexto(valor) {
        return String(valor || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      function capitalizarPrimeraLetra(valor) {
        const limpio = String(valor || "").trim();
        if (!limpio) {
          return "";
        }
        if (/^[a-záéíóúñü]/.test(limpio)) {
          return limpio.charAt(0).toUpperCase() + limpio.slice(1);
        }
        return limpio;
      }

      function esMsgBorradorListo(msg) {
        return Boolean(
          msg &&
            msg.rol === "asistente" &&
            typeof msg.texto === "string" &&
            /^borrador\s+listo\b/i.test(msg.texto.trim())
        );
      }

      todasConversaciones.forEach((c) => {
        if (!c || !c.datos) {
          return;
        }
        if (c.datos.nombre) {
          const n = formatearNombre(c.datos.nombre, "nombre");
          if (n && (n !== c.datos.nombre || c.titulo !== n)) {
            c.datos.nombre = n;
            c.titulo = n;
            huboAjuste = true;
          }
        }
        if (c.datos.ciudad) {
          const ci = normalizarCiudadEjemplo(c.datos.nombre, formatearNombre(c.datos.ciudad, "ciudad"));
          if (ci !== c.datos.ciudad) {
            c.datos.ciudad = ci;
            huboAjuste = true;
          }
        }
        if (typeof c.datos.direccion !== "string") {
          c.datos.direccion = "";
        }
        if (typeof c.datos.horario !== "string") {
          c.datos.horario = "";
        }
        const giroConvEsp = obtenerEtiquetaGiroLimpia(c.datos);
        if (
          giroConvEsp &&
          giroConvEsp !== c.datos.giroTexto &&
          (!c.datos.giroTexto || /^(comida|tienda|otro|negocio|comercio)$/i.test(String(c.datos.giroTexto).trim()))
        ) {
          c.datos.giroTexto = giroConvEsp;
          huboAjuste = true;
        }
        // Migrar conversaciones completadas con el flujo anterior de 6 pasos al flujo actual de 8 pasos
        if (
          (c.borradorId || (c.pasoIndice >= 6 && c.datos.oferta && c.datos.tono)) &&
          c.pasoIndice < PASOS.length
        ) {
          c.pasoIndice = PASOS.length;
          huboAjuste = true;
        }
        const waConv = limpiarDigitosWhatsappValidos(c.datos.whatsapp);
        if (waConv !== (c.datos.whatsapp || "")) {
          c.datos.whatsapp = waConv;
          huboAjuste = true;
        }
        if (c.datos.oferta) {
          const of = limpiarOferta(c.datos.oferta);
          if (of && of !== c.datos.oferta) {
            c.datos.oferta = of;
            huboAjuste = true;
          }
        }
        const esEspiga = /panader[ií]a\s+la\s+espiga/i.test(c.datos.nombre || "");
        const nomNorm = normalizarClaveTexto(c.datos.nombre);
        const ciuNorm = normalizarClaveTexto(c.datos.ciudad);
        const ofNorm = normalizarClaveTexto(c.datos.oferta);

        if (Array.isArray(c.mensajes)) {
          const antesLen = c.mensajes.length;
          c.mensajes = c.mensajes
            .filter((m) => {
              if (!m || typeof m.texto !== "string") {
                return false;
              }
              // Nunca mostrar burbujas literales de "Omitir" ni variantes de "sin WhatsApp"
              if (m.rol === "usuario" && esTextoOmision(m.texto)) {
                return false;
              }
              // Eliminar mensajes del asistente que solo registraban "Agregado: Omitir" si no son la tarjeta activa
              if (
                m.rol === "asistente" &&
                m.tipo !== "borrador" &&
                /(?:^|\.\s*)(?:se\s+)?(?:agreg(?:ado|ó)|oferta):\s*["“”']?(?:omitir|sin\s+whats?app|ninguno|pendiente|saltar)["“”']?\.?$/i.test(
                  m.texto.trim()
                )
              ) {
                return false;
              }
              return true;
            })
            .map((m) => {
              let textoMsg = m.texto;

              // Capitalizar respuestas antiguas del usuario en el historial sin borrar la conversación
              if (m.rol === "usuario") {
                const msgNorm = normalizarClaveTexto(textoMsg);
                if (m.campo === "nombre" || (nomNorm && msgNorm === nomNorm)) {
                  const nomForm = c.datos.nombre || formatearNombre(textoMsg, "nombre");
                  if (nomForm && nomForm !== textoMsg) {
                    textoMsg = nomForm;
                    huboAjuste = true;
                  }
                } else if (m.campo === "ciudad" || (ciuNorm && msgNorm === ciuNorm)) {
                  const ciuForm = c.datos.ciudad || formatearNombre(textoMsg, "ciudad");
                  if (ciuForm && ciuForm !== textoMsg) {
                    textoMsg = ciuForm;
                    huboAjuste = true;
                  }
                } else if (m.campo === "oferta" || (ofNorm && msgNorm === ofNorm)) {
                  const ofForm = capitalizarPrimeraLetra(textoMsg);
                  if (ofForm && ofForm !== textoMsg) {
                    textoMsg = ofForm;
                    huboAjuste = true;
                  }
                }
              }

              if (m.rol === "asistente") {
                if (
                  /(?:agregado|se agregó|oferta):\s*["“”']?(?:omitir|sin\s+whats?app)["“”']?/i.test(textoMsg)
                ) {
                  huboAjuste = true;
                  textoMsg = `Borrador listo para ${c.datos.nombre || "tu negocio"}. Puedes revisarlo aquí, pedir ajustes o abrir el Editor visual.`;
                } else if (/^borrador\s+listo\s+para\b/i.test(textoMsg.trim()) && c.datos.nombre) {
                  const corregido = textoMsg.replace(
                    /^borrador\s+listo\s+para\s+[^.!\n]+/i,
                    `Borrador listo para ${c.datos.nombre}`
                  );
                  if (corregido !== textoMsg) {
                    textoMsg = corregido;
                    huboAjuste = true;
                  }
                }
              }

              if (esEspiga && /mexicali/i.test(textoMsg)) {
                huboAjuste = true;
                textoMsg = textoMsg.replace(/mexicali/gi, "Guadalajara");
              }
              return textoMsg !== m.texto ? { ...m, texto: textoMsg } : m;
            });

          // Asegurar a lo sumo 1 tarjeta tipo "borrador" (la última)
          let ultimoIdxBorrador = -1;
          c.mensajes.forEach((m, idx) => {
            if (m && m.tipo === "borrador") {
              ultimoIdxBorrador = idx;
            }
          });
          if (ultimoIdxBorrador !== -1) {
            c.mensajes.forEach((m, idx) => {
              if (m && m.tipo === "borrador" && idx !== ultimoIdxBorrador) {
                m.tipo = "texto";
                delete m.borradorId;
                huboAjuste = true;
              }
            });
          }

          // Deduplicar mensajes repetidos de "Borrador listo..." dejando solo 1 (priorizando la tarjeta activa)
          const indicesListo = [];
          c.mensajes.forEach((m, idx) => {
            if (esMsgBorradorListo(m)) {
              indicesListo.push(idx);
            }
          });
          if (indicesListo.length > 1) {
            const mantenerIdx = indicesListo.includes(ultimoIdxBorrador)
              ? ultimoIdxBorrador
              : indicesListo[indicesListo.length - 1];
            c.mensajes = c.mensajes.filter(
              (m, idx) => !esMsgBorradorListo(m) || idx === mantenerIdx
            );
            huboAjuste = true;
          }

          if (c.mensajes.length !== antesLen) {
            huboAjuste = true;
          }
        }
      });

      if (huboAjuste) {
        guardarColecciones();
      }
    }

    function cargarColecciones() {
      const c = leer(KEY_CONVERSACIONES, []);
      const b = leer(KEY_BORRADORES, []);
      const p = leer(KEY_PUBLICADAS, []);
      todasConversaciones = Array.isArray(c) ? c : [];
      todosBorradores = Array.isArray(b) ? b : [];
      todasPublicadas = Array.isArray(p) ? p : [];
      sanearColeccionesCargadas();
    }

    function guardarColecciones(opciones) {
      const lote = {
        [KEY_CONVERSACIONES]: todasConversaciones,
        [KEY_BORRADORES]: todosBorradores,
        [KEY_PUBLICADAS]: todasPublicadas,
        [KEY_CONV_ACTIVA]: convActivaId ? { cuentaId: propietarioActual(), id: convActivaId } : null,
        [KEY_BORRADOR_ACTIVO]: borradorActivoId
          ? { cuentaId: propietarioActual(), id: borradorActivoId }
          : null
      };
      if (window.dmdAlmacen && typeof window.dmdAlmacen.guardarLote === "function") {
        window.dmdAlmacen.guardarLote(lote, opciones);
      } else {
        Object.keys(lote).forEach((k) => guardar(k, lote[k], opciones));
      }
      actualizarIndicadorGuardado();
    }

    function convsDelPropietario() {
      const prop = propietarioActual();
      return todasConversaciones.filter((c) => c && c.cuentaId === prop);
    }

    function borradoresDelPropietario() {
      const prop = propietarioActual();
      return todosBorradores.filter((b) => b && b.cuentaId === prop);
    }

    function crearObjetoConversacionVacia() {
      const ahora = new Date().toISOString();
      return {
        id: crearId("conv"),
        cuentaId: propietarioActual(),
        titulo: "Nueva conversación",
        pasoIndice: 0,
        datos: {
          nombre: "",
          giro: "",
          giroTexto: "",
          ciudad: "",
          direccion: "",
          horario: "",
          oferta: "",
          tono: "",
          whatsapp: ""
        },
        borradorId: null,
        creadaEn: ahora,
        actualizadaEn: ahora,
        mensajes: [
          {
            id: crearId("msg"),
            rol: "asistente",
            tipo: "texto",
            texto: PASOS[0].pregunta
          }
        ]
      };
    }

    function obtenerConvActiva() {
      const guardada = convsDelPropietario().find((c) => c.id === convActivaId);
      if (guardada) {
        return guardada;
      }
      if (convBorradorMemoria && convBorradorMemoria.cuentaId === propietarioActual()) {
        return convBorradorMemoria;
      }
      return null;
    }

    function obtenerBorradorPorId(id) {
      return borradoresDelPropietario().find((b) => b.id === id) || null;
    }

    function fijarConvActiva(id) {
      convActivaId = id;
      if (id) {
        convBorradorMemoria = null;
      }
      guardar(KEY_CONV_ACTIVA, id ? { cuentaId: propietarioActual(), id } : null);
    }

    function fijarBorradorActivo(id) {
      borradorActivoId = id;
      guardar(KEY_BORRADOR_ACTIVO, id ? { cuentaId: propietarioActual(), id } : null);
      if (window.dmdEditor) {
        window.dmdEditor.cargarBorrador(id ? obtenerBorradorPorId(id) : null, false);
      }
    }

    function esEscritorioApp() {
      return window.matchMedia && window.matchMedia("(min-width: 960px)").matches;
    }

    function abrirSidebar(abrir) {
      const estado = Boolean(abrir);
      if (esEscritorioApp()) {
        if (appShell) {
          appShell.classList.toggle("sidebar-collapsed", !estado);
        }
        sidebar.classList.remove("is-open");
        backdrop.hidden = true;
        btnAbrirSidebar.setAttribute("aria-expanded", estado ? "true" : "false");
        return;
      }
      sidebar.classList.toggle("is-open", estado);
      backdrop.hidden = !estado;
      btnAbrirSidebar.setAttribute("aria-expanded", estado ? "true" : "false");
    }

    function alternarSidebar() {
      if (esEscritorioApp()) {
        const colapsado = appShell && appShell.classList.contains("sidebar-collapsed");
        abrirSidebar(colapsado);
      } else {
        const abierto = sidebar.classList.contains("is-open");
        abrirSidebar(!abierto);
      }
    }

    function cambiarVistaApp(nuevaVista) {
      const permitidas = ["chat", "editor", "archivos", "proyectos", "suscripcion", "cuenta"];
      const destino = permitidas.includes(nuevaVista) ? nuevaVista : "chat";
      vistaActual = destino;
      modoActual = destino === "editor" ? "editor" : "chat";

      const mapaVistas = {
        chat: vistaChat,
        editor: vistaEditor,
        archivos: vistaArchivos,
        proyectos: vistaProyectos,
        suscripcion: vistaSuscripcion,
        cuenta: vistaCuenta
      };

      Object.keys(mapaVistas).forEach((clave) => {
        const el = mapaVistas[clave];
        if (el) {
          el.hidden = clave !== destino;
        }
      });

      const esChat = destino === "chat";
      const esEditor = destino === "editor";
      tabModoChat.classList.toggle("mode-tab-active", esChat);
      tabModoEditor.classList.toggle("mode-tab-active", esEditor);
      tabModoChat.setAttribute("aria-selected", esChat ? "true" : "false");
      tabModoEditor.setAttribute("aria-selected", esEditor ? "true" : "false");

      const vistaNav = destino === "editor" ? "chat" : destino;
      botonesVistaApp.forEach((btn) => {
        const v = btn.dataset.appVista;
        const activo = v === vistaNav;
        btn.classList.toggle("is-active", activo);
        if (activo) {
          btn.setAttribute("aria-current", "page");
        } else {
          btn.removeAttribute("aria-current");
        }
      });

      if (esEditor && window.dmdEditor) {
        const reg = obtenerBorradorPorId(borradorActivoId) || borradoresDelPropietario()[0] || null;
        if (reg && reg.id !== borradorActivoId) {
          fijarBorradorActivo(reg.id);
        } else {
          window.dmdEditor.cargarBorrador(reg, false);
        }
      } else if (destino === "archivos") {
        renderizarArchivos();
      } else if (destino === "proyectos") {
        renderizarMisProyectos();
      } else if (destino === "cuenta") {
        renderizarMiCuenta(false);
      } else if (destino === "chat") {
        desplazarChatAlFinal({ suave: false, forzar: true });
      }

      if (!esEscritorioApp()) {
        abrirSidebar(false);
      }
    }

    function cambiarModo(nuevoModo) {
      cambiarVistaApp(nuevoModo === "editor" ? "editor" : "chat");
    }

    function crearNuevaConversacion() {
      convActivaId = null;
      convBorradorMemoria = crearObjetoConversacionVacia();
      editandoMsgId = null;
      chipsSeguimiento = [];
      mostrarErrorChat("");
      estadoChatEl.textContent = "";
      renderizarTodo();
      cambiarVistaApp("chat");
      if (!esEscritorioApp()) {
        abrirSidebar(false);
      }
    }

    function asegurarConversacionActiva() {
      const lista = convsDelPropietario();
      const guardada = leer(KEY_CONV_ACTIVA, null);
      if (guardada && guardada.cuentaId === propietarioActual()) {
        const hallada = lista.find((c) => c.id === guardada.id);
        if (hallada) {
          convActivaId = hallada.id;
          convBorradorMemoria = null;
          return hallada;
        }
      }
      if (lista.length > 0) {
        convActivaId = lista[0].id;
        convBorradorMemoria = null;
        return lista[0];
      }
      if (!convBorradorMemoria || convBorradorMemoria.cuentaId !== propietarioActual()) {
        convBorradorMemoria = crearObjetoConversacionVacia();
      }
      return convBorradorMemoria;
    }

    function sincronizarPublicada(registro) {
      if (!registro || !registro.publicadaSlug) {
        return;
      }
      const idx = todasPublicadas.findIndex((p) => p && p.slug === registro.publicadaSlug);
      const entrada = {
        slug: registro.publicadaSlug,
        borradorId: registro.id,
        cuentaId: registro.cuentaId,
        publicadaEn: registro.publicadaEn || new Date().toISOString(),
        actualizadaEn: new Date().toISOString(),
        datos: clonar(registro.datos),
        borrador: clonar(registro.borrador),
        diseno: clonar(registro.diseno),
        seo: clonar(registro.seo),
        dominio: clonar(registro.dominio),
        analitica: clonar(registro.analitica)
      };
      if (idx === -1) {
        todasPublicadas.unshift(entrada);
      } else {
        todasPublicadas[idx] = entrada;
      }
    }

    function publicarBorrador(registro) {
      if (!registro) {
        return null;
      }
      if (window.dmdEditor) {
        window.dmdEditor.asegurarEstructuraBorrador(registro);
      }
      if (!registro.publicadaSlug) {
        const sub = registro.dominio && registro.dominio.subdominio;
        const valSub =
          sub && typeof gen.validarSubdominio === "function" ? gen.validarSubdominio(sub) : null;
        registro.publicadaSlug =
          valSub && valSub.ok ? valSub.slug : gen.crearSlugPublicacion(registro.datos.nombre);
        registro.publicadaEn = new Date().toISOString();
      }
      registro.actualizadoEn = new Date().toISOString();
      sincronizarPublicada(registro);
      guardarColecciones();
      renderizarMisProyectos();
      renderizarHilo();
      if (window.dmdEditor && borradorActivoId === registro.id) {
        window.dmdEditor.cargarBorrador(registro, false);
      }
      return gen.construirUrlPublicada(registro.publicadaSlug);
    }

    async function guardarOActualizarBorradorDesdeConv(conv, variante, etiquetaVersion, detalleVersion) {
      const datos = clonar(conv.datos);
      if (typeof gen.formatearNombrePropio === "function") {
        datos.nombre = gen.formatearNombrePropio(datos.nombre, "nombre");
        datos.ciudad = gen.formatearNombrePropio(datos.ciudad, "ciudad");
      }
      if (typeof gen.limpiarOfertaDeRelleno === "function") {
        datos.oferta = gen.limpiarOfertaDeRelleno(datos.oferta) || datos.oferta;
      }
      conv.datos = clonar(datos);

      const resultado =
        typeof gen.generarBorradorConDetalle === "function"
          ? await gen.generarBorradorConDetalle(datos, variante)
          : {
              borrador:
                (gen.generarBorradorConServicio
                  ? await gen.generarBorradorConServicio(datos, variante)
                  : null) || gen.generarBorrador(datos, variante),
              origen: "local"
            };
      const borrador = resultado.borrador;

      let registro = conv.borradorId ? obtenerBorradorPorId(conv.borradorId) : null;

      if (registro) {
        const esRegeneracion = String(etiquetaVersion || "").startsWith("Regenerado");
        const portadaPrevia = registro.diseno && registro.diseno.portadaOrigen;
        const giroPortadaPrevio = (registro.diseno && registro.diseno.portadaGiro) || "";
        const giroPortadaNuevo = (borrador.portada && borrador.portada.giro) || "";
        const cambioTema = Boolean(giroPortadaNuevo && giroPortadaPrevio !== giroPortadaNuevo);

        registro.datos = datos;
        registro.borrador = borrador;
        registro.actualizadoEn = new Date().toISOString();
        if (window.dmdEditor) {
          window.dmdEditor.asegurarEstructuraBorrador(registro);
          if (
            borrador.portada &&
            portadaPrevia !== "propia" &&
            (esRegeneracion || cambioTema || !registro.diseno.portadaDataUrl)
          ) {
            const nuevaPortada =
              esRegeneracion && !cambioTema && typeof gen.obtenerSiguientePortada === "function"
                ? gen.obtenerSiguientePortada(
                    datos,
                    registro.diseno.portadaIndice,
                    registro.diseno.portadaDataUrl
                  )
                : borrador.portada;
            if (typeof window.dmdEditor.aplicarPortadaEnRegistro === "function") {
              window.dmdEditor.aplicarPortadaEnRegistro(registro, nuevaPortada);
            }
          }
          window.dmdEditor.registrarVersion(
            registro,
            etiquetaVersion || "Actualización por chat",
            detalleVersion || ""
          );
        }
        sincronizarPublicada(registro);
      } else {
        registro = {
          id: crearId("borrador"),
          cuentaId: propietarioActual(),
          convId: conv.id,
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString(),
          datos,
          borrador,
          diseno: plantillaInicialUrl ? { plantilla: plantillaInicialUrl } : {},
          publicadaSlug: "",
          publicadaEn: ""
        };
        if (window.dmdEditor) {
          window.dmdEditor.asegurarEstructuraBorrador(registro);
          if (borrador.portada && typeof window.dmdEditor.aplicarPortadaEnRegistro === "function") {
            window.dmdEditor.aplicarPortadaEnRegistro(registro, borrador.portada);
          }
          window.dmdEditor.registrarVersion(
            registro,
            "Versión inicial",
            `Borrador creado para ${datos.nombre}`
          );
        }
        todosBorradores.unshift(registro);
        conv.borradorId = registro.id;
      }

      conv.titulo = datos.nombre || conv.titulo;
      conv.actualizadaEn = new Date().toISOString();
      guardarColecciones();
      fijarBorradorActivo(registro.id);
      return { registro, origen: resultado.origen };
    }

    function duplicarBorrador(registro) {
      if (!registro) {
        return;
      }
      const copia = clonar(registro);
      copia.id = crearId("borrador");
      copia.datos.nombre = `${registro.datos.nombre} (copia)`;
      copia.borrador.titulo = `${registro.borrador.titulo} (copia)`;
      copia.publicadaSlug = "";
      copia.publicadaEn = "";
      copia.creadoEn = new Date().toISOString();
      copia.actualizadoEn = copia.creadoEn;
      copia.analitica = {
        visitas: 0,
        clicsWhatsapp: 0,
        enviosFormulario: 0,
        idAnalitica: (registro.analitica && registro.analitica.idAnalitica) || "",
        idPixel: (registro.analitica && registro.analitica.idPixel) || ""
      };
      todosBorradores.unshift(copia);
      guardarColecciones();
      fijarBorradorActivo(copia.id);
      renderizarMisProyectos();
      if (vistaActual === "archivos") {
        renderizarArchivos();
      }
      estadoChatEl.textContent = `Se duplicó ${registro.datos.nombre}.`;
    }

    function borrarBorrador(id) {
      const reg = obtenerBorradorPorId(id);
      if (!reg) {
        return;
      }

      // Capturar copia completa antes de borrar para permitir Deshacer
      const respaldoUndo = {
        tipo: "borrador",
        registro: clonar(reg),
        publicadas: todasPublicadas.filter((p) => p && p.slug === reg.publicadaSlug).map(clonar),
        conversacionesPrevias: clonar(todasConversaciones),
        convActivaPrevia: convActivaId,
        borradorActivoPrevio: borradorActivoId
      };

      const nombre = reg.datos.nombre;
      confirmandoBorrarDraftId = null;
      if (reg.publicadaSlug) {
        todasPublicadas = todasPublicadas.filter((p) => p && p.slug !== reg.publicadaSlug);
      }
      todosBorradores = todosBorradores.filter((b) => b && b.id !== id);
      const convVinculadaIds = new Set();
      todasConversaciones.forEach((c) => {
        if (c && (c.borradorId === id || (reg.conversacionId && c.id === reg.conversacionId))) {
          convVinculadaIds.add(c.id);
        }
      });
      if (convVinculadaIds.size > 0) {
        todasConversaciones = todasConversaciones.filter((c) => c && !convVinculadaIds.has(c.id));
        if (convActivaId && convVinculadaIds.has(convActivaId)) {
          convActivaId = null;
          asegurarConversacionActiva();
        }
      }
      if (borradorActivoId === id) {
        const siguiente = borradoresDelPropietario()[0];
        borradorActivoId = siguiente ? siguiente.id : null;
        if (window.dmdEditor) {
          window.dmdEditor.cargarBorrador(siguiente || null, false);
        }
      }
      guardarColecciones({ permitirVacio: true });
      renderizarTodo();
      mostrarUndoToast(`Se borró "${nombre}".`, respaldoUndo);
    }

    function borrarConversacion(id) {
      const conv = convsDelPropietario().find((c) => c.id === id);
      if (!conv) {
        return;
      }
      const respaldoUndo = {
        tipo: "conversacion",
        conversacion: clonar(conv),
        convActivaPrevia: convActivaId
      };
      const titulo = conv.titulo || "conversación";
      confirmandoBorrarConvId = null;

      todasConversaciones = todasConversaciones.filter((c) => c && c.id !== id);
      if (convActivaId === id) {
        convActivaId = null;
        asegurarConversacionActiva();
      }
      guardarColecciones({ permitirVacio: true });
      renderizarTodo();
      mostrarUndoToast(`Se borró la conversación "${titulo}".`, respaldoUndo);
    }

    function deshacerUltimoBorrado() {
      if (!ultimoEliminado) {
        return;
      }
      const snap = ultimoEliminado;
      ocultarUndoToast();

      if (snap.tipo === "borrador" && snap.registro) {
        if (!todosBorradores.some((b) => b && b.id === snap.registro.id)) {
          todosBorradores.unshift(snap.registro);
        }
        if (Array.isArray(snap.publicadas)) {
          snap.publicadas.forEach((p) => {
            if (p && !todasPublicadas.some((x) => x && x.slug === p.slug)) {
              todasPublicadas.unshift(p);
            }
          });
        }
        if (Array.isArray(snap.conversacionesPrevias)) {
          todasConversaciones = snap.conversacionesPrevias;
        }
        if (snap.convActivaPrevia) {
          convActivaId = snap.convActivaPrevia;
          convBorradorMemoria = null;
        }
        borradorActivoId = snap.borradorActivoPrevio || snap.registro.id;
        if (window.dmdEditor) {
          window.dmdEditor.cargarBorrador(obtenerBorradorPorId(borradorActivoId), false);
        }
        guardarColecciones();
        renderizarTodo();
        estadoChatEl.textContent = `Se restauró "${snap.registro.datos.nombre}" con su conversación.`;
      } else if (snap.tipo === "conversacion" && snap.conversacion) {
        if (!todasConversaciones.some((c) => c && c.id === snap.conversacion.id)) {
          todasConversaciones.unshift(snap.conversacion);
        }
        convActivaId = snap.convActivaPrevia || snap.conversacion.id;
        convBorradorMemoria = null;
        guardarColecciones();
        renderizarTodo();
        estadoChatEl.textContent = `Se restauró "${snap.conversacion.titulo}".`;
      }
    }

    function validarRespuestaPaso(campo, texto) {
      const limpio = gen.limpiarTexto(texto);
      if (campo === "nombre") {
        if (limpio.length < 2) {
          return { ok: false, aviso: "Escribe el nombre de tu negocio." };
        }
        const formateado =
          typeof gen.formatearNombrePropio === "function"
            ? gen.formatearNombrePropio(limpio, "nombre")
            : limpio;
        return { ok: true, valor: formateado };
      }
      if (campo === "giro") {
        if (limpio.length < 2) {
          return {
            ok: false,
            aviso: "Escribe el giro de tu negocio."
          };
        }
        const g = gen.normalizarGiro(limpio) || "otro";
        return { ok: true, valor: g, giroTexto: limpio };
      }
      if (campo === "ciudad") {
        if (limpio.length < 2) {
          return { ok: false, aviso: "Escribe la ciudad." };
        }
        const ciudadFormateada =
          typeof gen.formatearNombrePropio === "function"
            ? gen.formatearNombrePropio(limpio, "ciudad")
            : limpio;
        return { ok: true, valor: ciudadFormateada };
      }
      if (campo === "direccion") {
        if (esTextoOmision(limpio)) {
          return { ok: true, valor: "", omitido: true };
        }
        if (limpio.length < 3) {
          return {
            ok: false,
            aviso: "Escribe la calle o colonia de tu negocio, o toca Continuar sin dirección."
          };
        }
        return { ok: true, valor: limpio, omitido: false };
      }
      if (campo === "horario") {
        if (esTextoOmision(limpio)) {
          return { ok: true, valor: "", omitido: true };
        }
        if (limpio.length < 3) {
          return {
            ok: false,
            aviso: "Escribe tu horario (ej. Lunes a viernes de 9 a 6), o toca Continuar sin horario."
          };
        }
        return { ok: true, valor: limpio, omitido: false };
      }
      if (campo === "oferta") {
        const ofertaLimpia =
          typeof gen.limpiarOfertaDeRelleno === "function"
            ? gen.limpiarOfertaDeRelleno(limpio)
            : limpio;
        if (ofertaLimpia.length < 4) {
          return { ok: false, aviso: "Escribe qué productos o servicios ofreces." };
        }
        return { ok: true, valor: ofertaLimpia };
      }
      if (campo === "tono") {
        const t = gen.normalizarTono(limpio);
        if (!t) {
          return { ok: false, aviso: "Elige Cercano, Profesional o Formal." };
        }
        return { ok: true, valor: t };
      }
      if (campo === "whatsapp") {
        if (esTextoOmision(limpio)) {
          return { ok: true, valor: "", omitido: true };
        }
        const digitos = gen.limpiarDigitos(limpio);
        if (digitos.length < 10 || digitos.length > 15) {
          return {
            ok: false,
            aviso: "Escribe entre 10 y 15 dígitos (ej. 528112345678) o toca Continuar sin teléfono."
          };
        }
        return { ok: true, valor: digitos, omitido: false };
      }
      return { ok: true, valor: limpio };
    }

    function marcarBorradoresAnterioresComoTexto(conv) {
      conv.mensajes.forEach((m) => {
        if (m && m.tipo === "borrador") {
          m.tipo = "texto";
          delete m.borradorId;
        }
      });
    }

    function responderEnHiloSinEditarBorrador(conv, respuestaTexto, chipsOpcionales) {
      chipsSeguimiento = Array.isArray(chipsOpcionales) ? chipsOpcionales : [];
      conv.mensajes.push({
        id: crearId("msg"),
        rol: "asistente",
        tipo: "texto",
        texto: respuestaTexto
      });
      conv.actualizadaEn = new Date().toISOString();
      guardarColecciones();
      renderizarTodo();
    }

    async function pausarIndicadorEscritura(ms) {
      fijarEstadoGeneracion(true, "");
      await new Promise((resolve) => window.setTimeout(resolve, ms || 160));
      fijarEstadoGeneracion(false, "");
    }

    async function aplicarCambioSeguimiento(conv, texto) {
      const limpio = gen.limpiarTexto(texto);
      const registroActual = conv.borradorId ? obtenerBorradorPorId(conv.borradorId) : null;
      chipsSeguimiento = [];

      if (/^abrir\s+editor\s+visual$/i.test(limpio)) {
        if (registroActual) {
          fijarBorradorActivo(registroActual.id);
        }
        cambiarVistaApp("editor");
        return;
      }

      const clasificacion =
        typeof gen.clasificarIntencionChat === "function"
          ? gen.clasificarIntencionChat(limpio, { registro: registroActual, conv })
          : { intencion: "ambiguo", sugerencia: "cambiar el tono, agregar un servicio o ajustar el horario" };

      if (!clasificacion || clasificacion.intencion === "vacio") {
        return;
      }

      // 1) Saludos o cierres breves: responder sin modificar el borrador
      if (clasificacion.intencion === "saludo") {
        await pausarIndicadorEscritura(140);
        responderEnHiloSinEditarBorrador(
          conv,
          `Aquí sigo con la página de ${conv.datos.nombre || "tu negocio"}. Si quieres cambiar el tono, agregar productos, ajustar el horario o subir tu logo, dime qué necesitas.`,
          ["Cambiar el tono", "Abrir Editor visual"]
        );
        return;
      }

      // 2) Preguntas sobre el estado del borrador o instrucciones: NUNCA agregar texto al borrador
      if (clasificacion.intencion === "pregunta") {
        await pausarIndicadorEscritura(160);
        const tema = clasificacion.tema || "general";
        if (tema === "logo") {
          const tieneLogo = Boolean(registroActual && registroActual.diseno && registroActual.diseno.logoDataUrl);
          const msgLogo = tieneLogo
            ? "Tu logo ya está cargado en la página. Si quieres cambiarlo o quitarlo, entra a Editor visual > Diseño > Logo del negocio."
            : "Aún no has subido un logo. Puedes cargarlo en Editor visual > Diseño > Logo del negocio, y aparecerá en la parte superior de tu página.";
          responderEnHiloSinEditarBorrador(conv, msgLogo, ["Abrir Editor visual"]);
          return;
        }
        if (tema === "portada") {
          const esPropia = Boolean(
            registroActual && registroActual.diseno && registroActual.diseno.portadaOrigen === "propia"
          );
          const msgPortada = esPropia
            ? "Tu página ya usa una foto subida desde tu dispositivo. Puedes cambiarla en Editor visual o tocar Subir imagen en la tarjeta."
            : "Tu página tiene una foto sugerida para tu giro. Puedes tocar Cambiar foto o Subir imagen en el borrador, o ajustarla en Editor visual.";
          responderEnHiloSinEditarBorrador(conv, msgPortada, ["Abrir Editor visual"]);
          return;
        }
        if (tema === "whatsapp") {
          const wa = gen.limpiarDigitos(conv.datos.whatsapp || "");
          const msgWa = wa
            ? `Tu WhatsApp configurado es ${wa}. Puedes escribir otro número con lada para cambiarlo, o decir "quita el WhatsApp".`
            : "Tu página no tiene número de WhatsApp todavía. Escribe tu número con lada (ej. WhatsApp 528112345678) para activar el botón directo.";
          responderEnHiloSinEditarBorrador(conv, msgWa, wa ? ["Quitar WhatsApp"] : []);
          return;
        }
        if (tema === "horario") {
          const hor = gen.limpiarTexto(conv.datos.horario || "");
          const msgHor = hor
            ? `Tu horario actual es: ${hor}. Si quieres cambiarlo escribe "Horario: ..." con el nuevo horario.`
            : "Todavía no has indicado un horario. Escríbelo aquí (ej. Horario: Lunes a sábado de 8 a 7) para mostrarlo en tu página.";
          responderEnHiloSinEditarBorrador(conv, msgHor);
          return;
        }
        if (tema === "direccion") {
          const dir = gen.limpiarTexto(conv.datos.direccion || "");
          const msgDir = dir
            ? `Tu dirección guardada es: ${dir}. Puedes escribir "Dirección: ..." para actualizarla.`
            : `Por ahora solo aparece tu ciudad (${conv.datos.ciudad || "sin definir"}). Escribe "Dirección: ..." con tu calle o colonia si quieres mostrarla.`;
          responderEnHiloSinEditarBorrador(conv, msgDir);
          return;
        }
        if (tema === "publicar") {
          const urlPub =
            registroActual && registroActual.publicadaSlug
              ? gen.construirUrlPublicada(registroActual.publicadaSlug)
              : "";
          const msgPub = urlPub
            ? `Tu página ya está publicada en: ${urlPub}. Cada vez que edites algo, toca Actualizar para refrescar el enlace.`
            : "Para publicar tu página, toca el botón Publicar debajo de tu borrador o entra a Editor visual > Publicar.";
          responderEnHiloSinEditarBorrador(conv, msgPub, ["Abrir Editor visual"]);
          return;
        }
        if (tema === "instrucciones") {
          responderEnHiloSinEditarBorrador(
            conv,
            "Así puedes ajustar tu página desde aquí: 1) Pide cambios por chat (ej. cambia el tono, agrega un producto, cambia tu horario o quita el WhatsApp). 2) Abre Editor visual para subir tu logo, cambiar la foto o editar cada texto directo. 3) Toca Publicar cuando quieras tu enlace listo para compartir.",
            ["Cambiar el tono", "Abrir Editor visual"]
          );
          return;
        }
        if (tema === "precios") {
          responderEnHiloSinEditarBorrador(
            conv,
            "DMD nunca inventa precios por ti. Si quieres mostrar precios reales, escríbeme el producto con su monto (ej. Agrega conchas a $18) o edita cada tarjeta en Editor visual.",
            ["Abrir Editor visual"]
          );
          return;
        }
        if (tema === "tono") {
          const tonoAct = (gen.TONOS_ETIQUETAS && gen.TONOS_ETIQUETAS[conv.datos.tono]) || conv.datos.tono || "Cercano";
          responderEnHiloSinEditarBorrador(
            conv,
            `Ahora mismo el texto usa tono ${tonoAct}. ¿Quieres cambiarlo a Cercano, Profesional o Formal?`,
            ["Tono cercano", "Tono profesional", "Tono formal"]
          );
          return;
        }
        if (tema === "plantilla") {
          const tplAct = (registroActual && registroActual.diseno && registroActual.diseno.plantilla) || "clasica";
          responderEnHiloSinEditarBorrador(
            conv,
            `Tu borrador usa la plantilla ${tplAct}. Puedes elegir Clásica, Editorial o Directa sin perder tus textos.`,
            ["Plantilla Clásica", "Plantilla Editorial", "Plantilla Directa"]
          );
          return;
        }
        responderEnHiloSinEditarBorrador(
          conv,
          `Tu borrador de ${conv.datos.nombre || "tu negocio"} está guardado y listo para editar. Dime si quieres cambiar el tono, agregar un producto, ajustar el horario o abrir el Editor visual.`,
          ["Cambiar el tono", "Abrir Editor visual"]
        );
        return;
      }

      // 3) Ambiguo: nunca pegar texto literal con errores al borrador; pedir aclaración corta
      if (clasificacion.intencion === "ambiguo") {
        await pausarIndicadorEscritura(140);
        const sug = clasificacion.sugerencia || "cambiar el tono, agregar un producto o ajustar el horario";
        responderEnHiloSinEditarBorrador(
          conv,
          `No alcancé a entender del todo ese mensaje. ¿Quisiste ${sug}? Escríbemelo con un poco más de detalle y lo aplico sin tocar nada por error.`
        );
        return;
      }

      // 4) Cambios que requieren dato del usuario antes de editar o edición directa de diseño
      let cambio = "";
      let etiquetaVersion = "Actualización por chat";
      let detalleVersion = "";
      let necesitaRegenerarBorrador = true;

      if (clasificacion.intencion === "quitar") {
        const obj = clasificacion.objetivo;
        if (obj === "whatsapp") {
          conv.datos.whatsapp = "";
          cambio = "Listo, retiré el número de WhatsApp de tu borrador.";
          etiquetaVersion = "Contacto actualizado";
          detalleVersion = "Se retiró el número de WhatsApp";
        } else if (obj === "logo") {
          necesitaRegenerarBorrador = false;
          await pausarIndicadorEscritura(140);
          if (registroActual && registroActual.diseno && registroActual.diseno.logoDataUrl) {
            registroActual.diseno.logoDataUrl = "";
            registroActual.actualizadoEn = new Date().toISOString();
            sincronizarPublicada(registroActual);
            if (window.dmdEditor && borradorActivoId === registroActual.id) {
              window.dmdEditor.cargarBorrador(registroActual, false);
            }
            responderEnHiloSinEditarBorrador(conv, "Listo, quité el logo de tu página.");
          } else {
            responderEnHiloSinEditarBorrador(conv, "Tu página no tiene un logo cargado en este momento.");
          }
          return;
        } else if (obj === "portada") {
          necesitaRegenerarBorrador = false;
          await pausarIndicadorEscritura(140);
          if (registroActual) {
            registroActual.diseno = registroActual.diseno || {};
            registroActual.diseno.portadaOrigen = "ninguna";
            registroActual.diseno.portadaDataUrl = "";
            registroActual.actualizadoEn = new Date().toISOString();
            sincronizarPublicada(registroActual);
            if (window.dmdEditor && borradorActivoId === registroActual.id) {
              window.dmdEditor.cargarBorrador(registroActual, false);
            }
            responderEnHiloSinEditarBorrador(conv, "Listo, oculté la foto de portada de tu página.");
          }
          return;
        } else if (obj === "horario") {
          conv.datos.horario = "";
          cambio = "Listo, quité el horario del borrador.";
          etiquetaVersion = "Horario retirado";
          detalleVersion = "Se quitó el horario guardado";
        } else if (obj === "direccion") {
          conv.datos.direccion = "";
          cambio = "Listo, quité la calle o colonia del borrador.";
          etiquetaVersion = "Dirección retirada";
          detalleVersion = "Se quitó la dirección guardada";
        } else if (obj === "servicio" && clasificacion.valor) {
          const objetivoNorm = clasificacion.valor
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
          const partes = String(conv.datos.oferta || "")
            .split(/[,;\n]+/)
            .map((p) => p.trim())
            .filter(Boolean);
          const restantes = partes.filter((p) => {
            const pNorm = p
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            return !pNorm.includes(objetivoNorm);
          });
          if (restantes.length === partes.length || restantes.length === 0) {
            await pausarIndicadorEscritura(140);
            responderEnHiloSinEditarBorrador(
              conv,
              restantes.length === 0
                ? "Tu página necesita al menos un producto o servicio. Puedes editar la lista completa en Editor visual."
                : `No encontré "${clasificacion.valor}" en tu lista actual (${conv.datos.oferta || "vacía"}). Dime el nombre exacto o ajústalo en Editor visual.`,
              ["Abrir Editor visual"]
            );
            return;
          }
          conv.datos.oferta = restantes.join(", ");
          cambio = `Listo, quité "${clasificacion.valor}" de tu oferta. Borrador actualizado.`;
          etiquetaVersion = `Quitó: ${clasificacion.valor.slice(0, 24)}`;
          detalleVersion = `Se retiró "${clasificacion.valor}"`;
        }
      } else if (clasificacion.intencion === "cambiar") {
        const obj = clasificacion.objetivo;
        if (obj === "tono") {
          if (!clasificacion.valor) {
            await pausarIndicadorEscritura(140);
            responderEnHiloSinEditarBorrador(
              conv,
              "¿A qué tono quieres cambiar tu página? Elige una opción:",
              ["Tono cercano", "Tono profesional", "Tono formal"]
            );
            return;
          }
          conv.datos.tono = gen.normalizarTono(clasificacion.valor);
          const tonoEtq = (gen.TONOS_ETIQUETAS && gen.TONOS_ETIQUETAS[conv.datos.tono]) || conv.datos.tono;
          cambio = `Tono cambiado a ${tonoEtq}. Borrador actualizado.`;
          etiquetaVersion = `Tono ${tonoEtq}`;
          detalleVersion = `Se cambió el tono de la redacción a ${tonoEtq}`;
        } else if (obj === "plantilla") {
          necesitaRegenerarBorrador = false;
          if (!clasificacion.valor) {
            await pausarIndicadorEscritura(140);
            responderEnHiloSinEditarBorrador(
              conv,
              "¿Qué plantilla prefieres probar? Tus textos y fotos se conservan:",
              ["Plantilla Clásica", "Plantilla Editorial", "Plantilla Directa"]
            );
            return;
          }
          await pausarIndicadorEscritura(160);
          if (registroActual) {
            registroActual.diseno = registroActual.diseno || {};
            registroActual.diseno.plantilla = clasificacion.valor;
            registroActual.actualizadoEn = new Date().toISOString();
            sincronizarPublicada(registroActual);
            if (window.dmdEditor && borradorActivoId === registroActual.id) {
              window.dmdEditor.cargarBorrador(registroActual, false);
            }
            const etqTpl =
              clasificacion.valor === "editorial"
                ? "Editorial"
                : clasificacion.valor === "directa"
                  ? "Directa"
                  : "Clásica";
            responderEnHiloSinEditarBorrador(
              conv,
              `Listo, cambié el diseño a la plantilla ${etqTpl}. Puedes ver el resultado en Editor visual.`,
              ["Abrir Editor visual"]
            );
          }
          return;
        } else if (obj === "precios_sin_monto") {
          await pausarIndicadorEscritura(150);
          responderEnHiloSinEditarBorrador(
            conv,
            "No invento precios para tu negocio. Dime qué productos y cuánto cuestan (por ejemplo: Agrega conchas a $18) y los muestro exactamente como me indiques."
          );
          return;
        } else if (obj === "horario_destacado") {
          const horActual = gen.limpiarTexto(conv.datos.horario || "");
          if (!horActual) {
            await pausarIndicadorEscritura(150);
            responderEnHiloSinEditarBorrador(
              conv,
              "Aún no has guardado un horario. Escríbelo aquí (por ejemplo: Horario: Lunes a sábado de 8 a 7) y lo destaco al principio de tu página."
            );
            return;
          }
          necesitaRegenerarBorrador = false;
          await pausarIndicadorEscritura(160);
          if (registroActual && registroActual.borrador) {
            const prefijoHor = `Horario: ${horActual}.`;
            if (!String(registroActual.borrador.presentacion || "").toLowerCase().includes(horActual.toLowerCase())) {
              registroActual.borrador.presentacion = `${prefijoHor} ${registroActual.borrador.presentacion || ""}`.trim();
            } else if (!String(registroActual.borrador.presentacion || "").startsWith("Horario:")) {
              registroActual.borrador.presentacion = `${prefijoHor} ${registroActual.borrador.presentacion || ""}`.trim();
            }
            registroActual.actualizadoEn = new Date().toISOString();
            sincronizarPublicada(registroActual);
            if (window.dmdEditor && borradorActivoId === registroActual.id) {
              window.dmdEditor.cargarBorrador(registroActual, false);
            }
            responderEnHiloSinEditarBorrador(
              conv,
              `Listo, puse tu horario (${horActual}) bien visible al inicio de la presentación.`
            );
          }
          return;
        } else if (obj === "horario" && clasificacion.valor) {
          conv.datos.horario = clasificacion.valor;
          cambio = `Horario actualizado a "${clasificacion.valor}". Borrador actualizado.`;
          etiquetaVersion = "Horario actualizado";
          detalleVersion = `Horario: ${clasificacion.valor.slice(0, 48)}`;
        } else if (obj === "horario_pedir") {
          await pausarIndicadorEscritura(140);
          responderEnHiloSinEditarBorrador(
            conv,
            "Escribe tu horario real (por ejemplo: Horario: Lunes a sábado de 8 a 7) y lo actualizo en tu página."
          );
          return;
        } else if (obj === "direccion" && clasificacion.valor) {
          conv.datos.direccion = clasificacion.valor;
          cambio = `Dirección actualizada a "${clasificacion.valor}". Borrador actualizado.`;
          etiquetaVersion = "Dirección actualizada";
          detalleVersion = `Dirección: ${clasificacion.valor.slice(0, 48)}`;
        } else if (obj === "direccion_pedir") {
          await pausarIndicadorEscritura(140);
          responderEnHiloSinEditarBorrador(
            conv,
            "Escribe la calle o colonia de tu negocio (por ejemplo: Dirección: Av. Colón 210, col. Americana) y la agrego a tu página."
          );
          return;
        } else if (obj === "whatsapp" && clasificacion.valor) {
          conv.datos.whatsapp = clasificacion.valor;
          cambio = `WhatsApp actualizado: ${clasificacion.valor}. Borrador actualizado.`;
          etiquetaVersion = "WhatsApp actualizado";
          detalleVersion = `Número configurado: ${clasificacion.valor}`;
        } else if (obj === "portada") {
          necesitaRegenerarBorrador = false;
          await pausarIndicadorEscritura(160);
          if (registroActual && typeof gen.obtenerSiguientePortada === "function") {
            const sig = gen.obtenerSiguientePortada(
              registroActual.datos,
              registroActual.diseno && registroActual.diseno.portadaIndice,
              registroActual.diseno && registroActual.diseno.portadaDataUrl
            );
            if (sig && sig.url && window.dmdEditor && typeof window.dmdEditor.aplicarPortadaEnRegistro === "function") {
              window.dmdEditor.aplicarPortadaEnRegistro(registroActual, sig);
              registroActual.actualizadoEn = new Date().toISOString();
              sincronizarPublicada(registroActual);
              if (borradorActivoId === registroActual.id) {
                window.dmdEditor.cargarBorrador(registroActual, false);
              }
              responderEnHiloSinEditarBorrador(
                conv,
                "Listo, cambié la foto de portada por otra opción de tu giro. También puedes subir una foto propia en Editor visual.",
                ["Abrir Editor visual"]
              );
              return;
            }
          }
          responderEnHiloSinEditarBorrador(
            conv,
            "Puedes cambiar o subir una foto propia desde el botón Subir imagen en tu borrador o en Editor visual.",
            ["Abrir Editor visual"]
          );
          return;
        } else if (obj === "ciudad" && clasificacion.valor) {
          conv.datos.ciudad = clasificacion.valor;
          cambio = `Ciudad actualizada a ${clasificacion.valor}. Borrador actualizado.`;
          etiquetaVersion = `Ciudad: ${clasificacion.valor}`;
          detalleVersion = `Ubicación cambiada a ${clasificacion.valor}`;
        } else if (obj === "nombre" && clasificacion.valor) {
          conv.datos.nombre = clasificacion.valor;
          cambio = `Nombre actualizado a ${clasificacion.valor}. Borrador actualizado.`;
          etiquetaVersion = `Nombre: ${clasificacion.valor}`;
          detalleVersion = `Se cambió el nombre del negocio a ${clasificacion.valor}`;
        }
      } else if (clasificacion.intencion === "agregar" && clasificacion.valor) {
        const extra =
          typeof gen.limpiarOfertaDeRelleno === "function"
            ? gen.limpiarOfertaDeRelleno(clasificacion.valor)
            : clasificacion.valor;
        if (extra.length < 2) {
          await pausarIndicadorEscritura(140);
          responderEnHiloSinEditarBorrador(
            conv,
            "Dime qué producto o servicio quieres agregar (por ejemplo: Agrega tacos al pastor)."
          );
          return;
        }
        conv.datos.oferta = conv.datos.oferta ? `${conv.datos.oferta}, ${extra}` : extra;
        cambio = `Listo, agregué "${extra}" a tu oferta. Borrador actualizado.`;
        etiquetaVersion = `Agregó: ${extra.slice(0, 28)}`;
        detalleVersion = `Se añadió "${extra}" a la lista de oferta`;
      }

      if (!cambio || !necesitaRegenerarBorrador) {
        await pausarIndicadorEscritura(140);
        responderEnHiloSinEditarBorrador(
          conv,
          "No alcancé a identificar el ajuste exacto. Dime si quieres cambiar el tono, agregar un servicio, cambiar el horario o quitar el WhatsApp."
        );
        return;
      }

      const varianteActual =
        registroActual && registroActual.borrador ? registroActual.borrador.variante || 0 : 0;

      fijarEstadoGeneracion(true, "Actualizando tu borrador...");
      mostrarErrorChat("");
      try {
        const { registro: actualizado } = await guardarOActualizarBorradorDesdeConv(
          conv,
          varianteActual,
          etiquetaVersion,
          detalleVersion
        );

        // Agrupar en un solo borrador por conversación: mensajes previos pasan a texto simple
        marcarBorradoresAnterioresComoTexto(conv);

        conv.mensajes.push({
          id: crearId("msg"),
          rol: "asistente",
          tipo: "borrador",
          texto: cambio,
          borradorId: actualizado.id
        });
        guardarColecciones();
      } catch (error) {
        mostrarErrorChat(
          "No se pudo actualizar el borrador en este intento. Puedes reintentar ahora.",
          () => aplicarCambioSeguimiento(conv, texto)
        );
      } finally {
        fijarEstadoGeneracion(false, "");
        renderizarTodo();
      }
    }

    async function enviarMensajeUsuario(textoCrudo) {
      if (generandoAhora) {
        return;
      }
      const conv = obtenerConvActiva() || asegurarConversacionActiva();
      const texto = gen.limpiarTexto(textoCrudo);
      if (!texto) {
        return;
      }

      mostrarErrorChat("");

      if (!todasConversaciones.some((c) => c && c.id === conv.id)) {
        todasConversaciones.unshift(conv);
        convActivaId = conv.id;
        convBorradorMemoria = null;
      }

      entradaChat.value = "";
      entradaChat.style.height = "auto";
      estadoChatEl.textContent = "";

      // Si estamos en paso guiado
      if (conv.pasoIndice < PASOS.length) {
        const paso = PASOS[conv.pasoIndice];
        const validacion = validarRespuestaPaso(paso.campo, texto);

        // Si en un paso opcional (dirección, horario o WhatsApp) se omite, guardar vacío sin mostrar "Omitir" ni "Continuar sin..." en el chat
        const esPasoOpcional =
          paso.campo === "whatsapp" || paso.campo === "direccion" || paso.campo === "horario";
        const omitioOpcional = esPasoOpcional && validacion.ok && validacion.omitido;
        if (!omitioOpcional) {
          let textoBurbuja = texto;
          if (validacion.ok && (paso.campo === "nombre" || paso.campo === "ciudad")) {
            textoBurbuja = validacion.valor;
          } else if (validacion.ok && paso.campo === "oferta" && /^[a-záéíóúñü]/.test(texto)) {
            textoBurbuja = texto.charAt(0).toUpperCase() + texto.slice(1);
          }
          conv.mensajes.push({
            id: crearId("msg"),
            rol: "usuario",
            tipo: "texto",
            campo: paso.campo,
            texto: textoBurbuja
          });
        }

        if (!validacion.ok) {
          conv.mensajes.push({
            id: crearId("msg"),
            rol: "asistente",
            tipo: "texto",
            texto: validacion.aviso
          });
          conv.actualizadaEn = new Date().toISOString();
          guardarColecciones();
          renderizarHilo({ scrollSuave: true, forzarScroll: true });
          return;
        }

        conv.datos[paso.campo] = validacion.valor;
        if (paso.campo === "giro") {
          conv.datos.giroTexto = validacion.giroTexto || texto;
        }
        if (paso.campo === "nombre") {
          conv.titulo = validacion.valor;
        }
        conv.pasoIndice += 1;

        if (conv.pasoIndice < PASOS.length) {
          conv.mensajes.push({
            id: crearId("msg"),
            rol: "asistente",
            tipo: "texto",
            texto: PASOS[conv.pasoIndice].pregunta
          });
          conv.actualizadaEn = new Date().toISOString();
          guardarColecciones();
          renderizarTodo({ scrollSuave: true, forzarScroll: true });
          return;
        }

        // Completó los pasos: generar borrador con indicador de escritura
        fijarEstadoGeneracion(true, "Armando el borrador de tu página...");
        try {
          const { registro, origen } = await guardarOActualizarBorradorDesdeConv(
            conv,
            0,
            "Versión inicial",
            `Borrador inicial de ${conv.datos.nombre}`
          );
          marcarBorradoresAnterioresComoTexto(conv);
          conv.mensajes.push({
            id: crearId("msg"),
            rol: "asistente",
            tipo: "borrador",
            texto: `Borrador listo para ${registro.datos.nombre}. Puedes revisarlo aquí, pedir ajustes o abrir el Editor visual.`,
            borradorId: registro.id
          });
          guardarColecciones();
          fijarEstadoGeneracion(
            false,
            origen === "local"
              ? "Borrador listo y guardado en este navegador."
              : "Borrador listo y guardado."
          );
          renderizarTodo({ scrollSuave: true, forzarScroll: true });
        } catch (error) {
          conv.pasoIndice = PASOS.length - 1;
          fijarEstadoGeneracion(false, "");
          mostrarErrorChat(
            "Hubo un problema al armar tu borrador. Intenta de nuevo.",
            () => enviarMensajeUsuario(texto)
          );
          renderizarTodo({ scrollSuave: true, forzarScroll: true });
        }
        return;
      }

      // Conversación ya completada: ignorar solo "Omitir" / "Continuar sin..." literales
      if (esTextoOmision(texto)) {
        estadoChatEl.textContent =
          "Tu borrador ya está listo. Escribe una pregunta o un ajuste concreto (ej. cambia el tono o agrega un producto).";
        return;
      }

      // Chip directo para ir al editor sin ensuciar el historial
      if (/^abrir\s+editor\s+visual$/i.test(texto)) {
        chipsSeguimiento = [];
        await aplicarCambioSeguimiento(conv, texto);
        return;
      }

      conv.mensajes.push({
        id: crearId("msg"),
        rol: "usuario",
        tipo: "texto",
        texto
      });
      renderizarHilo({ scrollSuave: true, forzarScroll: true });
      await aplicarCambioSeguimiento(conv, texto);
      desplazarChatAlFinal({ suave: true, forzar: true });
    }

    async function guardarEdicionMensajeUsuario(conv, msg, nuevoTexto) {
      if (generandoAhora) {
        return;
      }
      const limpio = gen.limpiarTexto(nuevoTexto);
      if (!limpio) {
        return;
      }
      if (msg.campo) {
        const val = validarRespuestaPaso(msg.campo, limpio);
        if (!val.ok) {
          estadoChatEl.textContent = val.aviso;
          return;
        }
        if (msg.campo === "whatsapp" && val.omitido) {
          conv.mensajes = conv.mensajes.filter((m) => m && m.id !== msg.id);
        } else {
          msg.texto =
            msg.campo === "nombre" || msg.campo === "ciudad" ? val.valor : limpio;
        }
        conv.datos[msg.campo] = val.valor;
        if (msg.campo === "giro") {
          conv.datos.giroTexto = val.giroTexto || limpio;
        }
        if (msg.campo === "nombre") {
          conv.titulo = val.valor;
        }
        if (conv.borradorId) {
          const existente = obtenerBorradorPorId(conv.borradorId);
          const v = existente && existente.borrador ? existente.borrador.variante || 0 : 0;
          fijarEstadoGeneracion(true, "Actualizando borrador...");
          try {
            await guardarOActualizarBorradorDesdeConv(
              conv,
              v,
              `Editó ${msg.campo} en chat`,
              `${msg.campo}: ${String(val.valor || "").slice(0, 48)}`
            );
          } finally {
            fijarEstadoGeneracion(false, "Actualizado.");
          }
        }
      } else {
        msg.texto = limpio;
      }

      editandoMsgId = null;
      conv.actualizadaEn = new Date().toISOString();
      guardarColecciones();
      estadoChatEl.textContent = "Actualizado.";
      renderizarTodo();
    }

    function construirTarjetaBorradorEnChat(registro) {
      if (window.dmdEditor && typeof window.dmdEditor.asegurarEstructuraBorrador === "function") {
        window.dmdEditor.asegurarEstructuraBorrador(registro);
      }
      const { datos, borrador } = registro;
      const diseno = registro.diseno || {};
      const estructura =
        (borrador && borrador.estructura) ||
        (typeof gen.obtenerEstructuraNegocio === "function"
          ? gen.obtenerEstructuraNegocio(datos)
          : null);
      const titulosSec = (estructura && estructura.titulos) || {};
      const ordenSec =
        (Array.isArray(diseno.ordenSecciones) && diseno.ordenSecciones.length && diseno.ordenSecciones) ||
        (estructura && Array.isArray(estructura.ordenSecciones) && estructura.ordenSecciones) ||
        ["presentacion", "servicios", "beneficios", "preguntas", "contacto"];

      const card = document.createElement("div");
      card.className = "chat-draft-wrap";

      const claseVisualGiro = (estructura && estructura.claseVisual) || "otro";
      const frame = document.createElement("article");
      frame.className = `preview-frame biz-giro-${claseVisualGiro}`;
      frame.dataset.giro = claseVisualGiro;
      frame.setAttribute("aria-label", `Borrador de ${datos.nombre}`);

      const topbar = document.createElement("div");
      topbar.className = "preview-topbar";
      const nEl = document.createElement("span");
      nEl.className = "preview-topbar-name";
      nEl.textContent = datos.nombre;
      const cEl = document.createElement("span");
      cEl.textContent = datos.ciudad;
      topbar.appendChild(nEl);
      topbar.appendChild(cEl);
      frame.appendChild(topbar);

      const body = document.createElement("div");
      body.className = "preview-body";

      const portadaUrl =
        diseno.portadaOrigen === "ninguna"
          ? ""
          : diseno.portadaDataUrl || (borrador.portada && borrador.portada.url) || "";
      const portadaAlt =
        diseno.portadaAlt ||
        (borrador.portada && borrador.portada.alt) ||
        `Portada de ${datos.nombre}`;

      const persistirPortadaChat = (nuevaPortada, etiquetaVer, mensajeEstado) => {
        if (window.dmdEditor && typeof window.dmdEditor.aplicarPortadaEnRegistro === "function") {
          window.dmdEditor.aplicarPortadaEnRegistro(registro, nuevaPortada);
        } else {
          registro.diseno = registro.diseno || {};
          registro.diseno.portadaDataUrl = nuevaPortada ? nuevaPortada.url : "";
          registro.diseno.portadaAlt = nuevaPortada ? nuevaPortada.alt : "";
          registro.diseno.portadaOrigen = nuevaPortada ? nuevaPortada.origen : "ninguna";
          if (nuevaPortada && Number.isInteger(nuevaPortada.indice)) {
            registro.diseno.portadaIndice = nuevaPortada.indice;
          }
        }
        registro.actualizadoEn = new Date().toISOString();
        if (window.dmdEditor && typeof window.dmdEditor.registrarVersion === "function") {
          window.dmdEditor.registrarVersion(
            registro,
            etiquetaVer,
            (nuevaPortada && nuevaPortada.etiqueta) || "Portada actualizada desde el chat"
          );
        }
        sincronizarPublicada(registro);
        guardarColecciones();
        if (window.dmdEditor && borradorActivoId === registro.id) {
          window.dmdEditor.cargarBorrador(registro, false);
        }
        estadoChatEl.textContent = mensajeEstado;
        renderizarHilo();
      };

      ordenSec.forEach((secId) => {
        if (secId === "presentacion") {
          const hero = document.createElement("div");
          hero.className = "preview-hero";

          if (portadaUrl) {
            const fig = document.createElement("figure");
            fig.className = "preview-cover-wrap";
            const img = document.createElement("img");
            img.className = "preview-cover-img";
            img.src = portadaUrl;
            img.alt = portadaAlt;
            img.decoding = "async";
            img.addEventListener("error", () => {
              fig.classList.add("cover-fallback");
              img.hidden = true;
            });
            fig.appendChild(img);
            if (estructura && estructura.sticker && typeof gen.crearStickerElemento === "function") {
              const stickerEl = gen.crearStickerElemento(estructura.sticker);
              if (stickerEl) {
                fig.appendChild(stickerEl);
              }
            }
            hero.appendChild(fig);
          }

          const barraPortada = document.createElement("div");
          barraPortada.className = "draft-cover-bar";

          const btnCambiarFoto = document.createElement("button");
          btnCambiarFoto.type = "button";
          btnCambiarFoto.className = "btn btn-secondary btn-sm";
          btnCambiarFoto.dataset.chatAction = "cambiar-portada";
          btnCambiarFoto.textContent = portadaUrl ? "Cambiar foto" : "Elegir foto";
          btnCambiarFoto.addEventListener("click", () => {
            if (typeof gen.obtenerSiguientePortada !== "function") {
              return;
            }
            const siguiente = gen.obtenerSiguientePortada(
              registro.datos,
              registro.diseno && registro.diseno.portadaIndice,
              registro.diseno && registro.diseno.portadaDataUrl
            );
            if (!siguiente || !siguiente.url) {
              return;
            }
            persistirPortadaChat(siguiente, "Foto de portada", "Portada cambiada.");
          });

          const idSubir = `chat-subir-portada-${registro.id}`;
          const lblSubir = document.createElement("label");
          lblSubir.className = "btn btn-secondary btn-sm upload-label";
          lblSubir.htmlFor = idSubir;
          lblSubir.textContent = "Subir imagen";

          const inpSubir = document.createElement("input");
          inpSubir.id = idSubir;
          inpSubir.type = "file";
          inpSubir.accept = "image/*";
          inpSubir.hidden = true;
          inpSubir.dataset.chatAction = "subir-portada";
          inpSubir.addEventListener("change", async () => {
            const archivo = inpSubir.files && inpSubir.files[0];
            if (!archivo) {
              return;
            }
            if (
              typeof gen.esArchivoImagenValido === "function" &&
              !gen.esArchivoImagenValido(archivo)
            ) {
              estadoChatEl.textContent = "Solo se permiten imágenes.";
              inpSubir.value = "";
              return;
            }
            try {
              const dataUrl =
                typeof gen.comprimirImagenArchivo === "function"
                  ? await gen.comprimirImagenArchivo(archivo, 720)
                  : "";
              if (!dataUrl) {
                estadoChatEl.textContent = "No se pudo leer la imagen.";
                return;
              }
              persistirPortadaChat(
                {
                  url: dataUrl,
                  alt: `Imagen principal de ${registro.datos.nombre}`,
                  origen: "propia",
                  giro: (registro.diseno && registro.diseno.portadaGiro) || registro.datos.giro,
                  indice: (registro.diseno && registro.diseno.portadaIndice) || 0
                },
                "Imagen de portada",
                "Imagen guardada en el borrador."
              );
            } catch (error) {
              estadoChatEl.textContent = "Solo se permiten imágenes válidas.";
            } finally {
              inpSubir.value = "";
            }
          });

          barraPortada.appendChild(btnCambiarFoto);
          barraPortada.appendChild(lblSubir);
          barraPortada.appendChild(inpSubir);
          hero.appendChild(barraPortada);

          const h3 = document.createElement("h3");
          h3.className = "preview-title";
          h3.textContent = borrador.titulo;
          const p = document.createElement("p");
          p.className = "preview-intro";
          p.textContent = borrador.presentacion;
          hero.appendChild(h3);
          hero.appendChild(p);
          body.appendChild(hero);
        }

        if (secId === "servicios") {
          const bServ = document.createElement("div");
          bServ.className = "preview-block";
          const hs = document.createElement("h4");
          hs.className = "preview-block-title";
          hs.textContent = titulosSec.servicios || "Servicios";
          const ulS = document.createElement("ul");
          ulS.className = "preview-services";
          borrador.servicios.forEach((s) => {
            const li = document.createElement("li");
            li.className = "preview-service-item";
            const st = document.createElement("p");
            st.className = "preview-service-title";
            st.textContent = s.titulo;
            li.appendChild(st);
            if (s.descripcion) {
              const sd = document.createElement("p");
              sd.className = "preview-service-desc";
              sd.textContent = s.descripcion;
              li.appendChild(sd);
            }
            ulS.appendChild(li);
          });
          bServ.appendChild(hs);
          bServ.appendChild(ulS);
          body.appendChild(bServ);
        }

        if (secId === "beneficios") {
          const bBen = document.createElement("div");
          bBen.className = "preview-block";
          const hb = document.createElement("h4");
          hb.className = "preview-block-title";
          hb.textContent = titulosSec.beneficios || "Beneficios";
          const ulB = document.createElement("ul");
          ulB.className = "preview-benefits";
          (Array.isArray(borrador.beneficios) ? borrador.beneficios : []).forEach((b) => {
            const li = document.createElement("li");
            li.className = "preview-benefit-item";
            li.appendChild(crearIconoCheck());
            const sp = document.createElement("span");
            sp.textContent = b;
            li.appendChild(sp);
            ulB.appendChild(li);
          });
          bBen.appendChild(hb);
          bBen.appendChild(ulB);
          body.appendChild(bBen);
        }

        if (secId === "preguntas") {
          const bFaq = document.createElement("div");
          bFaq.className = "preview-block";
          const hf = document.createElement("h4");
          hf.className = "preview-block-title";
          hf.textContent = titulosSec.preguntas || "Preguntas frecuentes";
          const listF = document.createElement("div");
          listF.className = "faq-list";
          (Array.isArray(borrador.preguntasFrecuentes) ? borrador.preguntasFrecuentes : []).forEach((f, idx) => {
            const d = document.createElement("details");
            d.className = "faq-item";
            if (idx === 0) {
              d.open = true;
            }
            const sum = document.createElement("summary");
            sum.className = "faq-question";
            sum.textContent = f.pregunta;
            const ans = document.createElement("p");
            ans.className = "faq-answer";
            ans.textContent = f.respuesta;
            d.appendChild(sum);
            d.appendChild(ans);
            listF.appendChild(d);
          });
          bFaq.appendChild(hf);
          bFaq.appendChild(listF);
          body.appendChild(bFaq);
        }

        if (secId === "contacto") {
          const bWa = document.createElement("div");
          bWa.className = "preview-cta-box";
          const waLimpio = gen.limpiarDigitos(datos.whatsapp);
          if (waLimpio) {
            const a = document.createElement("a");
            a.className = "btn btn-primary btn-full";
            a.href = gen.construirUrlWhatsapp(waLimpio, borrador.mensajeWhatsapp);
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.appendChild(crearIconoWhatsapp());
            const sp = document.createElement("span");
            sp.textContent =
              (estructura && estructura.ctaWhatsapp) || `Enviar WhatsApp a ${datos.nombre}`;
            a.appendChild(sp);
            bWa.appendChild(a);
          } else {
            const cardLoc = document.createElement("div");
            cardLoc.className = "biz-location-card";
            const pLoc = document.createElement("p");
            pLoc.className = "biz-location-title";
            pLoc.textContent = datos.nombre;
            const pSub = document.createElement("p");
            pSub.className = "biz-location-sub";
            pSub.textContent =
              (estructura && estructura.notaContactoSinWhatsapp) ||
              `Atención directa en ${datos.ciudad}.`;
            cardLoc.appendChild(pLoc);
            cardLoc.appendChild(pSub);
            bWa.appendChild(cardLoc);
          }
          body.appendChild(bWa);
        }
      });
      frame.appendChild(body);
      card.appendChild(frame);

      // Barra de acciones del borrador (una sola vez por conversación)
      const acciones = document.createElement("div");
      acciones.className = "draft-chat-actions";

      const btnEditarVis = document.createElement("button");
      btnEditarVis.type = "button";
      btnEditarVis.className = "btn btn-primary btn-sm";
      btnEditarVis.dataset.chatAction = "abrir-editor";
      btnEditarVis.textContent = "Editar";
      btnEditarVis.addEventListener("click", () => {
        fijarBorradorActivo(registro.id);
        cambiarModo("editor");
      });

      const btnRegenerar = document.createElement("button");
      btnRegenerar.type = "button";
      btnRegenerar.className = "btn btn-secondary btn-sm";
      btnRegenerar.dataset.chatAction = "regenerar";
      btnRegenerar.disabled = generandoAhora;
      btnRegenerar.textContent = "Regenerar";
      btnRegenerar.addEventListener("click", async () => {
        if (generandoAhora) {
          return;
        }
        const conv = obtenerConvActiva();
        if (!conv) {
          return;
        }
        const sigVar = ((registro.borrador && registro.borrador.variante) || 0) + 1;
        conv.datos = clonar(registro.datos);
        fijarEstadoGeneracion(true, "Generando nueva versión del borrador...");
        try {
          await guardarOActualizarBorradorDesdeConv(
            conv,
            sigVar,
            `Regenerado (opción ${sigVar + 1})`,
            "Nueva variación de textos y portada"
          );
          fijarEstadoGeneracion(false, "Borrador regenerado.");
        } catch (error) {
          fijarEstadoGeneracion(false, "");
          mostrarErrorChat("No se pudo regenerar el borrador. Intenta de nuevo.");
        }
        renderizarTodo();
      });

      const btnCopiar = document.createElement("button");
      btnCopiar.type = "button";
      btnCopiar.className = "btn btn-secondary btn-sm";
      btnCopiar.dataset.chatAction = "copiar";
      btnCopiar.textContent = "Copiar";
      btnCopiar.addEventListener("click", () => {
        const plano = gen.formatearTextoPlano(registro.datos, registro.borrador);
        copiarTexto(plano).then((ok) => {
          estadoChatEl.textContent = ok ? "Texto copiado." : "No se pudo copiar.";
        });
      });

      const btnDuplicar = document.createElement("button");
      btnDuplicar.type = "button";
      btnDuplicar.className = "btn btn-secondary btn-sm";
      btnDuplicar.dataset.chatAction = "duplicar";
      btnDuplicar.textContent = "Duplicar";
      btnDuplicar.addEventListener("click", () => duplicarBorrador(registro));

      const btnPublicar = document.createElement("button");
      btnPublicar.type = "button";
      btnPublicar.className = "btn btn-secondary btn-sm";
      btnPublicar.dataset.chatAction = "publicar";
      btnPublicar.textContent = registro.publicadaSlug ? "Actualizar" : "Publicar";
      btnPublicar.addEventListener("click", () => {
        const url = publicarBorrador(registro);
        if (url) {
          estadoChatEl.textContent = "Página publicada. Ya puedes copiar el enlace.";
        }
      });

      acciones.appendChild(btnEditarVis);
      acciones.appendChild(btnRegenerar);
      acciones.appendChild(btnCopiar);
      acciones.appendChild(btnDuplicar);
      acciones.appendChild(btnPublicar);
      card.appendChild(acciones);

      if (registro.publicadaSlug) {
        const rutaVer = `ver.html?id=${encodeURIComponent(registro.publicadaSlug)}`;
        const urlPub = gen.construirUrlPublicada(registro.publicadaSlug);
        const boxPub = document.createElement("div");
        boxPub.className = "published-box published-box-inline";

        const lbl = document.createElement("p");
        lbl.className = "published-label";
        lbl.textContent = "Página publicada";
        const urlP = document.createElement("p");
        urlP.className = "published-url-text";
        urlP.textContent = urlPub;

        const row = document.createElement("div");
        row.className = "published-actions-grid";

        const aVer = document.createElement("a");
        aVer.className = "btn btn-primary btn-sm";
        aVer.href = rutaVer;
        aVer.dataset.chatAction = "ver-publicada";
        aVer.textContent = "Ver página";

        const bCop = document.createElement("button");
        bCop.type = "button";
        bCop.className = "btn btn-secondary btn-sm";
        bCop.dataset.chatAction = "copiar-enlace";
        bCop.textContent = "Copiar enlace";
        bCop.addEventListener("click", () => {
          copiarTexto(urlPub).then((ok) => {
            estadoChatEl.textContent = ok ? "Enlace copiado." : "No se pudo copiar.";
          });
        });

        const aComp = document.createElement("a");
        aComp.className = "btn btn-secondary btn-sm";
        aComp.href = `https://wa.me/?text=${encodeURIComponent(
          `Te comparto la página de ${datos.nombre}: ${urlPub}`
        )}`;
        aComp.target = "_blank";
        aComp.rel = "noopener noreferrer";
        aComp.textContent = "Compartir WhatsApp";

        const aPago = document.createElement("a");
        aPago.className = "btn btn-secondary btn-sm";
        aPago.href = `pago.html?borrador=${encodeURIComponent(registro.id)}`;
        aPago.textContent = "Activar plan";

        row.appendChild(aVer);
        row.appendChild(bCop);
        row.appendChild(aComp);
        row.appendChild(aPago);

        boxPub.appendChild(lbl);
        boxPub.appendChild(urlP);
        boxPub.appendChild(row);
        card.appendChild(boxPub);
      }

      return card;
    }

    function renderizarProgresoChat(conv) {
      if (!progresoTexto || !progresoPaso || !progresoBarra) {
        return;
      }
      if (!conv) {
        return;
      }
      const total = PASOS.length;
      if (conv.pasoIndice < total) {
        const paso = PASOS[conv.pasoIndice];
        const num = conv.pasoIndice + 1;
        progresoTexto.textContent = `Paso ${num} de ${total} · ${paso.etiqueta}`;
        progresoPaso.textContent = `${num}/${total}`;
        progresoBarra.style.width = `${Math.round((num / total) * 100)}%`;
      } else {
        progresoTexto.textContent = conv.borradorId
          ? "Borrador listo · Escribe un ajuste o ábrelo en el Editor visual"
          : "Datos completos";
        progresoPaso.textContent = "Listo";
        progresoBarra.style.width = "100%";
      }
    }

    function desplazarChatAlFinal(opciones) {
      if (vistaActual !== "chat" || !hilo) {
        return;
      }
      const suave = Boolean(opciones && opciones.suave);
      const forzar = Boolean(opciones && opciones.forzar);
      const comportamiento = suave ? "smooth" : "auto";

      const ejecutar = () => {
        if (vistaActual !== "chat" || !hilo) {
          return;
        }
        if (hilo.scrollHeight > hilo.clientHeight + 2) {
          hilo.scrollTop = hilo.scrollHeight;
        }
        const ultimo = hilo.lastElementChild;
        if (!ultimo) {
          return;
        }

        const vvHeight =
          window.visualViewport && Number.isFinite(window.visualViewport.height)
            ? window.visualViewport.height
            : window.innerHeight;
        const vvOffsetTop =
          window.visualViewport && Number.isFinite(window.visualViewport.offsetTop)
            ? window.visualViewport.offsetTop
            : 0;
        const topbar = document.querySelector(".app-topbar");
        const composer = document.querySelector(".chat-composer-shell");
        const bottomNav = document.getElementById("app-bottom-nav");
        const alturaTopbar = topbar ? topbar.getBoundingClientRect().height : 58;
        const alturaComposer = composer ? composer.getBoundingClientRect().height : 72;
        const alturaBottomNav = bottomNav ? bottomNav.getBoundingClientRect().height : 63;

        const rectUltimo = ultimo.getBoundingClientRect();
        const limiteSuperior = vvOffsetTop + alturaTopbar + 12;
        const limiteInferior = vvOffsetTop + vvHeight - alturaComposer - alturaBottomNav - 12;
        const espacioDisponible = Math.max(80, limiteInferior - limiteSuperior);
        const scrollActual = window.scrollY || window.pageYOffset || 0;

        let destinoDoc = scrollActual;
        if (rectUltimo.height > espacioDisponible) {
          const deltaTop = rectUltimo.top - limiteSuperior;
          if (Math.abs(deltaTop) > 4 || forzar) {
            destinoDoc = Math.max(0, scrollActual + deltaTop);
            window.scrollTo({ top: destinoDoc, behavior: comportamiento });
          }
        } else {
          const deltaBottom = rectUltimo.bottom - limiteInferior;
          if (deltaBottom > 2 || (forzar && deltaBottom !== 0)) {
            destinoDoc = Math.max(0, scrollActual + deltaBottom);
            window.scrollTo({ top: destinoDoc, behavior: comportamiento });
          }
        }
      };

      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(ejecutar);
        });
      } else {
        ejecutar();
      }
    }

    function renderizarHilo(opciones) {
      const conv = obtenerConvActiva();
      hilo.textContent = "";
      if (!conv) {
        return;
      }

      renderizarProgresoChat(conv);

      // Encontrar el índice del ÚLTIMO mensaje de borrador para agrupar y nunca repetirlo 5 veces
      let ultimoIdxBorrador = -1;
      for (let i = conv.mensajes.length - 1; i >= 0; i -= 1) {
        const m = conv.mensajes[i];
        if (m && m.tipo === "borrador" && m.borradorId && obtenerBorradorPorId(m.borradorId)) {
          ultimoIdxBorrador = i;
          break;
        }
      }

      conv.mensajes.forEach((msg, idx) => {
        const fila = document.createElement("div");
        fila.className = `chat-msg chat-msg-${msg.rol}`;
        fila.dataset.msgId = msg.id;

        const burbuja = document.createElement("div");
        burbuja.className = "chat-bubble";

        if (msg.rol === "usuario" && editandoMsgId === msg.id) {
          const editWrap = document.createElement("div");
          editWrap.className = "msg-edit-box";
          const inp = document.createElement("input");
          inp.type = "text";
          inp.className = "input";
          inp.value = msg.texto;
          inp.setAttribute("aria-label", "Editar mensaje");

          const btns = document.createElement("div");
          btns.className = "msg-edit-actions";

          const bGuardar = document.createElement("button");
          bGuardar.type = "button";
          bGuardar.className = "btn btn-primary btn-sm";
          bGuardar.textContent = "Guardar";
          bGuardar.addEventListener("click", () => guardarEdicionMensajeUsuario(conv, msg, inp.value));

          const bCancelar = document.createElement("button");
          bCancelar.type = "button";
          bCancelar.className = "btn btn-secondary btn-sm";
          bCancelar.textContent = "Cancelar";
          bCancelar.addEventListener("click", () => {
            editandoMsgId = null;
            renderizarHilo();
          });

          btns.appendChild(bGuardar);
          btns.appendChild(bCancelar);
          editWrap.appendChild(inp);
          editWrap.appendChild(btns);
          burbuja.appendChild(editWrap);
        } else {
          const p = document.createElement("p");
          p.className = "chat-text";
          p.textContent = msg.texto;
          burbuja.appendChild(p);
        }

        fila.appendChild(burbuja);

        if (msg.rol === "usuario" && editandoMsgId !== msg.id) {
          const bEdit = document.createElement("button");
          bEdit.type = "button";
          bEdit.className = "msg-inline-btn";
          bEdit.dataset.action = "editar-mensaje";
          bEdit.textContent = "Editar";
          bEdit.addEventListener("click", () => {
            editandoMsgId = msg.id;
            renderizarHilo();
          });
          fila.appendChild(bEdit);
        }

        // Mostrar tarjeta de borrador SOLO en el último mensaje de borrador de la conversación
        if (idx === ultimoIdxBorrador && msg.borradorId) {
          const reg = obtenerBorradorPorId(msg.borradorId);
          if (reg) {
            fila.appendChild(construirTarjetaBorradorEnChat(reg));
          }
        }

        hilo.appendChild(fila);
      });

      // Burbuja de 3 puntos animados mientras responde o arma el borrador
      if (generandoAhora) {
        const filaCarga = document.createElement("div");
        filaCarga.className = "chat-msg chat-msg-asistente";
        const burbujaCarga = document.createElement("div");
        burbujaCarga.className = "chat-bubble chat-typing-bubble";
        burbujaCarga.setAttribute("aria-label", "Escribiendo respuesta");
        const puntos = document.createElement("span");
        puntos.className = "typing-dots";
        puntos.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 3; i += 1) {
          const dot = document.createElement("span");
          dot.className = "typing-dot";
          puntos.appendChild(dot);
        }
        const srTxt = document.createElement("span");
        srTxt.className = "sr-only";
        srTxt.textContent = "Escribiendo respuesta...";
        burbujaCarga.appendChild(puntos);
        burbujaCarga.appendChild(srTxt);
        filaCarga.appendChild(burbujaCarga);
        hilo.appendChild(filaCarga);
      }

      // Chips de sugerencia según paso actual o seguimiento
      sugerenciasEl.textContent = "";
      const chipsActivos =
        !generandoAhora && conv.pasoIndice < PASOS.length
          ? PASOS[conv.pasoIndice].chips
          : !generandoAhora && chipsSeguimiento.length > 0
            ? chipsSeguimiento
            : [];
      if (chipsActivos.length > 0) {
        sugerenciasEl.hidden = false;
        chipsActivos.forEach((chipTexto) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "chip-btn";
          b.textContent = chipTexto;
          b.addEventListener("click", () => enviarMensajeUsuario(chipTexto));
          sugerenciasEl.appendChild(b);
        });
      } else {
        sugerenciasEl.hidden = true;
      }

      if (entradaChat) {
        entradaChat.placeholder =
          conv.pasoIndice < PASOS.length
            ? "Escribe tu respuesta aquí..."
            : "Pregunta algo o pide un ajuste (ej. cambia el tono o agrega tacos)...";
      }

      desplazarChatAlFinal({
        suave: Boolean(opciones && opciones.scrollSuave),
        forzar: Boolean(opciones && opciones.forzarScroll)
      });
    }

    function coincideBusquedaSidebar(texto) {
      if (!terminoBusquedaSidebar) {
        return true;
      }
      const norm = String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return norm.includes(terminoBusquedaSidebar);
    }

    function renderizarListaConversaciones() {
      const todas = convsDelPropietario();
      if (badgeBorradoresMobile) {
        badgeBorradoresMobile.textContent = String(todas.length);
        badgeBorradoresMobile.hidden = todas.length === 0;
      }
      const lista = todas.filter((conv) => {
        const nombreNegocio = (conv.datos && conv.datos.nombre) || "";
        return coincideBusquedaSidebar(`${nombreNegocio} ${conv.titulo || ""}`);
      });
      if (contadorConv) {
        contadorConv.textContent = String(lista.length);
      }
      if (!listaConvEl || !convVacio) {
        return;
      }
      listaConvEl.textContent = "";

      if (lista.length === 0) {
        convVacio.textContent = terminoBusquedaSidebar
          ? "Sin conversaciones que coincidan con ese negocio."
          : "Sin conversaciones guardadas.";
        convVacio.hidden = false;
        listaConvEl.hidden = true;
        return;
      }

      convVacio.hidden = true;
      listaConvEl.hidden = false;

      lista.forEach((conv) => {
        const li = document.createElement("li");
        li.className = "sidebar-item-wrap";

        const row = document.createElement("div");
        row.className =
          conv.id === convActivaId ? "sidebar-item sidebar-item-active" : "sidebar-item";

        const btnAbrir = document.createElement("button");
        btnAbrir.type = "button";
        btnAbrir.className = "sidebar-item-open";
        const t = document.createElement("span");
        t.className = "sidebar-item-title";
        t.textContent = (conv.datos && conv.datos.nombre) || conv.titulo || "Nueva conversación";
        const f = document.createElement("span");
        f.className = "sidebar-item-meta";
        f.textContent = formatearFecha(conv.actualizadaEn || conv.creadaEn);
        btnAbrir.appendChild(t);
        btnAbrir.appendChild(f);
        btnAbrir.addEventListener("click", () => {
          confirmandoBorrarConvId = null;
          chipsSeguimiento = [];
          fijarConvActiva(conv.id);
          if (conv.borradorId) {
            fijarBorradorActivo(conv.borradorId);
          }
          renderizarTodo();
          cambiarVistaApp("chat");
        });

        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "sidebar-item-del";
        btnDel.setAttribute("aria-label", `Borrar conversación ${t.textContent}`);
        btnDel.textContent = "Borrar";
        btnDel.addEventListener("click", () => {
          confirmandoBorrarConvId = confirmandoBorrarConvId === conv.id ? null : conv.id;
          renderizarListaConversaciones();
        });

        row.appendChild(btnAbrir);
        row.appendChild(btnDel);
        li.appendChild(row);

        if (confirmandoBorrarConvId === conv.id) {
          const confirmBox = document.createElement("div");
          confirmBox.className = "confirm-box sidebar-confirm-box";
          confirmBox.setAttribute("role", "alert");

          const msg = document.createElement("p");
          msg.textContent = `¿Borrar la conversación "${t.textContent}"?`;

          const actions = document.createElement("div");
          actions.className = "confirm-actions";

          const bSi = document.createElement("button");
          bSi.type = "button";
          bSi.className = "btn btn-danger-ghost btn-sm";
          bSi.textContent = "Sí, borrar";
          bSi.addEventListener("click", () => borrarConversacion(conv.id));

          const bNo = document.createElement("button");
          bNo.type = "button";
          bNo.className = "btn btn-secondary btn-sm";
          bNo.textContent = "Cancelar";
          bNo.addEventListener("click", () => {
            confirmandoBorrarConvId = null;
            renderizarListaConversaciones();
          });

          actions.appendChild(bSi);
          actions.appendChild(bNo);
          confirmBox.appendChild(msg);
          confirmBox.appendChild(actions);
          li.appendChild(confirmBox);
        }

        listaConvEl.appendChild(li);
      });
    }

    function renderizarMisProyectos() {
      if (!listaProyectos) {
        return;
      }
      const borradores = borradoresDelPropietario();
      const slugsConBorrador = new Set(
        borradores.map((b) => (b && b.publicadaSlug) || "").filter(Boolean)
      );
      const prop = propietarioActual();
      const publicadasExtra = todasPublicadas.filter(
        (p) => p && p.cuentaId === prop && p.slug && !slugsConBorrador.has(p.slug)
      );
      const total = borradores.length + publicadasExtra.length;

      if (contadorProyectos) {
        contadorProyectos.textContent = String(total);
      }
      listaProyectos.textContent = "";

      if (total === 0) {
        if (proyectosVacio) {
          proyectosVacio.hidden = false;
        }
        listaProyectos.hidden = true;
        return;
      }

      if (proyectosVacio) {
        proyectosVacio.hidden = true;
      }
      listaProyectos.hidden = false;

      borradores.forEach((reg) => {
        const datos = reg.datos || {};
        const borrador = reg.borrador || {};
        const diseno = reg.diseno || {};
        const portadaUrl =
          diseno.portadaOrigen === "ninguna"
            ? ""
            : diseno.portadaDataUrl || (borrador.portada && borrador.portada.url) || "";

        const li = document.createElement("li");
        li.className =
          reg.id === borradorActivoId ? "card project-card is-active" : "card project-card";

        const top = document.createElement("div");
        top.className = "project-card-top";

        if (portadaUrl) {
          const thumb = document.createElement("img");
          thumb.className = "project-card-thumb";
          thumb.src = portadaUrl;
          thumb.alt = "";
          thumb.loading = "lazy";
          top.appendChild(thumb);
        }

        const info = document.createElement("div");
        info.className = "project-card-info";

        const head = document.createElement("div");
        head.className = "draft-title-row";
        const nom = document.createElement("h3");
        nom.className = "project-card-name";
        nom.textContent = datos.nombre || "Sin nombre";
        const pill = document.createElement("span");
        pill.className = reg.publicadaSlug ? "status-pill" : "status-pill status-pill-muted";
        pill.textContent = reg.publicadaSlug ? "Publicada" : "Borrador";
        head.appendChild(nom);
        head.appendChild(pill);

        const meta = document.createElement("p");
        meta.className = "field-hint project-card-meta";
        const gTxt = obtenerEtiquetaGiroLimpia(datos);
        const fechaTxt = formatearFecha(reg.actualizadoEn || reg.creadoEn);
        meta.textContent = [gTxt, datos.ciudad, fechaTxt].filter(Boolean).join(" · ");

        info.appendChild(head);
        info.appendChild(meta);
        top.appendChild(info);
        li.appendChild(top);

        const acciones = document.createElement("div");
        acciones.className = "project-card-actions";

        if (reg.publicadaSlug) {
          const aAbrir = document.createElement("a");
          aAbrir.className = "btn btn-primary btn-sm";
          aAbrir.href = `ver.html?id=${encodeURIComponent(reg.publicadaSlug)}`;
          aAbrir.target = "_blank";
          aAbrir.rel = "noopener noreferrer";
          aAbrir.dataset.projectAction = "abrir";
          aAbrir.textContent = "Abrir";
          acciones.appendChild(aAbrir);
        } else {
          const bAbrir = document.createElement("button");
          bAbrir.type = "button";
          bAbrir.className = "btn btn-primary btn-sm";
          bAbrir.dataset.projectAction = "abrir";
          bAbrir.textContent = "Abrir";
          bAbrir.addEventListener("click", () => {
            confirmandoBorrarDraftId = null;
            fijarBorradorActivo(reg.id);
            const convVinculada = convsDelPropietario().find((c) => c.borradorId === reg.id);
            if (convVinculada) {
              fijarConvActiva(convVinculada.id);
              renderizarTodo();
              cambiarVistaApp("chat");
            } else {
              abrirBorradorEnEditor(reg);
            }
          });
          acciones.appendChild(bAbrir);
        }

        const bEditar = document.createElement("button");
        bEditar.type = "button";
        bEditar.className = "btn btn-secondary btn-sm";
        bEditar.dataset.projectAction = "editar";
        bEditar.textContent = "Editar";
        bEditar.addEventListener("click", () => {
          confirmandoBorrarDraftId = null;
          abrirBorradorEnEditor(reg);
        });

        const bDuplicar = document.createElement("button");
        bDuplicar.type = "button";
        bDuplicar.className = "btn btn-secondary btn-sm";
        bDuplicar.dataset.projectAction = "duplicar";
        bDuplicar.textContent = "Duplicar";
        bDuplicar.addEventListener("click", () => duplicarBorrador(reg));

        const bEliminar = document.createElement("button");
        bEliminar.type = "button";
        bEliminar.className = "btn btn-danger-ghost btn-sm";
        bEliminar.dataset.projectAction = "eliminar";
        bEliminar.textContent = "Eliminar";
        bEliminar.addEventListener("click", () => {
          confirmandoBorrarDraftId = confirmandoBorrarDraftId === reg.id ? null : reg.id;
          renderizarMisProyectos();
        });

        acciones.appendChild(bEditar);
        acciones.appendChild(bDuplicar);
        acciones.appendChild(bEliminar);
        li.appendChild(acciones);

        if (confirmandoBorrarDraftId === reg.id) {
          const confirmBox = document.createElement("div");
          confirmBox.className = "confirm-box project-confirm-box";
          confirmBox.setAttribute("role", "alert");

          const msg = document.createElement("p");
          msg.textContent = `¿Eliminar "${datos.nombre || "este proyecto"}"? Podrás deshacerlo justo después.`;

          const confActions = document.createElement("div");
          confActions.className = "confirm-actions";

          const bSi = document.createElement("button");
          bSi.type = "button";
          bSi.className = "btn btn-danger-ghost btn-sm";
          bSi.dataset.draftConfirmDelete = reg.id;
          bSi.textContent = "Sí, eliminar";
          bSi.addEventListener("click", () => borrarBorrador(reg.id));

          const bNo = document.createElement("button");
          bNo.type = "button";
          bNo.className = "btn btn-secondary btn-sm";
          bNo.textContent = "Cancelar";
          bNo.addEventListener("click", () => {
            confirmandoBorrarDraftId = null;
            renderizarMisProyectos();
          });

          confActions.appendChild(bSi);
          confActions.appendChild(bNo);
          confirmBox.appendChild(msg);
          confirmBox.appendChild(confActions);
          li.appendChild(confirmBox);
        }

        listaProyectos.appendChild(li);
      });

      // Páginas publicadas reales sin borrador asociado (si existen en este navegador)
      publicadasExtra.forEach((pub) => {
        const datos = pub.datos || {};
        const li = document.createElement("li");
        li.className = "card project-card";

        const head = document.createElement("div");
        head.className = "draft-title-row";
        const nom = document.createElement("h3");
        nom.className = "project-card-name";
        nom.textContent = datos.nombre || pub.slug;
        const pill = document.createElement("span");
        pill.className = "status-pill";
        pill.textContent = "Publicada";
        head.appendChild(nom);
        head.appendChild(pill);

        const meta = document.createElement("p");
        meta.className = "field-hint project-card-meta";
        meta.textContent = [obtenerEtiquetaGiroLimpia(datos), datos.ciudad]
          .filter(Boolean)
          .join(" · ");

        const acciones = document.createElement("div");
        acciones.className = "project-card-actions";

        const aAbrir = document.createElement("a");
        aAbrir.className = "btn btn-primary btn-sm";
        aAbrir.href = `ver.html?id=${encodeURIComponent(pub.slug)}`;
        aAbrir.target = "_blank";
        aAbrir.rel = "noopener noreferrer";
        aAbrir.textContent = "Abrir";
        acciones.appendChild(aAbrir);

        const bEditar = document.createElement("button");
        bEditar.type = "button";
        bEditar.className = "btn btn-secondary btn-sm";
        bEditar.textContent = "Editar";
        bEditar.addEventListener("click", () => {
          const nuevo = {
            id: crearId("borrador"),
            cuentaId: prop,
            datos: clonar(pub.datos),
            borrador: clonar(pub.borrador),
            diseno: clonar(pub.diseno || {}),
            publicadaSlug: pub.slug,
            publicadaEn: pub.publicadaEn || new Date().toISOString(),
            creadoEn: pub.publicadaEn || new Date().toISOString(),
            actualizadoEn: new Date().toISOString()
          };
          todosBorradores.unshift(nuevo);
          guardarColecciones();
          abrirBorradorEnEditor(nuevo);
        });
        acciones.appendChild(bEditar);

        const bDup = document.createElement("button");
        bDup.type = "button";
        bDup.className = "btn btn-secondary btn-sm";
        bDup.textContent = "Duplicar";
        bDup.addEventListener("click", () => {
          const copia = {
            id: crearId("borrador"),
            cuentaId: prop,
            datos: clonar(pub.datos),
            borrador: clonar(pub.borrador),
            diseno: clonar(pub.diseno || {}),
            publicadaSlug: "",
            publicadaEn: "",
            creadoEn: new Date().toISOString(),
            actualizadoEn: new Date().toISOString()
          };
          copia.datos.nombre = `${datos.nombre || "Página"} (copia)`;
          todosBorradores.unshift(copia);
          guardarColecciones();
          renderizarMisProyectos();
        });
        acciones.appendChild(bDup);

        const bEliminar = document.createElement("button");
        bEliminar.type = "button";
        bEliminar.className = "btn btn-danger-ghost btn-sm";
        bEliminar.textContent = "Eliminar";
        bEliminar.addEventListener("click", () => {
          todasPublicadas = todasPublicadas.filter((p) => p && p.slug !== pub.slug);
          guardarColecciones({ permitirVacio: true });
          renderizarTodo();
        });
        acciones.appendChild(bEliminar);

        li.appendChild(head);
        li.appendChild(meta);
        li.appendChild(acciones);
        listaProyectos.appendChild(li);
      });
    }

    function abrirBorradorEnEditor(reg) {
      if (!reg) {
        return;
      }
      fijarBorradorActivo(reg.id);
      const convVinculada = convsDelPropietario().find((c) => c.borradorId === reg.id);
      if (convVinculada) {
        fijarConvActiva(convVinculada.id);
      }
      renderizarTodo();
      cambiarVistaApp("editor");
    }

    function construirMiniVentanaPagina(reg) {
      const datos = reg.datos || {};
      const borrador = reg.borrador || {};
      const diseno = reg.diseno || {};
      const tpl = diseno.plantilla || "clasica";
      const portadaUrl =
        diseno.portadaOrigen === "ninguna"
          ? ""
          : diseno.portadaDataUrl || (borrador.portada && borrador.portada.url) || "";

      const card = document.createElement("article");
      card.className = "miniwindow-card";

      const btnPreview = document.createElement("button");
      btnPreview.type = "button";
      btnPreview.className = `miniwindow-viewport biz-page biz-template-${tpl}`;
      btnPreview.setAttribute("aria-label", `Abrir ${datos.nombre || "página"} en Editor visual`);
      btnPreview.addEventListener("click", () => abrirBorradorEnEditor(reg));

      const chrome = document.createElement("span");
      chrome.className = "miniwindow-chrome";
      const dot1 = document.createElement("span");
      dot1.className = "miniwindow-dot";
      const dot2 = document.createElement("span");
      dot2.className = "miniwindow-dot";
      const urlMini = document.createElement("span");
      urlMini.className = "miniwindow-url";
      urlMini.textContent = reg.publicadaSlug
        ? `ver.html?id=${reg.publicadaSlug}`
        : `${(datos.nombre || "borrador").toLowerCase().replace(/\s+/g, "-")}`;
      chrome.appendChild(dot1);
      chrome.appendChild(dot2);
      chrome.appendChild(urlMini);
      btnPreview.appendChild(chrome);

      const topbar = document.createElement("span");
      topbar.className = "miniwindow-topbar biz-topbar";
      const tNom = document.createElement("span");
      tNom.className = "biz-topbar-name";
      tNom.textContent = datos.nombre || "Tu negocio";
      const tCiu = document.createElement("span");
      tCiu.className = "biz-topbar-city";
      tCiu.textContent = datos.ciudad || "";
      topbar.appendChild(tNom);
      topbar.appendChild(tCiu);
      btnPreview.appendChild(topbar);

      const body = document.createElement("span");
      body.className = "miniwindow-body";
      if (portadaUrl) {
        const img = document.createElement("img");
        img.className = "miniwindow-cover";
        img.src = portadaUrl;
        img.alt = "";
        img.loading = "lazy";
        body.appendChild(img);
      }
      const tit = document.createElement("span");
      tit.className = "miniwindow-title";
      tit.textContent = borrador.titulo || datos.nombre || "Página en borrador";
      body.appendChild(tit);

      const servs = Array.isArray(borrador.servicios) ? borrador.servicios.slice(0, 2) : [];
      if (servs.length > 0) {
        const chips = document.createElement("span");
        chips.className = "miniwindow-chips";
        servs.forEach((s) => {
          const ch = document.createElement("span");
          ch.className = "miniwindow-chip";
          ch.textContent = s.titulo;
          chips.appendChild(ch);
        });
        body.appendChild(chips);
      }
      btnPreview.appendChild(body);
      card.appendChild(btnPreview);

      const foot = document.createElement("div");
      foot.className = "miniwindow-foot";
      const metaCol = document.createElement("div");
      metaCol.className = "miniwindow-meta";
      const h = document.createElement("h4");
      h.className = "miniwindow-name";
      h.textContent = datos.nombre || "Sin nombre";
      const g = document.createElement("p");
      g.className = "miniwindow-sub";
      const gTxt = obtenerEtiquetaGiroLimpia(datos);
      g.textContent = `${gTxt}${datos.ciudad ? ` · ${datos.ciudad}` : ""}`;
      metaCol.appendChild(h);
      metaCol.appendChild(g);

      const actionsCol = document.createElement("div");
      actionsCol.className = "miniwindow-actions";
      const pill = document.createElement("span");
      pill.className = "draft-open-pill";
      pill.textContent = reg.publicadaSlug ? "Publicada" : "Borrador";
      actionsCol.appendChild(pill);

      if (reg.publicadaSlug) {
        const aVer = document.createElement("a");
        aVer.className = "btn btn-secondary btn-sm";
        aVer.href = `ver.html?id=${encodeURIComponent(reg.publicadaSlug)}`;
        aVer.textContent = "Ver";
        actionsCol.appendChild(aVer);
      } else {
        const bEd = document.createElement("button");
        bEd.type = "button";
        bEd.className = "btn btn-secondary btn-sm";
        bEd.textContent = "Abrir";
        bEd.addEventListener("click", () => abrirBorradorEnEditor(reg));
        actionsCol.appendChild(bEd);
      }

      foot.appendChild(metaCol);
      foot.appendChild(actionsCol);
      card.appendChild(foot);
      return card;
    }

    function obtenerMediaSubidaUsuario() {
      const prop = propietarioActual();
      const vistos = new Set();
      const items = [];

      const inspeccionar = (reg) => {
        if (!reg || !reg.diseno) {
          return;
        }
        const nombreNeg = (reg.datos && reg.datos.nombre) || "Tu página";
        const logoUrl = String(reg.diseno.logoDataUrl || "");
        if (logoUrl.startsWith("data:image/") && !vistos.has(logoUrl)) {
          vistos.add(logoUrl);
          items.push({
            dataUrl: logoUrl,
            tipo: "Logo subido",
            negocio: nombreNeg,
            alt: reg.diseno.logoAlt || `Logo de ${nombreNeg}`
          });
        }
        const portadaUrl = String(reg.diseno.portadaDataUrl || "");
        if (
          reg.diseno.portadaOrigen === "propia" &&
          portadaUrl.startsWith("data:image/") &&
          !vistos.has(portadaUrl)
        ) {
          vistos.add(portadaUrl);
          items.push({
            dataUrl: portadaUrl,
            tipo: "Foto de portada",
            negocio: nombreNeg,
            alt: reg.diseno.portadaAlt || `Portada de ${nombreNeg}`
          });
        }
      };

      borradoresDelPropietario().forEach(inspeccionar);
      todasPublicadas.filter((p) => p && p.cuentaId === prop).forEach(inspeccionar);
      return items;
    }

    function abrirModalMedia(item) {
      if (!modalMediaVisor || !mediaModalImg || !item) {
        return;
      }
      mediaModalActual = item;
      mediaModalImg.src = item.dataUrl;
      mediaModalImg.alt = item.alt;
      if (mediaModalTitulo) {
        mediaModalTitulo.textContent = item.tipo;
      }
      if (mediaModalMeta) {
        mediaModalMeta.textContent = `Subida en ${item.negocio}`;
      }
      modalMediaVisor.hidden = false;
    }

    function cerrarModalMedia() {
      mediaModalActual = null;
      if (modalMediaVisor) {
        modalMediaVisor.hidden = true;
      }
      if (mediaModalImg) {
        mediaModalImg.src = "";
      }
    }

    function cambiarTabArchivos(tab) {
      tabArchivosActual = tab === "multimedia" ? "multimedia" : "paginas";
      botonesTabArchivos.forEach((btn) => {
        const activo = btn.dataset.archivosTab === tabArchivosActual;
        btn.classList.toggle("is-active", activo);
        btn.setAttribute("aria-selected", activo ? "true" : "false");
      });
      if (panelArchivosPaginas) {
        panelArchivosPaginas.hidden = tabArchivosActual !== "paginas";
      }
      if (panelArchivosMedia) {
        panelArchivosMedia.hidden = tabArchivosActual !== "multimedia";
      }
      renderizarArchivos();
    }

    function renderizarArchivos() {
      if (gridArchivosPaginas) {
        const lista = borradoresDelPropietario();
        gridArchivosPaginas.textContent = "";
        if (lista.length === 0) {
          if (archivosPaginasVacio) {
            archivosPaginasVacio.hidden = false;
          }
          gridArchivosPaginas.hidden = true;
        } else {
          if (archivosPaginasVacio) {
            archivosPaginasVacio.hidden = true;
          }
          gridArchivosPaginas.hidden = false;
          lista.forEach((reg) => {
            gridArchivosPaginas.appendChild(construirMiniVentanaPagina(reg));
          });
        }
      }

      if (gridArchivosMedia) {
        const media = obtenerMediaSubidaUsuario();
        gridArchivosMedia.textContent = "";
        if (media.length === 0) {
          if (archivosMediaVacio) {
            archivosMediaVacio.hidden = false;
          }
          gridArchivosMedia.hidden = true;
        } else {
          if (archivosMediaVacio) {
            archivosMediaVacio.hidden = true;
          }
          gridArchivosMedia.hidden = false;
          media.forEach((item) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "media-thumb-btn";
            btn.setAttribute("aria-label", `Ver ${item.tipo} de ${item.negocio}`);
            btn.addEventListener("click", () => abrirModalMedia(item));

            const img = document.createElement("img");
            img.className = "media-thumb-img";
            img.src = item.dataUrl;
            img.alt = item.alt;
            img.loading = "lazy";

            const cap = document.createElement("span");
            cap.className = "media-thumb-caption";
            cap.textContent = `${item.tipo} · ${item.negocio}`;

            btn.appendChild(img);
            btn.appendChild(cap);
            gridArchivosMedia.appendChild(btn);
          });
        }
      }
    }

    const API_MP_SUB_APP = "https://crear.dmdmx.dev/api/mp";
    const API_USAGE_CANDIDATOS = [
      "https://crear.dmdmx.dev/api/usage",
      "https://login.dmdmx.dev/api/usage"
    ];
    const NOMBRES_PLAN_APP = {
      pro: { nombre: "Plan Básico", precio: 79 },
      pyme: { nombre: "Plan Emprendedor", precio: 189 },
      elite: { nombre: "Plan Negocio", precio: 299 }
    };
    const ESTADOS_SUB_APP = {
      authorized: "Activa",
      active: "Activa",
      pending: "Pendiente",
      paused: "Pausada",
      cancelled: "Cancelada",
      canceled: "Cancelada"
    };

    function formatearUsoReal(data, sesion) {
      if (data && typeof data === "object") {
        const u =
          data.usage && typeof data.usage === "object"
            ? data.usage
            : data.uso && typeof data.uso === "object"
              ? data.uso
              : data;
        const usado =
          u.used !== undefined
            ? u.used
            : u.usado !== undefined
              ? u.usado
              : u.cambiosUsados !== undefined
                ? u.cambiosUsados
                : u.count !== undefined
                  ? u.count
                  : null;
        const limite =
          u.limit !== undefined
            ? u.limit
            : u.limite !== undefined
              ? u.limite
              : u.total !== undefined
                ? u.total
                : u.max !== undefined
                  ? u.max
                  : null;
        const restante =
          u.remaining !== undefined
            ? u.remaining
            : u.restantes !== undefined
              ? u.restantes
              : u.disponible !== undefined
                ? u.disponible
                : null;
        if (usado !== null && limite !== null) {
          return {
            principal: `${usado} de ${limite} cambios`,
            detalle: restante !== null ? `Te quedan ${restante} disponibles.` : ""
          };
        }
        if (restante !== null && limite !== null) {
          return {
            principal: `${restante} de ${limite} disponibles`,
            detalle: ""
          };
        }
        if (usado !== null) {
          return { principal: `${usado} cambios usados`, detalle: "" };
        }
        if (restante !== null) {
          return { principal: `${restante} disponibles`, detalle: "" };
        }
      }
      if (sesion && sesion.cuotaTexto) {
        return { principal: sesion.cuotaTexto, detalle: "Dato reportado por tu cuenta." };
      }
      return null;
    }

    async function solicitarJsonSeguro(url, opciones) {
      const controlador = typeof AbortController === "function" ? new AbortController() : null;
      const temporizador = controlador ? window.setTimeout(() => controlador.abort(), 8500) : null;
      try {
        const resp = await window.fetch(url, {
          method: (opciones && opciones.method) || "GET",
          credentials: "include",
          headers: Object.assign(
            { Accept: "application/json" },
            opciones && opciones.headers ? opciones.headers : {}
          ),
          body: opciones && opciones.body !== undefined ? opciones.body : undefined,
          signal: controlador ? controlador.signal : undefined
        });
        let data = null;
        try {
          const txt = await resp.text();
          data = txt ? JSON.parse(txt) : null;
        } catch (err) {
          data = null;
        }
        return { ok: resp.ok, status: resp.status, data };
      } catch (err) {
        return { ok: false, status: 0, data: null, errorRed: true };
      } finally {
        if (temporizador) {
          window.clearTimeout(temporizador);
        }
      }
    }

    async function consultarUsoCuenta(sesion) {
      if (!appCuentaUso) {
        return;
      }
      appCuentaUso.textContent = "Consultando...";
      if (appCuentaUsoDetalle) {
        appCuentaUsoDetalle.textContent = "";
      }
      for (let i = 0; i < API_USAGE_CANDIDATOS.length; i += 1) {
        const res = await solicitarJsonSeguro(API_USAGE_CANDIDATOS[i], { method: "GET" });
        if (res.ok && res.data) {
          const uso = formatearUsoReal(res.data, sesion);
          if (uso) {
            appCuentaUso.textContent = uso.principal;
            if (appCuentaUsoDetalle) {
              appCuentaUsoDetalle.textContent = uso.detalle;
            }
            return;
          }
        }
      }
      const respaldoSesion = formatearUsoReal(null, sesion);
      if (respaldoSesion) {
        appCuentaUso.textContent = respaldoSesion.principal;
        if (appCuentaUsoDetalle) {
          appCuentaUsoDetalle.textContent = respaldoSesion.detalle;
        }
      } else {
        appCuentaUso.textContent = "No disponible ahora";
        if (appCuentaUsoDetalle) {
          appCuentaUsoDetalle.textContent = "No se pudo consultar el contador de cambios.";
        }
      }
    }

    async function consultarPlanCuenta() {
      if (!appCuentaPlan) {
        return;
      }
      appCuentaPlan.textContent = "Consultando...";
      if (appCuentaPlanEstado) {
        appCuentaPlanEstado.textContent = "";
      }
      if (appCuentaPlanDetalle) {
        appCuentaPlanDetalle.textContent = "";
      }
      if (appCuentaPlanBadge) {
        appCuentaPlanBadge.textContent = "Consultando...";
        appCuentaPlanBadge.classList.add("status-pill-muted");
      }

      const res = await solicitarJsonSeguro(`${API_MP_SUB_APP}/subscription`, { method: "GET" });
      if (res.status === 404) {
        appCuentaPlan.textContent = "Sin plan activo";
        if (appCuentaPlanEstado) {
          appCuentaPlanEstado.textContent = "Cuenta gratuita";
        }
        if (appCuentaPlanBadge) {
          appCuentaPlanBadge.textContent = "Sin plan";
          appCuentaPlanBadge.classList.add("status-pill-muted");
        }
        if (appCuentaPlanDetalle) {
          appCuentaPlanDetalle.textContent =
            "Todavía no tienes un plan mensual activo en esta cuenta.";
        }
        return;
      }
      if (!res.ok || !res.data) {
        appCuentaPlan.textContent = "No disponible ahora";
        if (appCuentaPlanEstado) {
          appCuentaPlanEstado.textContent = "Sin respuesta del servicio";
        }
        if (appCuentaPlanBadge) {
          appCuentaPlanBadge.textContent = "No disponible";
          appCuentaPlanBadge.classList.add("status-pill-muted");
        }
        if (appCuentaPlanDetalle) {
          appCuentaPlanDetalle.textContent =
            "No pudimos consultar tu suscripción en este intento. Intenta actualizar más tarde.";
        }
        return;
      }

      const sub =
        res.data.subscription && typeof res.data.subscription === "object"
          ? res.data.subscription
          : res.data.suscripcion && typeof res.data.suscripcion === "object"
            ? res.data.suscripcion
            : res.data;
      const planId = String(sub.plan || sub.plan_id || sub.planId || "").trim().toLowerCase();
      const statusRaw = String(sub.status || sub.estado || "").trim().toLowerCase();
      if (!planId && !statusRaw) {
        appCuentaPlan.textContent = "Sin plan activo";
        if (appCuentaPlanEstado) {
          appCuentaPlanEstado.textContent = "Sin plan contratado";
        }
        if (appCuentaPlanBadge) {
          appCuentaPlanBadge.textContent = "Sin plan";
          appCuentaPlanBadge.classList.add("status-pill-muted");
        }
        return;
      }
      const def = NOMBRES_PLAN_APP[planId];
      appCuentaPlan.textContent = def
        ? `${def.nombre} ($${def.precio} MXN al mes)`
        : planId || "Plan dmd";
      const estadoLabel = ESTADOS_SUB_APP[statusRaw] || statusRaw || "Sin estado";
      const activa = statusRaw === "authorized" || statusRaw === "active";
      if (appCuentaPlanEstado) {
        appCuentaPlanEstado.textContent = `Estado: ${estadoLabel}`;
      }
      if (appCuentaPlanBadge) {
        appCuentaPlanBadge.textContent = estadoLabel;
        appCuentaPlanBadge.classList.toggle("status-pill-muted", !activa);
      }
      if (appCuentaPlanDetalle) {
        appCuentaPlanDetalle.textContent = activa
          ? "Tu suscripción está activa en Mercado Pago."
          : "Consulta los planes disponibles si deseas cambiar o reactivar tu suscripción.";
      }
    }

    function fijarErrorMiniCampo(inputEl, errEl, mensaje) {
      if (errEl) {
        errEl.textContent = mensaje || "";
      }
      if (inputEl) {
        if (mensaje) {
          inputEl.setAttribute("aria-invalid", "true");
        } else {
          inputEl.removeAttribute("aria-invalid");
        }
      }
    }

    function renderizarMiCuenta(forzarConsulta) {
      if (!vistaCuenta) {
        return;
      }
      const dmdCuenta = window.dmdCuenta;
      const verificada =
        dmdCuenta && typeof dmdCuenta.estaVerificada === "function"
          ? dmdCuenta.estaVerificada()
          : true;
      const sesion =
        dmdCuenta && typeof dmdCuenta.obtenerSesionActual === "function"
          ? dmdCuenta.obtenerSesionActual()
          : null;
      const errorSrv =
        dmdCuenta && typeof dmdCuenta.obtenerUltimoErrorServicio === "function"
          ? dmdCuenta.obtenerUltimoErrorServicio()
          : "";

      if (!verificada) {
        if (appCuentaCargando) {
          appCuentaCargando.hidden = false;
        }
        if (appCuentaAutenticada) {
          appCuentaAutenticada.hidden = true;
        }
        if (appCuentaMiniLogin) {
          appCuentaMiniLogin.hidden = true;
        }
        return;
      }

      if (appCuentaCargando) {
        appCuentaCargando.hidden = true;
      }

      if (sesion) {
        if (appCuentaAutenticada) {
          appCuentaAutenticada.hidden = false;
        }
        if (appCuentaMiniLogin) {
          appCuentaMiniLogin.hidden = true;
        }
        if (appCuentaNombre) {
          appCuentaNombre.textContent = sesion.nombre || "Tu cuenta";
        }
        if (appCuentaCorreo) {
          appCuentaCorreo.textContent = sesion.correo || "";
        }
        if (forzarConsulta || cuentaDatosCargadosParaId !== sesion.id) {
          cuentaDatosCargadosParaId = sesion.id;
          consultarUsoCuenta(sesion);
          consultarPlanCuenta();
        }
        return;
      }

      cuentaDatosCargadosParaId = "";
      if (appCuentaAutenticada) {
        appCuentaAutenticada.hidden = true;
      }
      if (appCuentaMiniLogin) {
        appCuentaMiniLogin.hidden = false;
      }
      if (miniLoginAvisoServicio) {
        miniLoginAvisoServicio.hidden = !errorSrv;
      }
      if (miniLoginAvisoTitulo && errorSrv) {
        miniLoginAvisoTitulo.textContent = errorSrv;
      }
    }

    async function manejarMiniLoginSubmit(e) {
      if (e) {
        e.preventDefault();
      }
      if (miniLoginEnviando || !window.dmdCuenta) {
        return;
      }
      const correo = String((miniLoginCorreo && miniLoginCorreo.value) || "")
        .trim()
        .toLowerCase();
      const password = String((miniLoginPassword && miniLoginPassword.value) || "");

      fijarErrorMiniCampo(miniLoginCorreo, errorMiniLoginCorreo, "");
      fijarErrorMiniCampo(miniLoginPassword, errorMiniLoginPassword, "");
      if (miniLoginErrorGeneral) {
        miniLoginErrorGeneral.textContent = "";
        miniLoginErrorGeneral.hidden = true;
      }

      let primero = null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
        fijarErrorMiniCampo(miniLoginCorreo, errorMiniLoginCorreo, "Escribe un correo válido.");
        primero = primero || miniLoginCorreo;
      }
      if (!password) {
        fijarErrorMiniCampo(miniLoginPassword, errorMiniLoginPassword, "Escribe tu contraseña.");
        primero = primero || miniLoginPassword;
      }
      if (primero) {
        primero.focus();
        return;
      }

      miniLoginEnviando = true;
      if (btnMiniLoginEntrar) {
        btnMiniLoginEntrar.disabled = true;
        btnMiniLoginEntrar.textContent = "Entrando...";
      }
      try {
        const res = await window.dmdCuenta.iniciarSesion({ correo, password });
        if (!res || !res.ok) {
          if (miniLoginErrorGeneral) {
            miniLoginErrorGeneral.textContent =
              (res && res.mensaje) || "No se pudo iniciar sesión. Revisa tus datos.";
            miniLoginErrorGeneral.hidden = false;
          }
          if (miniLoginPassword) {
            miniLoginPassword.focus();
          }
          return;
        }
        if (miniLoginPassword) {
          miniLoginPassword.value = "";
        }
        cuentaDatosCargadosParaId = "";
        renderizarMiCuenta(true);
      } finally {
        miniLoginEnviando = false;
        if (btnMiniLoginEntrar) {
          btnMiniLoginEntrar.disabled = false;
          btnMiniLoginEntrar.textContent = "Iniciar sesión";
        }
      }
    }

    async function manejarMiniLoginGoogle() {
      if (miniLoginEnviando || !window.dmdCuenta) {
        return;
      }
      miniLoginEnviando = true;
      if (btnMiniLoginGoogle) {
        btnMiniLoginGoogle.disabled = true;
      }
      if (miniLoginGoogleEstado) {
        miniLoginGoogleEstado.textContent = "Conectando con Google...";
      }
      try {
        const baseAuth = window.dmdCuenta.apiAuthBase || "https://login.dmdmx.dev/api/auth";
        const resPost = await solicitarJsonSeguro(`${baseAuth}/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ return_to: window.location.href })
        });
        if (resPost.ok && resPost.data) {
          const redir =
            resPost.data.url || resPost.data.redirectUrl || resPost.data.authUrl || "";
          if (typeof redir === "string" && /^https?:\/\//i.test(redir)) {
            window.location.assign(redir);
            return;
          }
          const verif = await window.dmdCuenta.verificarSesion();
          if (verif && verif.sesion) {
            cuentaDatosCargadosParaId = "";
            renderizarMiCuenta(true);
            return;
          }
        }
        const resSso = await window.dmdCuenta.iniciarAccesoGoogle();
        if (resSso && !resSso.ok && miniLoginGoogleEstado) {
          miniLoginGoogleEstado.textContent = resSso.mensaje;
        } else if (resSso && resSso.yaAutenticado) {
          cuentaDatosCargadosParaId = "";
          renderizarMiCuenta(true);
        } else if (resSso && resSso.redirigiendo && miniLoginGoogleEstado) {
          miniLoginGoogleEstado.textContent = "Abriendo acceso con Google...";
        }
      } finally {
        miniLoginEnviando = false;
        if (btnMiniLoginGoogle) {
          btnMiniLoginGoogle.disabled = false;
        }
      }
    }

    function descargarRespaldoJson() {
      const prop = propietarioActual();
      const paquete = {
        version: 1,
        exportadoEn: new Date().toISOString(),
        conversaciones: convsDelPropietario(),
        borradores: borradoresDelPropietario(),
        publicadas: todasPublicadas.filter((p) => p && p.cuentaId === prop)
      };
      const blob = new Blob([JSON.stringify(paquete, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "respaldo-dmd.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      estadoRespaldo.textContent = "Respaldo descargado (.json).";
    }

    function importarRespaldoJson(archivo) {
      if (!archivo) {
        return;
      }
      const lector = new FileReader();
      lector.onload = () => {
        try {
          const data = JSON.parse(String(lector.result || "{}"));
          const prop = propietarioActual();
          let importados = 0;

          if (Array.isArray(data.borradores)) {
            data.borradores.forEach((b) => {
              if (b && b.id && b.datos && b.borrador) {
                const copia = clonar(b);
                copia.cuentaId = prop;
                if (
                  window.dmdEditor &&
                  typeof window.dmdEditor.asegurarEstructuraBorrador === "function"
                ) {
                  window.dmdEditor.asegurarEstructuraBorrador(copia);
                }
                if (!todosBorradores.some((x) => x.id === copia.id)) {
                  todosBorradores.unshift(copia);
                  importados += 1;
                }
              }
            });
          }
          if (Array.isArray(data.conversaciones)) {
            data.conversaciones.forEach((c) => {
              if (c && c.id && Array.isArray(c.mensajes)) {
                const copia = clonar(c);
                copia.cuentaId = prop;
                if (!todasConversaciones.some((x) => x.id === copia.id)) {
                  todasConversaciones.unshift(copia);
                }
              }
            });
          }
          if (Array.isArray(data.publicadas)) {
            data.publicadas.forEach((p) => {
              if (p && p.slug && p.datos && p.borrador) {
                const copia = clonar(p);
                copia.cuentaId = prop;
                if (!todasPublicadas.some((x) => x.slug === copia.slug)) {
                  todasPublicadas.unshift(copia);
                }
              }
            });
          }

          guardarColecciones();
          renderizarTodo();
          estadoRespaldo.textContent =
            importados > 0
              ? `Se importaron ${importados} página${importados === 1 ? "" : "s"}.`
              : "Sin elementos nuevos por importar.";
        } catch (error) {
          estadoRespaldo.textContent = "El archivo no es un respaldo válido (.json).";
        } finally {
          inputImportar.value = "";
        }
      };
      lector.readAsText(archivo);
    }

    function renderizarTodo(opciones) {
      renderizarListaConversaciones();
      renderizarHilo(opciones);
      if (vistaActual === "archivos") {
        renderizarArchivos();
      } else if (vistaActual === "proyectos") {
        renderizarMisProyectos();
      } else if (vistaActual === "cuenta") {
        renderizarMiCuenta(false);
      }
    }

    function restaurarEstadoCompleto(permitirCrearSiVacio) {
      cargarColecciones();
      const bAct = leer(KEY_BORRADOR_ACTIVO, null);
      if (bAct && bAct.cuentaId === propietarioActual() && obtenerBorradorPorId(bAct.id)) {
        borradorActivoId = bAct.id;
      } else {
        const primero = borradoresDelPropietario()[0];
        borradorActivoId = primero ? primero.id : null;
      }

      const lista = convsDelPropietario();
      const guardada = leer(KEY_CONV_ACTIVA, null);
      if (guardada && guardada.cuentaId === propietarioActual()) {
        const hallada = lista.find((c) => c.id === guardada.id);
        if (hallada) {
          convActivaId = hallada.id;
          convBorradorMemoria = null;
        } else if (lista.length > 0) {
          convActivaId = lista[0].id;
          convBorradorMemoria = null;
        } else {
          convActivaId = null;
        }
      } else if (lista.length > 0) {
        convActivaId = lista[0].id;
        convBorradorMemoria = null;
      } else {
        convActivaId = null;
      }

      if (!convActivaId && permitirCrearSiVacio) {
        crearNuevaConversacion();
        return;
      }

      if (window.dmdEditor) {
        window.dmdEditor.cargarBorrador(
          borradorActivoId ? obtenerBorradorPorId(borradorActivoId) : null,
          false
        );
      }
      renderizarTodo();
    }

    function ejecutarCuandoHidrate(accion) {
      if (
        window.dmdAlmacen &&
        typeof window.dmdAlmacen.estaHidratado === "function" &&
        !window.dmdAlmacen.estaHidratado() &&
        typeof window.dmdAlmacen.esperarHidratacion === "function"
      ) {
        window.dmdAlmacen.esperarHidratacion().then(accion);
        return;
      }
      accion();
    }

    // Configurar editor visual
    if (window.dmdEditor) {
      window.dmdEditor.configurar({
        alGuardarBorrador(regActualizado) {
          const idx = todosBorradores.findIndex((b) => b && b.id === regActualizado.id);
          if (idx !== -1) {
            todosBorradores[idx] = regActualizado;
          }
          sincronizarPublicada(regActualizado);
          guardarColecciones();
          renderizarHilo();
          if (vistaActual === "archivos") {
            renderizarArchivos();
          } else if (vistaActual === "proyectos") {
            renderizarMisProyectos();
          }
        },
        alPublicarBorrador(reg) {
          publicarBorrador(reg);
        },
        alIrAlChat() {
          cambiarVistaApp("chat");
        },
        alDescargarRespaldo() {
          descargarRespaldoJson();
        },
        alPedirImportar() {
          if (inputImportar) {
            inputImportar.click();
          }
        }
      });
    }

    // Eventos UI
    btnAbrirSidebar.addEventListener("click", alternarSidebar);
    btnCerrarSidebar.addEventListener("click", () => abrirSidebar(false));
    backdrop.addEventListener("click", () => abrirSidebar(false));

    if (sidebarBuscar) {
      sidebarBuscar.addEventListener("input", () => {
        terminoBusquedaSidebar = String(sidebarBuscar.value || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        renderizarListaConversaciones();
      });
    }

    if (btnNuevaIcono) {
      btnNuevaIcono.addEventListener("click", () =>
        ejecutarCuandoHidrate(crearNuevaConversacion)
      );
    }

    if (btnSidebarAjustes) {
      btnSidebarAjustes.addEventListener("click", () => {
        cambiarVistaApp("suscripcion");
        const bloqueConfig = document.getElementById("configuracion-datos");
        if (bloqueConfig && typeof bloqueConfig.scrollIntoView === "function") {
          window.requestAnimationFrame(() => {
            bloqueConfig.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      });
    }

    botonesVistaApp.forEach((btn) => {
      btn.addEventListener("click", () => {
        const destino = btn.dataset.appVista;
        if (destino) {
          cambiarVistaApp(destino);
        }
      });
    });

    botonesTabArchivos.forEach((btn) => {
      btn.addEventListener("click", () => {
        cambiarTabArchivos(btn.dataset.archivosTab);
      });
    });

    if (btnArchivosCrear) {
      btnArchivosCrear.addEventListener("click", () => cambiarVistaApp("chat"));
    }
    if (btnArchivosSubirIr) {
      btnArchivosSubirIr.addEventListener("click", () => cambiarVistaApp("editor"));
    }
    if (btnProyectosNuevo) {
      btnProyectosNuevo.addEventListener("click", () =>
        ejecutarCuandoHidrate(crearNuevaConversacion)
      );
    }
    if (btnProyectosIrChat) {
      btnProyectosIrChat.addEventListener("click", () => cambiarVistaApp("chat"));
    }
    if (btnProyectosUndo) {
      btnProyectosUndo.addEventListener("click", deshacerUltimoBorrado);
    }
    if (btnProyectosUndoCerrar) {
      btnProyectosUndoCerrar.addEventListener("click", ocultarUndoToast);
    }
    if (btnConfigDescargar) {
      btnConfigDescargar.addEventListener("click", descargarRespaldoJson);
    }
    if (btnConfigImportar && inputImportar) {
      btnConfigImportar.addEventListener("click", () => inputImportar.click());
    }

    if (btnAppCuentaVerPlanes) {
      btnAppCuentaVerPlanes.addEventListener("click", () => cambiarVistaApp("suscripcion"));
    }
    if (btnAppCuentaRefrescar) {
      btnAppCuentaRefrescar.addEventListener("click", async () => {
        if (!window.dmdCuenta) {
          return;
        }
        btnAppCuentaRefrescar.disabled = true;
        if (appCuentaEstado) {
          appCuentaEstado.textContent = "Actualizando datos de tu cuenta...";
        }
        try {
          await window.dmdCuenta.verificarSesion();
          cuentaDatosCargadosParaId = "";
          renderizarMiCuenta(true);
          if (appCuentaEstado) {
            appCuentaEstado.textContent = "Datos actualizados.";
          }
        } finally {
          btnAppCuentaRefrescar.disabled = false;
        }
      });
    }
    if (btnAppCuentaSalir) {
      btnAppCuentaSalir.addEventListener("click", async () => {
        if (!window.dmdCuenta) {
          return;
        }
        btnAppCuentaSalir.disabled = true;
        try {
          await window.dmdCuenta.cerrarSesion();
          cuentaDatosCargadosParaId = "";
          renderizarMiCuenta(false);
        } finally {
          btnAppCuentaSalir.disabled = false;
        }
      });
    }
    if (btnAppCuentaReintentar) {
      btnAppCuentaReintentar.addEventListener("click", async () => {
        if (!window.dmdCuenta) {
          return;
        }
        btnAppCuentaReintentar.disabled = true;
        try {
          await window.dmdCuenta.verificarSesion();
          renderizarMiCuenta(true);
        } finally {
          btnAppCuentaReintentar.disabled = false;
        }
      });
    }
    if (formMiniLogin) {
      formMiniLogin.addEventListener("submit", manejarMiniLoginSubmit);
    }
    if (miniLoginCorreo) {
      miniLoginCorreo.addEventListener("input", () =>
        fijarErrorMiniCampo(miniLoginCorreo, errorMiniLoginCorreo, "")
      );
    }
    if (miniLoginPassword) {
      miniLoginPassword.addEventListener("input", () =>
        fijarErrorMiniCampo(miniLoginPassword, errorMiniLoginPassword, "")
      );
    }
    if (btnMiniTogglePassword && miniLoginPassword) {
      btnMiniTogglePassword.addEventListener("click", () => {
        const visible = miniLoginPassword.type === "text";
        miniLoginPassword.type = visible ? "password" : "text";
        btnMiniTogglePassword.setAttribute(
          "aria-label",
          visible ? "Mostrar contraseña" : "Ocultar contraseña"
        );
        btnMiniTogglePassword.setAttribute("aria-pressed", visible ? "false" : "true");
        miniLoginPassword.focus();
      });
    }
    if (btnMiniLoginGoogle) {
      btnMiniLoginGoogle.addEventListener("click", manejarMiniLoginGoogle);
    }

    if (btnCerrarMediaModal) {
      btnCerrarMediaModal.addEventListener("click", cerrarModalMedia);
    }
    if (modalMediaVisor) {
      modalMediaVisor.addEventListener("click", (e) => {
        if (e.target === modalMediaVisor) {
          cerrarModalMedia();
        }
      });
    }
    if (btnMediaUsarPortada) {
      btnMediaUsarPortada.addEventListener("click", () => {
        const reg = obtenerBorradorPorId(borradorActivoId) || borradoresDelPropietario()[0];
        if (!reg || !mediaModalActual) {
          cerrarModalMedia();
          return;
        }
        reg.diseno = reg.diseno || {};
        reg.diseno.portadaDataUrl = mediaModalActual.dataUrl;
        reg.diseno.portadaOrigen = "propia";
        reg.diseno.portadaAlt = mediaModalActual.alt;
        reg.actualizadoEn = new Date().toISOString();
        sincronizarPublicada(reg);
        guardarColecciones();
        cerrarModalMedia();
        abrirBorradorEnEditor(reg);
      });
    }
    if (btnMediaUsarLogo) {
      btnMediaUsarLogo.addEventListener("click", () => {
        const reg = obtenerBorradorPorId(borradorActivoId) || borradoresDelPropietario()[0];
        if (!reg || !mediaModalActual) {
          cerrarModalMedia();
          return;
        }
        reg.diseno = reg.diseno || {};
        reg.diseno.logoDataUrl = mediaModalActual.dataUrl;
        reg.diseno.logoAlt = mediaModalActual.alt;
        reg.actualizadoEn = new Date().toISOString();
        sincronizarPublicada(reg);
        guardarColecciones();
        cerrarModalMedia();
        abrirBorradorEnEditor(reg);
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (modalMediaVisor && !modalMediaVisor.hidden) {
          cerrarModalMedia();
        } else if (!esEscritorioApp() && sidebar.classList.contains("is-open")) {
          abrirSidebar(false);
        }
      }
    });

    if (btnNuevaSidebar) {
      btnNuevaSidebar.addEventListener("click", () =>
        ejecutarCuandoHidrate(crearNuevaConversacion)
      );
    }

    if (btnChatReintentar) {
      btnChatReintentar.addEventListener("click", () => {
        const fn = ultimaAccionFallida;
        mostrarErrorChat("");
        if (typeof fn === "function") {
          fn();
        }
      });
    }

    if (btnUndo) {
      btnUndo.addEventListener("click", deshacerUltimoBorrado);
    }
    if (btnUndoCerrar) {
      btnUndoCerrar.addEventListener("click", ocultarUndoToast);
    }
    if (btnSidebarUndo) {
      btnSidebarUndo.addEventListener("click", deshacerUltimoBorrado);
    }
    if (btnSidebarUndoCerrar) {
      btnSidebarUndoCerrar.addEventListener("click", ocultarUndoToast);
    }

    tabModoChat.addEventListener("click", () => cambiarVistaApp("chat"));
    tabModoEditor.addEventListener("click", () => cambiarVistaApp("editor"));

    btnEnviar.addEventListener("click", () =>
      ejecutarCuandoHidrate(() => enviarMensajeUsuario(entradaChat.value))
    );
    formChat.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      ejecutarCuandoHidrate(() => enviarMensajeUsuario(entradaChat.value));
    });
    entradaChat.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ejecutarCuandoHidrate(() => enviarMensajeUsuario(entradaChat.value));
      }
    });
    entradaChat.addEventListener("input", () => {
      entradaChat.style.height = "auto";
      entradaChat.style.height = `${Math.min(entradaChat.scrollHeight, 120)}px`;
    });
    entradaChat.addEventListener("focus", () => {
      window.setTimeout(() => {
        desplazarChatAlFinal({ suave: false });
      }, 180);
    });
    if (window.visualViewport && typeof window.visualViewport.addEventListener === "function") {
      window.visualViewport.addEventListener("resize", () => {
        if (vistaActual === "chat") {
          desplazarChatAlFinal({ suave: false });
        }
      });
    }

    if (inputImportar) {
      inputImportar.addEventListener("change", () => {
        if (inputImportar.files && inputImportar.files[0]) {
          importarRespaldoJson(inputImportar.files[0]);
        }
      });
    }

    if (window.dmdCuenta && typeof window.dmdCuenta.alCambiarSesion === "function") {
      window.dmdCuenta.alCambiarSesion((_sesion, motivo) => {
        cuentaDatosCargadosParaId = "";
        const hidratado =
          !window.dmdAlmacen ||
          typeof window.dmdAlmacen.estaHidratado !== "function" ||
          window.dmdAlmacen.estaHidratado();
        restaurarEstadoCompleto(motivo !== "hidratacion" && hidratado);
        if (vistaActual === "cuenta") {
          renderizarMiCuenta(true);
        }
      });
    }

    if (window.dmdAlmacen && typeof window.dmdAlmacen.alHidratar === "function") {
      window.dmdAlmacen.alHidratar(() => {
        restaurarEstadoCompleto(false);
      });
    }

    if (window.dmdAlmacen && typeof window.dmdAlmacen.esperarHidratacion === "function") {
      cargarColecciones();
      if (convsDelPropietario().length > 0 || borradoresDelPropietario().length > 0) {
        restaurarEstadoCompleto(false);
      }
      window.dmdAlmacen.esperarHidratacion().then(() => {
        restaurarEstadoCompleto(true);
      });
    } else {
      restaurarEstadoCompleto(true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montarChat);
  } else {
    montarChat();
  }
})();
