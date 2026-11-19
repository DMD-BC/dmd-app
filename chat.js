"use strict";

/* ==========================================================================
   dmd - Controlador de chat de dmd (app.html)
   Conversación guiada paso a paso para armar la página web de un negocio,
   historial de conversaciones, páginas y borradores, duplicar, publicar,
   respaldo JSON y conexión con el editor visual.
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
      pregunta: "¿Cómo se llama tu negocio?",
      chips: []
    },
    {
      campo: "giro",
      pregunta: "¿Cuál es el giro?",
      chips: ["Tienda", "Comida", "Servicios", "Salud y belleza", "Taller u oficio", "Otro"]
    },
    {
      campo: "ciudad",
      pregunta: "¿En qué ciudad estás?",
      chips: []
    },
    {
      campo: "oferta",
      pregunta: "¿Qué vendes o qué servicios ofreces?",
      chips: []
    },
    {
      campo: "tono",
      pregunta: "¿Qué tono prefieres?",
      chips: ["Cercano", "Profesional", "Formal"]
    },
    {
      campo: "whatsapp",
      pregunta: "¿Cuál es tu WhatsApp? (con lada, ej. 528112345678)",
      chips: ["Omitir"]
    }
  ];

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
    const btnNuevaTop = document.getElementById("btn-nueva-conv-top");

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

    const sugerenciasEl = document.getElementById("chat-sugerencias");
    const estadoChatEl = document.getElementById("chat-estado");
    const formChat = document.getElementById("form-chat");
    const entradaChat = document.getElementById("chat-entrada");
    const btnEnviar = document.getElementById("btn-chat-enviar");

    let todasConversaciones = [];
    let todosBorradores = [];
    let todasPublicadas = [];
    let convActivaId = null;
    let convBorradorMemoria = null;
    let borradorActivoId = null;
    let editandoMsgId = null;
    let modoActual = "chat";

    function cargarColecciones() {
      const c = leer(KEY_CONVERSACIONES, []);
      const b = leer(KEY_BORRADORES, []);
      const p = leer(KEY_PUBLICADAS, []);
      todasConversaciones = Array.isArray(c) ? c : [];
      todosBorradores = Array.isArray(b) ? b : [];
      todasPublicadas = Array.isArray(p) ? p : [];
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
        datos: { nombre: "", giro: "", ciudad: "", oferta: "", tono: "", whatsapp: "" },
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
      // Mantener en memoria hasta que el usuario envíe su primer mensaje para nunca
      // sobrescribir estado guardado con una conversación vacía.
      convActivaId = null;
      convBorradorMemoria = crearObjetoConversacionVacia();
      editandoMsgId = null;
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
        registro.publicadaSlug = gen.crearSlugPublicacion(registro.datos.nombre);
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

    async function guardarOActualizarBorradorDesdeConv(conv, variante, etiquetaVersion) {
      const datos = clonar(conv.datos);
      const borrador =
        (gen.generarBorradorConServicio
          ? await gen.generarBorradorConServicio(datos, variante)
          : null) || gen.generarBorrador(datos, variante);
      let registro = conv.borradorId ? obtenerBorradorPorId(conv.borradorId) : null;

      if (registro) {
        registro.datos = datos;
        registro.borrador = borrador;
        registro.actualizadoEn = new Date().toISOString();
        if (window.dmdEditor) {
          window.dmdEditor.asegurarEstructuraBorrador(registro);
          window.dmdEditor.registrarVersion(registro, etiquetaVersion || "Actualizado desde chat");
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
          publicadaSlug: "",
          publicadaEn: ""
        };
        if (window.dmdEditor) {
          window.dmdEditor.asegurarEstructuraBorrador(registro);
          window.dmdEditor.registrarVersion(registro, "Versión inicial");
        }
        todosBorradores.unshift(registro);
        conv.borradorId = registro.id;
      }

      conv.titulo = datos.nombre || conv.titulo;
      conv.actualizadaEn = new Date().toISOString();
      guardarColecciones();
      fijarBorradorActivo(registro.id);
      return registro;
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
      guardar(KEY_BORRADORES, todosBorradores);
      fijarBorradorActivo(copia.id);
      renderizarListaBorradores();
      estadoChatEl.textContent = `Se duplicó ${registro.datos.nombre}.`;
    }

    function borrarBorrador(id) {
      const reg = obtenerBorradorPorId(id);
      if (!reg) {
        return;
      }
      const nombre = reg.datos.nombre;
      if (reg.publicadaSlug) {
        todasPublicadas = todasPublicadas.filter((p) => p && p.slug !== reg.publicadaSlug);
      }
      todosBorradores = todosBorradores.filter((b) => b && b.id !== id);
      todasConversaciones.forEach((c) => {
        if (c && c.borradorId === id) {
          c.borradorId = null;
          c.mensajes = c.mensajes.filter((m) => m.borradorId !== id);
        }
      });
      if (borradorActivoId === id) {
        borradorActivoId = null;
        if (window.dmdEditor) {
          window.dmdEditor.cargarBorrador(null, false);
        }
      }
      guardarColecciones({ permitirVacio: true });
      renderizarTodo();
      estadoChatEl.textContent = `Se borró ${nombre}.`;
    }

    function borrarConversacion(id) {
      todasConversaciones = todasConversaciones.filter((c) => c && c.id !== id);
      if (convActivaId === id) {
        convActivaId = null;
        asegurarConversacionActiva();
      }
      guardarColecciones({ permitirVacio: true });
      renderizarTodo();
    }

    function validarRespuestaPaso(campo, texto) {
      const limpio = gen.limpiarTexto(texto);
      if (campo === "nombre") {
        if (limpio.length < 2) {
          return { ok: false, aviso: "Escribe el nombre de tu negocio." };
        }
        return { ok: true, valor: limpio };
      }
      if (campo === "giro") {
        const g = gen.normalizarGiro(limpio);
        if (!g) {
          return {
            ok: false,
            aviso: "Elige Tienda, Comida, Servicios, Salud y belleza, Taller u oficio u Otro."
          };
        }
        return { ok: true, valor: g };
      }
      if (campo === "ciudad") {
        if (limpio.length < 2) {
          return { ok: false, aviso: "Escribe la ciudad." };
        }
        return { ok: true, valor: limpio };
      }
      if (campo === "oferta") {
        if (limpio.length < 4) {
          return { ok: false, aviso: "Escribe qué productos o servicios ofreces." };
        }
        return { ok: true, valor: limpio };
      }
      if (campo === "tono") {
        const t = gen.normalizarTono(limpio);
        if (!t) {
          return { ok: false, aviso: "Elige Cercano, Profesional o Formal." };
        }
        return { ok: true, valor: t };
      }
      if (campo === "whatsapp") {
        if (/^(omitir|no|despues|después|ninguno|pendiente|saltar)/i.test(limpio)) {
          return { ok: true, valor: "" };
        }
        const digitos = gen.limpiarDigitos(limpio);
        if (digitos.length < 10 || digitos.length > 15) {
          return {
            ok: false,
            aviso: "Escribe entre 10 y 15 dígitos (ej. 528112345678) o toca Omitir."
          };
        }
        return { ok: true, valor: digitos };
      }
      return { ok: true, valor: limpio };
    }

    async function aplicarCambioSeguimiento(conv, texto) {
      const limpio = gen.limpiarTexto(texto);
      const bajo = limpio.toLowerCase();
      let cambio = "";

      const tonoDetectado =
        /tono\s+(cercano|profesional|formal)/i.exec(limpio) ||
        (/cambia|pon|usa|hazlo/.test(bajo) && /\b(cercano|profesional|formal)\b/i.exec(limpio));

      if (tonoDetectado) {
        conv.datos.tono = gen.normalizarTono(tonoDetectado[1]);
        cambio = `Tono cambiado a ${gen.TONOS_ETIQUETAS[conv.datos.tono]}.`;
      } else if (/whatsapp|tel[eé]fono|n[uú]mero/i.test(bajo)) {
        const dig = gen.limpiarDigitos(limpio);
        if (dig.length >= 10 && dig.length <= 15) {
          conv.datos.whatsapp = dig;
          cambio = `WhatsApp actualizado: ${dig}.`;
        } else if (/quita|borra|sin whatsapp/i.test(bajo)) {
          conv.datos.whatsapp = "";
          cambio = "WhatsApp eliminado.";
        }
      } else if (/ciudad\s+(?:a|en|:)?\s*(.+)/i.test(limpio)) {
        const m = /ciudad\s+(?:a|en|:)?\s*(.+)/i.exec(limpio);
        if (m && m[1].trim().length >= 2) {
          conv.datos.ciudad = gen.limpiarTexto(m[1]);
          cambio = `Ciudad actualizada: ${conv.datos.ciudad}.`;
        }
      } else if (/agrega|añade|incluye|suma|tambi[eé]n/i.test(bajo)) {
        const extra = limpio
          .replace(/^(agrega|añade|incluye|suma|pon|también|tambien)\s+/i, "")
          .trim();
        if (extra.length >= 3) {
          conv.datos.oferta = conv.datos.oferta
            ? `${conv.datos.oferta}, ${extra}`
            : extra;
          cambio = `Agregado: "${extra}".`;
        }
      } else if (/nombre\s+(?:a|:)?\s*(.+)/i.test(limpio)) {
        const m = /nombre\s+(?:a|:)?\s*(.+)/i.exec(limpio);
        if (m && m[1].trim().length >= 2) {
          conv.datos.nombre = gen.limpiarTexto(m[1]);
          cambio = `Nombre actualizado: ${conv.datos.nombre}.`;
        }
      }

      if (!cambio) {
        // Tratar como actualización directa de oferta si escribe productos/servicios
        conv.datos.oferta = conv.datos.oferta
          ? `${conv.datos.oferta}, ${limpio}`
          : limpio;
        cambio = `Agregado: "${limpio}".`;
      }

      const registroActual = conv.borradorId ? obtenerBorradorPorId(conv.borradorId) : null;
      const varianteActual = registroActual && registroActual.borrador ? registroActual.borrador.variante || 0 : 0;
      const actualizado = await guardarOActualizarBorradorDesdeConv(conv, varianteActual, "Ajuste por chat");

      conv.mensajes.push({
        id: crearId("msg"),
        rol: "asistente",
        tipo: "borrador",
        texto: cambio,
        borradorId: actualizado.id
      });
    }

    async function enviarMensajeUsuario(textoCrudo) {
      const conv = obtenerConvActiva() || asegurarConversacionActiva();
      const texto = gen.limpiarTexto(textoCrudo);
      if (!texto) {
        return;
      }

      // Promover conversación en memoria a guardada al primer mensaje real del usuario
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
        conv.mensajes.push({
          id: crearId("msg"),
          rol: "usuario",
          tipo: "texto",
          campo: paso.campo,
          texto
        });

        const validacion = validarRespuestaPaso(paso.campo, texto);
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

        // Completó las preguntas: armar el borrador
        const registro = await guardarOActualizarBorradorDesdeConv(conv, 0, "Versión inicial");
        conv.mensajes.push({
          id: crearId("msg"),
          rol: "asistente",
          tipo: "borrador",
          texto: `Borrador listo para ${registro.datos.nombre}.`,
          borradorId: registro.id
        });
        guardarColecciones();
        renderizarTodo();
        return;
      }

      // Conversación ya completada: permitir cambios por chat
      conv.mensajes.push({
        id: crearId("msg"),
        rol: "usuario",
        tipo: "texto",
        texto
      });
      aplicarCambioSeguimiento(conv, texto).then(() => {
        guardar(KEY_CONVERSACIONES, todasConversaciones);
        renderizarTodo();
      });
      return;
    }

    async function guardarEdicionMensajeUsuario(conv, msg, nuevoTexto) {
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
        msg.texto = limpio;
        conv.datos[msg.campo] = val.valor;
        if (msg.campo === "nombre") {
          conv.titulo = val.valor;
        }
        if (conv.borradorId) {
          const existente = obtenerBorradorPorId(conv.borradorId);
          const v = existente && existente.borrador ? existente.borrador.variante || 0 : 0;
          await guardarOActualizarBorradorDesdeConv(conv, v, `Editó ${msg.campo} en chat`);
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
      const { datos, borrador } = registro;
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

      const hero = document.createElement("div");
      hero.className = "preview-hero";
      const h3 = document.createElement("h3");
      h3.className = "preview-title";
      h3.textContent = borrador.titulo;
      const p = document.createElement("p");
      p.className = "preview-intro";
      p.textContent = borrador.presentacion;
      hero.appendChild(h3);
      hero.appendChild(p);
      body.appendChild(hero);

      const bServ = document.createElement("div");
      bServ.className = "preview-block";
      const hs = document.createElement("h4");
      hs.className = "preview-block-title";
      hs.textContent = "Servicios";
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

      const bBen = document.createElement("div");
      bBen.className = "preview-block";
      const hb = document.createElement("h4");
      hb.className = "preview-block-title";
      hb.textContent = "Beneficios";
      const ulB = document.createElement("ul");
      ulB.className = "preview-benefits";
      borrador.beneficios.forEach((b) => {
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

      const bFaq = document.createElement("div");
      bFaq.className = "preview-block";
      const hf = document.createElement("h4");
      hf.className = "preview-block-title";
      hf.textContent = "Preguntas frecuentes";
      const listF = document.createElement("div");
      listF.className = "faq-list";
      borrador.preguntasFrecuentes.forEach((f, idx) => {
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
        sp.textContent = `Enviar WhatsApp a ${datos.nombre}`;
        a.appendChild(sp);
        bWa.appendChild(a);
      } else {
        const av = document.createElement("p");
        av.className = "notice-box";
        av.textContent = "Sin WhatsApp todavía.";
        bWa.appendChild(av);
      }
      body.appendChild(bWa);
      frame.appendChild(body);
      card.appendChild(frame);

      // Barra de acciones del borrador
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
      btnRegenerar.textContent = "Regenerar";
      btnRegenerar.addEventListener("click", async () => {
        const conv = obtenerConvActiva();
        if (!conv) {
          return;
        }
        const sigVar = ((registro.borrador && registro.borrador.variante) || 0) + 1;
        conv.datos = clonar(registro.datos);
        await guardarOActualizarBorradorDesdeConv(conv, sigVar, "Regenerado");
        estadoChatEl.textContent = "Borrador regenerado.";
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
          estadoChatEl.textContent = ok ? "Copiado." : "No se pudo copiar.";
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
          estadoChatEl.textContent = "Página publicada.";
        }
      });

      acciones.appendChild(btnEditarVis);
      acciones.appendChild(btnRegenerar);
      acciones.appendChild(btnCopiar);
      acciones.appendChild(btnDuplicar);
      acciones.appendChild(btnPublicar);
      card.appendChild(acciones);

      // Si ya está publicada, mostrar enlace + compartir + activar
      if (registro.publicadaSlug) {
        const rutaVer = `ver.html?id=${encodeURIComponent(registro.publicadaSlug)}`;
        const urlPub = gen.construirUrlPublicada(registro.publicadaSlug);
        const boxPub = document.createElement("div");
        boxPub.className = "published-box published-box-inline";

        const lbl = document.createElement("p");
        lbl.className = "published-label";
        lbl.textContent = "Publicada";
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
        aPago.textContent = "Activar";

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

    function renderizarHilo() {
      const conv = obtenerConvActiva();
      hilo.textContent = "";
      if (!conv) {
        return;
      }

      conv.mensajes.forEach((msg) => {
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

        if (msg.tipo === "borrador" && msg.borradorId) {
          const reg = obtenerBorradorPorId(msg.borradorId);
          if (reg) {
            fila.appendChild(construirTarjetaBorradorEnChat(reg));
          }
        }

        hilo.appendChild(fila);
      });

      // Chips de sugerencia según paso actual
      sugerenciasEl.textContent = "";
      if (conv.pasoIndice < PASOS.length && PASOS[conv.pasoIndice].chips.length > 0) {
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
        li.className =
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
        btnDel.addEventListener("click", () => borrarConversacion(conv.id));

        li.appendChild(btnAbrir);
        li.appendChild(btnDel);
        listaConvEl.appendChild(li);
      });
    }

    function renderizarListaBorradores() {
      const lista = borradoresDelPropietario();
      contadorBorradores.textContent = String(lista.length);
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
        const gTxt = gen.GIROS_ETIQUETAS[reg.datos.giro] || reg.datos.giro;
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
        bDel.addEventListener("click", () => borrarBorrador(reg.id));

        acciones.appendChild(bReabrir);
        acciones.appendChild(bDup);
        acciones.appendChild(bDel);

        li.appendChild(head);
        li.appendChild(meta);
        li.appendChild(acciones);
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
      estadoRespaldo.textContent = "Copia descargada.";
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
              ? `Importadas: ${importados}.`
              : "Sin elementos nuevos.";
        } catch (error) {
          estadoRespaldo.textContent = "Archivo no válido.";
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
    btnNuevaTop.addEventListener("click", () =>
      ejecutarCuandoHidrate(crearNuevaConversacion)
    );

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

    // No crear ni mostrar conversación vacía antes de terminar de hidratar todas las capas.
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
