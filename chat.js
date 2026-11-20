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
      pregunta: "¿Cuál es el giro?",
      chips: ["Tienda", "Comida", "Servicios", "Salud y belleza", "Taller u oficio", "Otro"]
    },
    {
      campo: "ciudad",
      etiqueta: "Ciudad",
      pregunta: "¿En qué ciudad estás?",
      chips: []
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
    "continuar sin teléfono"
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
    const sidebar = document.getElementById("app-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    const btnAbrirSidebar = document.getElementById("btn-abrir-sidebar");
    const btnCerrarSidebar = document.getElementById("btn-cerrar-sidebar");
    const btnNuevaSidebar = document.getElementById("btn-nueva-conv-sidebar");
    const badgeBorradoresMobile = document.getElementById("badge-borradores-mobile");
    const sidebarStorageLabel = document.getElementById("sidebar-storage-label");

    const tabModoChat = document.getElementById("tab-modo-chat");
    const tabModoEditor = document.getElementById("tab-modo-editor");
    const vistaChat = document.getElementById("vista-chat");
    const vistaEditor = document.getElementById("vista-editor");

    const contadorConv = document.getElementById("contador-conversaciones");
    const convVacio = document.getElementById("conversaciones-vacio");
    const listaConvEl = document.getElementById("lista-conversaciones");

    const contadorBorradores = document.getElementById("contador-borradores");
    const borradoresVacio = document.getElementById("borradores-vacio");
    const listaBorradoresEl = document.getElementById("lista-borradores");
    const cuentaSidebarBox = document.getElementById("sidebar-cuenta-box");

    const btnDescRespaldo = document.getElementById("btn-descargar-respaldo-sidebar");
    const btnImpRespaldo = document.getElementById("btn-importar-respaldo-sidebar");
    const inputImportar = document.getElementById("input-importar-respaldo");
    const estadoRespaldo = document.getElementById("estado-respaldo-sidebar");

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
    let generandoAhora = false;
    let ultimaAccionFallida = null;

    let confirmandoBorrarDraftId = null;
    let confirmandoBorrarConvId = null;
    let ultimoEliminado = null;
    let timerUndoToast = null;

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
        btnEnviar.textContent = generandoAhora ? "Generando..." : "Enviar";
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
      renderizarHilo();
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
      timerUndoToast = window.setTimeout(() => {
        ocultarUndoToast();
      }, 15000);
    }

    function esTextoOmision(texto) {
      if (typeof gen.esOmisionWhatsapp === "function") {
        return gen.esOmisionWhatsapp(texto);
      }
      if (typeof gen.esTextoRelleno === "function") {
        return gen.esTextoRelleno(texto);
      }
      return /^(omitir|saltar|sin\s+whats?app|no\s+tengo)/i.test(String(texto || "").trim());
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
        datos: { nombre: "", giro: "", giroTexto: "", ciudad: "", oferta: "", tono: "", whatsapp: "" },
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

    function abrirSidebar(abrir) {
      const estado = Boolean(abrir);
      sidebar.classList.toggle("is-open", estado);
      backdrop.hidden = !estado;
      btnAbrirSidebar.setAttribute("aria-expanded", estado ? "true" : "false");
    }

    function cambiarModo(nuevoModo) {
      modoActual = nuevoModo === "editor" ? "editor" : "chat";
      const esEditor = modoActual === "editor";
      tabModoChat.classList.toggle("mode-tab-active", !esEditor);
      tabModoEditor.classList.toggle("mode-tab-active", esEditor);
      tabModoChat.setAttribute("aria-selected", !esEditor ? "true" : "false");
      tabModoEditor.setAttribute("aria-selected", esEditor ? "true" : "false");
      vistaChat.hidden = esEditor;
      vistaEditor.hidden = !esEditor;
      if (esEditor && window.dmdEditor) {
        const reg = obtenerBorradorPorId(borradorActivoId) || borradoresDelPropietario()[0] || null;
        if (reg && reg.id !== borradorActivoId) {
          fijarBorradorActivo(reg.id);
        } else {
          window.dmdEditor.cargarBorrador(reg, false);
        }
      }
    }

    function crearNuevaConversacion() {
      convActivaId = null;
      convBorradorMemoria = crearObjetoConversacionVacia();
      editandoMsgId = null;
      mostrarErrorChat("");
      estadoChatEl.textContent = "";
      renderizarTodo();
      cambiarModo("chat");
      abrirSidebar(false);
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
      renderizarListaBorradores();
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
      renderizarListaBorradores();
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

    async function aplicarCambioSeguimiento(conv, texto) {
      const limpio = gen.limpiarTexto(texto);
      const bajo = limpio.toLowerCase().replace(/[.!?¡¿,:;]+$/g, "").trim();

      // Nunca guardar ni mostrar "Omitir" ni variantes de "sin WhatsApp"
      if (
        RESPUESTAS_NO_OFERTA.has(bajo) ||
        esTextoOmision(limpio) ||
        (typeof gen.esTextoRelleno === "function" && gen.esTextoRelleno(limpio))
      ) {
        estadoChatEl.textContent =
          "Escribe un ajuste concreto (por ejemplo: \"cambia a tono profesional\" o \"agrega entregas a domicilio\"), o toca Editar.";
        return;
      }

      let cambio = "";
      let etiquetaVersion = "Actualización por chat";
      let detalleVersion = "";

      const tonoDetectado =
        /tono\s+(cercano|profesional|formal)/i.exec(limpio) ||
        (/cambia|pon|usa|hazlo/.test(bajo) && /\b(cercano|profesional|formal)\b/i.exec(limpio));

      if (tonoDetectado) {
        conv.datos.tono = gen.normalizarTono(tonoDetectado[1]);
        const tonoEtq = gen.TONOS_ETIQUETAS[conv.datos.tono] || conv.datos.tono;
        cambio = `Tono cambiado a ${tonoEtq}. Borrador actualizado.`;
        etiquetaVersion = `Tono ${tonoEtq}`;
        detalleVersion = `Se cambió el tono de la redacción a ${tonoEtq}`;
      } else if (/whatsapp|tel[eé]fono|n[uú]mero/i.test(bajo)) {
        const dig = gen.limpiarDigitos(limpio);
        if (dig.length >= 10 && dig.length <= 15) {
          conv.datos.whatsapp = dig;
          cambio = `WhatsApp actualizado: ${dig}. Borrador actualizado.`;
          etiquetaVersion = "WhatsApp actualizado";
          detalleVersion = `Número configurado: ${dig}`;
        } else if (/quita|borra|sin\s+whats?app/i.test(bajo)) {
          conv.datos.whatsapp = "";
          cambio = "Número retirado del borrador.";
          etiquetaVersion = "Contacto actualizado";
          detalleVersion = "Se retiró el número de WhatsApp";
        } else {
          conv.mensajes.push({
            id: crearId("msg"),
            rol: "asistente",
            tipo: "texto",
            texto: "Para actualizar tu WhatsApp escribe entre 10 y 15 dígitos con lada, por ejemplo: WhatsApp 528112345678."
          });
          conv.actualizadaEn = new Date().toISOString();
          guardarColecciones();
          renderizarTodo();
          return;
        }
      } else if (/ciudad\s+(?:a|en|:)?\s*(.+)/i.test(limpio)) {
        const m = /ciudad\s+(?:a|en|:)?\s*(.+)/i.exec(limpio);
        if (m && m[1].trim().length >= 2) {
          const ciudadNueva =
            typeof gen.formatearNombrePropio === "function"
              ? gen.formatearNombrePropio(m[1], "ciudad")
              : gen.limpiarTexto(m[1]);
          conv.datos.ciudad = ciudadNueva;
          cambio = `Ciudad actualizada a ${ciudadNueva}. Borrador actualizado.`;
          etiquetaVersion = `Ciudad: ${ciudadNueva}`;
          detalleVersion = `Ubicación cambiada a ${ciudadNueva}`;
        }
      } else if (/agrega|añade|incluye|suma|tambi[eé]n/i.test(bajo)) {
        const extraCrudo = limpio
          .replace(/^(agrega|añade|incluye|suma|pon|también|tambien)\s+/i, "")
          .trim();
        const extra =
          typeof gen.limpiarOfertaDeRelleno === "function"
            ? gen.limpiarOfertaDeRelleno(extraCrudo)
            : extraCrudo;
        if (extra.length >= 3) {
          conv.datos.oferta = conv.datos.oferta ? `${conv.datos.oferta}, ${extra}` : extra;
          cambio = `Se agregó "${extra}" a tu oferta. Borrador actualizado.`;
          etiquetaVersion = `Agregó: ${extra.slice(0, 28)}`;
          detalleVersion = `Se añadió "${extra}" a la lista de oferta`;
        }
      } else if (/nombre\s+(?:a|:)?\s*(.+)/i.test(limpio)) {
        const m = /nombre\s+(?:a|:)?\s*(.+)/i.exec(limpio);
        if (m && m[1].trim().length >= 2) {
          const nomNuevo =
            typeof gen.formatearNombrePropio === "function"
              ? gen.formatearNombrePropio(m[1], "nombre")
              : gen.limpiarTexto(m[1]);
          conv.datos.nombre = nomNuevo;
          cambio = `Nombre actualizado a ${nomNuevo}. Borrador actualizado.`;
          etiquetaVersion = `Nombre: ${nomNuevo}`;
          detalleVersion = `Se cambió el nombre del negocio a ${nomNuevo}`;
        }
      }

      if (!cambio) {
        const ofertaNueva =
          typeof gen.limpiarOfertaDeRelleno === "function"
            ? gen.limpiarOfertaDeRelleno(limpio)
            : limpio;
        if (ofertaNueva.length < 3) {
          estadoChatEl.textContent =
            "Escribe un producto, servicio o ajuste claro para actualizar tu borrador.";
          return;
        }
        conv.datos.oferta = conv.datos.oferta ? `${conv.datos.oferta}, ${ofertaNueva}` : ofertaNueva;
        cambio = `Se agregó "${ofertaNueva}". Borrador actualizado.`;
        etiquetaVersion = `Oferta: ${ofertaNueva.slice(0, 28)}`;
        detalleVersion = `Se añadió "${ofertaNueva}"`;
      }

      const registroActual = conv.borradorId ? obtenerBorradorPorId(conv.borradorId) : null;
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

        // Si en el paso de WhatsApp se omite, tratarlo como VACÍO sin guardar ni mostrar "Omitir" en el chat
        const omitioWhatsapp = paso.campo === "whatsapp" && validacion.ok && validacion.omitido;
        if (!omitioWhatsapp) {
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
          renderizarHilo();
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
          renderizarTodo();
          return;
        }

        // Completó los 6 pasos: generar borrador con estado de carga claro
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
          renderizarTodo();
        } catch (error) {
          conv.pasoIndice = PASOS.length - 1;
          fijarEstadoGeneracion(false, "");
          mostrarErrorChat(
            "Hubo un problema al armar tu borrador. Intenta de nuevo.",
            () => enviarMensajeUsuario(texto)
          );
          renderizarTodo();
        }
        return;
      }

      // Conversación ya completada: ignorar "Omitir" / "sin WhatsApp" sin agregarlos al hilo
      const bajo = texto.toLowerCase().replace(/[.!?¡¿,:;]+$/g, "").trim();
      if (
        RESPUESTAS_NO_OFERTA.has(bajo) ||
        esTextoOmision(texto) ||
        (typeof gen.esTextoRelleno === "function" && gen.esTextoRelleno(texto))
      ) {
        estadoChatEl.textContent =
          "Tu borrador ya está listo. Escribe un cambio concreto (ej. cambia a tono profesional o agrega envíos) o toca Editar.";
        return;
      }

      conv.mensajes.push({
        id: crearId("msg"),
        rol: "usuario",
        tipo: "texto",
        texto
      });
      renderizarHilo();
      await aplicarCambioSeguimiento(conv, texto);
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

      const frame = document.createElement("article");
      frame.className = "preview-frame";
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
            pSub.textContent = `Atención directa en ${datos.ciudad}.`;
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

    function renderizarHilo() {
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

      // Burbuja clara de carga mientras se genera o actualiza el borrador
      if (generandoAhora) {
        const filaCarga = document.createElement("div");
        filaCarga.className = "chat-msg chat-msg-asistente";
        const burbujaCarga = document.createElement("div");
        burbujaCarga.className = "chat-bubble chat-loading-bubble";
        const sp = document.createElement("span");
        sp.className = "spinner spinner-accent";
        sp.setAttribute("aria-hidden", "true");
        const txt = document.createElement("span");
        txt.textContent = "Armando el borrador de tu página...";
        burbujaCarga.appendChild(sp);
        burbujaCarga.appendChild(txt);
        filaCarga.appendChild(burbujaCarga);
        hilo.appendChild(filaCarga);
      }

      // Chips de sugerencia según paso actual (ocultos mientras se genera)
      sugerenciasEl.textContent = "";
      if (
        !generandoAhora &&
        conv.pasoIndice < PASOS.length &&
        PASOS[conv.pasoIndice].chips.length > 0
      ) {
        sugerenciasEl.hidden = false;
        PASOS[conv.pasoIndice].chips.forEach((chipTexto) => {
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
            : "Pide un ajuste (ej. cambia a tono profesional o agrega envíos)...";
      }

      hilo.scrollTop = hilo.scrollHeight;
    }

    function renderizarListaConversaciones() {
      const lista = convsDelPropietario();
      contadorConv.textContent = String(lista.length);
      listaConvEl.textContent = "";

      if (lista.length === 0) {
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
        t.textContent = conv.titulo || "Nueva conversación";
        const f = document.createElement("span");
        f.className = "sidebar-item-meta";
        f.textContent = formatearFecha(conv.actualizadaEn || conv.creadaEn);
        btnAbrir.appendChild(t);
        btnAbrir.appendChild(f);
        btnAbrir.addEventListener("click", () => {
          confirmandoBorrarConvId = null;
          fijarConvActiva(conv.id);
          if (conv.borradorId) {
            fijarBorradorActivo(conv.borradorId);
          }
          renderizarTodo();
          cambiarModo("chat");
          abrirSidebar(false);
        });

        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "sidebar-item-del";
        btnDel.setAttribute("aria-label", `Borrar conversación ${conv.titulo}`);
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
          msg.textContent = `¿Borrar la conversación "${conv.titulo || "Nueva conversación"}"?`;

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

    function renderizarListaBorradores() {
      const lista = borradoresDelPropietario();
      contadorBorradores.textContent = String(lista.length);
      if (badgeBorradoresMobile) {
        badgeBorradoresMobile.textContent = String(lista.length);
        badgeBorradoresMobile.hidden = lista.length === 0;
      }
      listaBorradoresEl.textContent = "";

      if (lista.length === 0) {
        borradoresVacio.hidden = false;
        listaBorradoresEl.hidden = true;
        return;
      }

      borradoresVacio.hidden = true;
      listaBorradoresEl.hidden = false;

      lista.forEach((reg) => {
        const li = document.createElement("li");
        li.className =
          reg.id === borradorActivoId ? "sidebar-draft-card is-active" : "sidebar-draft-card";

        const head = document.createElement("div");
        head.className = "draft-title-row";
        const nom = document.createElement("span");
        nom.className = "draft-name";
        nom.textContent = reg.datos.nombre;
        const pill = document.createElement("span");
        pill.className = "draft-open-pill";
        pill.textContent = reg.publicadaSlug ? "Publicada" : "Borrador";
        head.appendChild(nom);
        head.appendChild(pill);

        const meta = document.createElement("p");
        meta.className = "draft-meta";
        const gTxt =
          reg.datos.giroTexto || gen.GIROS_ETIQUETAS[reg.datos.giro] || reg.datos.giro;
        meta.textContent = `${gTxt} · ${reg.datos.ciudad}`;

        const acciones = document.createElement("div");
        acciones.className = "sidebar-draft-actions";

        const bReabrir = document.createElement("button");
        bReabrir.type = "button";
        bReabrir.className = "btn btn-secondary btn-sm";
        bReabrir.dataset.draftAction = "reabrir";
        bReabrir.dataset.id = reg.id;
        bReabrir.textContent = "Reabrir";
        bReabrir.addEventListener("click", () => {
          confirmandoBorrarDraftId = null;
          fijarBorradorActivo(reg.id);
          const convVinculada = convsDelPropietario().find((c) => c.borradorId === reg.id);
          if (convVinculada) {
            fijarConvActiva(convVinculada.id);
          }
          renderizarTodo();
          cambiarModo("editor");
          abrirSidebar(false);
        });

        const bDup = document.createElement("button");
        bDup.type = "button";
        bDup.className = "btn btn-secondary btn-sm";
        bDup.dataset.draftAction = "duplicar";
        bDup.dataset.id = reg.id;
        bDup.textContent = "Duplicar";
        bDup.addEventListener("click", () => duplicarBorrador(reg));

        const bDel = document.createElement("button");
        bDel.type = "button";
        bDel.className = "btn btn-danger-ghost btn-sm";
        bDel.dataset.draftAction = "borrar";
        bDel.dataset.id = reg.id;
        bDel.textContent = "Borrar";
        bDel.addEventListener("click", () => {
          confirmandoBorrarDraftId = confirmandoBorrarDraftId === reg.id ? null : reg.id;
          renderizarListaBorradores();
        });

        acciones.appendChild(bReabrir);
        acciones.appendChild(bDup);
        acciones.appendChild(bDel);

        li.appendChild(head);
        li.appendChild(meta);
        li.appendChild(acciones);

        if (confirmandoBorrarDraftId === reg.id) {
          const confirmBox = document.createElement("div");
          confirmBox.className = "confirm-box sidebar-confirm-box";
          confirmBox.setAttribute("role", "alert");

          const msg = document.createElement("p");
          msg.textContent = `¿Borrar "${reg.datos.nombre}"? Podrás deshacerlo justo después.`;

          const confActions = document.createElement("div");
          confActions.className = "confirm-actions";

          const bSi = document.createElement("button");
          bSi.type = "button";
          bSi.className = "btn btn-danger-ghost btn-sm";
          bSi.dataset.draftConfirmDelete = reg.id;
          bSi.textContent = "Sí, borrar";
          bSi.addEventListener("click", () => borrarBorrador(reg.id));

          const bNo = document.createElement("button");
          bNo.type = "button";
          bNo.className = "btn btn-secondary btn-sm";
          bNo.textContent = "Cancelar";
          bNo.addEventListener("click", () => {
            confirmandoBorrarDraftId = null;
            renderizarListaBorradores();
          });

          confActions.appendChild(bSi);
          confActions.appendChild(bNo);
          confirmBox.appendChild(msg);
          confirmBox.appendChild(confActions);
          li.appendChild(confirmBox);
        }

        listaBorradoresEl.appendChild(li);
      });
    }

    function renderizarCuentaSidebar() {
      cuentaSidebarBox.textContent = "";
      const sesion =
        window.dmdCuenta && typeof window.dmdCuenta.obtenerSesionActual === "function"
          ? window.dmdCuenta.obtenerSesionActual()
          : null;

      if (sesion) {
        const nom = document.createElement("p");
        nom.className = "sidebar-user-name";
        nom.textContent = sesion.nombre;
        const cor = document.createElement("p");
        cor.className = "sidebar-user-email";
        cor.textContent = sesion.correo;

        cuentaSidebarBox.appendChild(nom);
        cuentaSidebarBox.appendChild(cor);

        if (sesion.cuotaTexto) {
          const cuotaEl = document.createElement("p");
          cuotaEl.className = "sidebar-user-email";
          cuotaEl.textContent = `Cuota: ${sesion.cuotaTexto}`;
          cuentaSidebarBox.appendChild(cuotaEl);
        }

        const row = document.createElement("div");
        row.className = "sidebar-user-actions";
        const aCuenta = document.createElement("a");
        aCuenta.className = "btn btn-secondary btn-sm";
        aCuenta.href = "login.html";
        aCuenta.textContent = "Mi cuenta";
        const bSalir = document.createElement("button");
        bSalir.type = "button";
        bSalir.className = "btn btn-secondary btn-sm";
        bSalir.textContent = "Salir";
        bSalir.addEventListener("click", async () => {
          if (!window.dmdCuenta) {
            return;
          }
          bSalir.disabled = true;
          try {
            await window.dmdCuenta.cerrarSesion();
          } finally {
            bSalir.disabled = false;
          }
        });
        row.appendChild(aCuenta);
        row.appendChild(bSalir);
        cuentaSidebarBox.appendChild(row);
      } else {
        const aLogin = document.createElement("a");
        aLogin.className = "btn btn-secondary btn-full btn-sm";
        aLogin.href = "login.html";
        aLogin.textContent = "Iniciar sesión";
        cuentaSidebarBox.appendChild(aLogin);
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

    function renderizarTodo() {
      renderizarCuentaSidebar();
      renderizarListaConversaciones();
      renderizarListaBorradores();
      renderizarHilo();
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
          renderizarListaBorradores();
          renderizarHilo();
        },
        alPublicarBorrador(reg) {
          publicarBorrador(reg);
        },
        alIrAlChat() {
          cambiarModo("chat");
        },
        alDescargarRespaldo() {
          descargarRespaldoJson();
        },
        alPedirImportar() {
          inputImportar.click();
        }
      });
    }

    // Eventos UI
    btnAbrirSidebar.addEventListener("click", () => abrirSidebar(true));
    btnCerrarSidebar.addEventListener("click", () => abrirSidebar(false));
    backdrop.addEventListener("click", () => abrirSidebar(false));

    btnNuevaSidebar.addEventListener("click", () =>
      ejecutarCuandoHidrate(crearNuevaConversacion)
    );

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

    tabModoChat.addEventListener("click", () => cambiarModo("chat"));
    tabModoEditor.addEventListener("click", () => cambiarModo("editor"));

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

    btnDescRespaldo.addEventListener("click", descargarRespaldoJson);
    btnImpRespaldo.addEventListener("click", () => inputImportar.click());
    inputImportar.addEventListener("change", () => {
      if (inputImportar.files && inputImportar.files[0]) {
        importarRespaldoJson(inputImportar.files[0]);
      }
    });

    if (window.dmdCuenta && typeof window.dmdCuenta.alCambiarSesion === "function") {
      window.dmdCuenta.alCambiarSesion((_sesion, motivo) => {
        const hidratado =
          !window.dmdAlmacen ||
          typeof window.dmdAlmacen.estaHidratado !== "function" ||
          window.dmdAlmacen.estaHidratado();
        restaurarEstadoCompleto(motivo !== "hidratacion" && hidratado);
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
