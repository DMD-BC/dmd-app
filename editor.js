"use strict";

/* ==========================================================================
   dmd - Editor visual, plantillas, SEO, publicación con subdominio,
   analítica con confirmación, historial de versiones y vista previa real.
   ========================================================================== */

(function inicializarModuloEditor() {
  const SECCIONES_DEFECTO = [
    "presentacion",
    "servicios",
    "beneficios",
    "preguntas",
    "contacto"
  ];

  const ETIQUETAS_SECCION = {
    presentacion: "Presentación",
    servicios: "Servicios",
    beneficios: "Beneficios",
    preguntas: "Preguntas frecuentes",
    contacto: "Contacto y formulario"
  };

  const PLANTILLAS_ETIQUETAS = {
    clasica: "Clásica",
    editorial: "Editorial",
    directa: "Directa"
  };

  const FUENTES_MAPA = {
    sistema: "var(--font-sans)",
    editorial: 'Georgia, "Times New Roman", Times, serif',
    moderna: "var(--font-display)"
  };

  const COLOR_MARCA_UNICO = "#0f5c4d";

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function formatearFechaCorta(iso) {
    try {
      return new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch (error) {
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
    } catch (error) {
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

  function comprimirImagenArchivo(archivo, maxAncho) {
    if (
      window.dmdGenerador &&
      typeof window.dmdGenerador.comprimirImagenArchivo === "function"
    ) {
      return window.dmdGenerador.comprimirImagenArchivo(archivo, maxAncho);
    }
    return new Promise((resolve, reject) => {
      const tipo = String((archivo && archivo.type) || "").toLowerCase();
      if (!tipo.startsWith("image/")) {
        reject(new Error("Solo se permiten archivos de imagen."));
        return;
      }
      const lector = new FileReader();
      lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
      lector.onload = () => {
        const dataUrl = String(lector.result || "");
        const img = new Image();
        img.onerror = () => resolve(dataUrl);
        img.onload = () => {
          try {
            const escala = img.width > maxAncho ? maxAncho / img.width : 1;
            const w = Math.max(1, Math.round(img.width * escala));
            const h = Math.max(1, Math.round(img.height * escala));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(dataUrl);
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            const tipoSalida = archivo.type === "image/png" ? "image/png" : "image/jpeg";
            const resultado =
              tipoSalida === "image/jpeg"
                ? canvas.toDataURL("image/jpeg", 0.78)
                : canvas.toDataURL("image/png");
            resolve(resultado);
          } catch (error) {
            resolve(dataUrl);
          }
        };
        img.src = dataUrl;
      };
      lector.readAsDataURL(archivo);
    });
  }

  function aplicarPortadaEnRegistro(registro, portada) {
    if (!registro) {
      return;
    }
    if (!registro.diseno || typeof registro.diseno !== "object") {
      registro.diseno = {};
    }
    const gen = window.dmdGenerador;
    const giroActual = (registro.datos && registro.datos.giro) || "otro";
    const nombreCrudo = (registro.datos && registro.datos.nombre) || "Mi negocio";
    const nombreActual =
      gen && typeof gen.formatearNombrePropio === "function"
        ? gen.formatearNombrePropio(nombreCrudo, "nombre") || "Mi negocio"
        : nombreCrudo;

    if (!portada || !portada.url) {
      registro.diseno.portadaDataUrl = "";
      registro.diseno.portadaOrigen = "ninguna";
      if (registro.borrador && typeof registro.borrador === "object") {
        registro.borrador.portada = null;
      }
      return;
    }

    const origen =
      portada.origen === "propia" || String(portada.url).startsWith("data:image/")
        ? "propia"
        : "catalogo";
    let alt =
      typeof portada.alt === "string" && portada.alt.trim()
        ? portada.alt.trim()
        : `Imagen principal de ${nombreActual}`;
    if (nombreActual && alt.toLowerCase().includes(nombreActual.toLowerCase()) && !alt.includes(nombreActual)) {
      const esc = nombreActual.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      alt = alt.replace(new RegExp(esc, "gi"), nombreActual);
    }

    registro.diseno.portadaDataUrl = String(portada.url);
    registro.diseno.portadaAlt = alt;
    registro.diseno.portadaOrigen = origen;
    registro.diseno.portadaGiro = portada.giro || giroActual;
    if (Number.isInteger(portada.indice)) {
      registro.diseno.portadaIndice = portada.indice;
    }
    if (registro.borrador && typeof registro.borrador === "object") {
      registro.borrador.portada = {
        url: registro.diseno.portadaDataUrl,
        alt: registro.diseno.portadaAlt,
        giro: registro.diseno.portadaGiro,
        indice: Number.isInteger(registro.diseno.portadaIndice)
          ? registro.diseno.portadaIndice
          : 0,
        origen
      };
    }
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
    path.setAttribute(
      "d",
      "M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5Z"
    );
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

  function construirKeywordsPorDefecto(registro) {
    const partes = [];
    const datos = registro.datos || {};
    if (datos.nombre) {
      partes.push(datos.nombre);
    }
    if (datos.giroTexto) {
      partes.push(datos.giroTexto);
    } else if (datos.giro && datos.giro !== "otro") {
      partes.push(datos.giro);
    }
    if (datos.ciudad) {
      partes.push(datos.ciudad);
    }
    if (datos.oferta) {
      const primera = String(datos.oferta).split(/[,;\n]+/)[0];
      if (primera && primera.trim().length >= 3) {
        partes.push(primera.trim());
      }
    }
    return partes.join(", ").slice(0, 160);
  }

  function asegurarEstructuraBorrador(registro) {
    if (!registro) {
      return null;
    }
    const gen = window.dmdGenerador;
    if (registro.datos && gen) {
      if (typeof gen.formatearNombrePropio === "function") {
        if (registro.datos.nombre) {
          registro.datos.nombre = gen.formatearNombrePropio(registro.datos.nombre, "nombre");
        }
        if (registro.datos.ciudad) {
          registro.datos.ciudad = gen.formatearNombrePropio(registro.datos.ciudad, "ciudad");
        }
      }
      const nNorm = String(registro.datos.nombre || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      const cNorm = String(registro.datos.ciudad || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      if (nNorm === "panaderia la espiga" && cNorm === "mexicali") {
        registro.datos.ciudad = "Guadalajara";
      }
      if (typeof gen.esOmisionWhatsapp === "function" && gen.esOmisionWhatsapp(registro.datos.whatsapp)) {
        registro.datos.whatsapp = "";
      } else {
        const digWa = String(registro.datos.whatsapp || "").replace(/\D/g, "");
        registro.datos.whatsapp = digWa.length >= 10 && digWa.length <= 15 ? digWa : "";
      }
      if (registro.borrador && typeof registro.borrador === "object") {
        registro.borrador.whatsapp = registro.datos.whatsapp;
      }
      if (typeof gen.limpiarOfertaDeRelleno === "function" && registro.datos.oferta) {
        const ofertaSaneada = gen.limpiarOfertaDeRelleno(registro.datos.oferta);
        if (ofertaSaneada) {
          registro.datos.oferta = ofertaSaneada;
        }
      }
      if (typeof gen.sanearBorradorLegado === "function") {
        gen.sanearBorradorLegado(registro);
      }
    }

    const nombre = (registro.datos && registro.datos.nombre) || "Mi negocio";
    const tituloBase = (registro.borrador && registro.borrador.titulo) || nombre;
    const descBase = (registro.borrador && registro.borrador.presentacion) || "";

    if (!registro.diseno || typeof registro.diseno !== "object") {
      registro.diseno = {};
    }
    if (!["clasica", "editorial", "directa"].includes(registro.diseno.plantilla)) {
      registro.diseno.plantilla = "clasica";
    }
    // Un solo color principal verde profundo #0f5c4d con blanco y neutros
    registro.diseno.colorMarca = COLOR_MARCA_UNICO;

    if (!FUENTES_MAPA[registro.diseno.fuente]) {
      registro.diseno.fuente = "sistema";
    }
    const ordenActualValido =
      Array.isArray(registro.diseno.ordenSecciones) &&
      registro.diseno.ordenSecciones.length >= 3 &&
      registro.diseno.ordenSecciones.every((sec) => SECCIONES_DEFECTO.includes(sec));
    if (!ordenActualValido) {
      const ordenSugerido =
        (registro.borrador &&
          registro.borrador.estructura &&
          Array.isArray(registro.borrador.estructura.ordenSecciones) &&
          registro.borrador.estructura.ordenSecciones.length >= 3 &&
          registro.borrador.estructura.ordenSecciones) ||
        (gen &&
          typeof gen.obtenerEstructuraNegocio === "function" &&
          gen.obtenerEstructuraNegocio(registro.datos).ordenSecciones) ||
        SECCIONES_DEFECTO;
      registro.diseno.ordenSecciones = ordenSugerido.slice();
    }
    if (typeof registro.diseno.logoDataUrl !== "string") {
      registro.diseno.logoDataUrl = "";
    }
    if (typeof registro.diseno.logoAlt !== "string") {
      registro.diseno.logoAlt = "";
    }
    if (typeof registro.diseno.portadaDataUrl !== "string") {
      registro.diseno.portadaDataUrl = "";
    }
    if (typeof registro.diseno.portadaAlt !== "string") {
      registro.diseno.portadaAlt = "";
    }
    if (nombre && registro.diseno.portadaAlt) {
      const escNom = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (
        registro.diseno.portadaAlt.toLowerCase().includes(nombre.toLowerCase()) &&
        !registro.diseno.portadaAlt.includes(nombre)
      ) {
        registro.diseno.portadaAlt = registro.diseno.portadaAlt.replace(
          new RegExp(escNom, "gi"),
          nombre
        );
      }
    }
    if (nombre && registro.diseno.logoAlt) {
      const escNom = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (
        registro.diseno.logoAlt.toLowerCase().includes(nombre.toLowerCase()) &&
        !registro.diseno.logoAlt.includes(nombre)
      ) {
        registro.diseno.logoAlt = registro.diseno.logoAlt.replace(
          new RegExp(escNom, "gi"),
          nombre
        );
      }
    }
    if (!["catalogo", "propia", "ninguna"].includes(registro.diseno.portadaOrigen)) {
      if (registro.diseno.portadaDataUrl) {
        registro.diseno.portadaOrigen = registro.diseno.portadaDataUrl.startsWith("data:image/")
          ? "propia"
          : "catalogo";
      } else {
        registro.diseno.portadaOrigen = "";
      }
    }
    if (!Number.isInteger(registro.diseno.portadaIndice)) {
      registro.diseno.portadaIndice = 0;
    }
    if (typeof registro.diseno.portadaGiro !== "string" || !registro.diseno.portadaGiro) {
      registro.diseno.portadaGiro = (registro.datos && registro.datos.giro) || "otro";
    }

    if (!registro.diseno.portadaDataUrl && registro.diseno.portadaOrigen !== "ninguna") {
      const portadaBorrador =
        registro.borrador &&
        registro.borrador.portada &&
        typeof registro.borrador.portada.url === "string" &&
        registro.borrador.portada.url
          ? registro.borrador.portada
          : gen && typeof gen.seleccionarPortada === "function"
            ? gen.seleccionarPortada(
                registro.datos,
                registro.borrador && registro.borrador.variante
              )
            : null;
      if (portadaBorrador) {
        aplicarPortadaEnRegistro(registro, portadaBorrador);
      }
    } else if (registro.diseno.portadaDataUrl && registro.borrador && !registro.borrador.portada) {
      registro.borrador.portada = {
        url: registro.diseno.portadaDataUrl,
        alt: registro.diseno.portadaAlt || `Imagen principal de ${nombre}`,
        giro: registro.diseno.portadaGiro,
        indice: registro.diseno.portadaIndice,
        origen: registro.diseno.portadaOrigen || "catalogo"
      };
    }

    if (!registro.seo || typeof registro.seo !== "object") {
      registro.seo = {};
    }
    if (typeof registro.seo.titulo !== "string" || !registro.seo.titulo.trim()) {
      registro.seo.titulo = tituloBase.slice(0, 70);
    }
    if (typeof registro.seo.descripcion !== "string" || !registro.seo.descripcion.trim()) {
      registro.seo.descripcion = descBase.slice(0, 165);
    }
    if (typeof registro.seo.palabrasClave !== "string") {
      registro.seo.palabrasClave = construirKeywordsPorDefecto(registro);
    }

    if (!registro.dominio || typeof registro.dominio !== "object") {
      registro.dominio = { subdominio: "", dominioPropio: "" };
    }
    if (typeof registro.dominio.dominioPropio !== "string") {
      registro.dominio.dominioPropio = "";
    }
    if (typeof registro.dominio.subdominio !== "string" || !registro.dominio.subdominio.trim()) {
      const subBase =
        gen && typeof gen.normalizarSubdominio === "function"
          ? gen.normalizarSubdominio(registro.publicadaSlug || nombre)
          : String(nombre || "mi-negocio")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");
      registro.dominio.subdominio = subBase.length >= 3 ? subBase : `${subBase || "pagina"}-dmd`;
    }

    if (!registro.analitica || typeof registro.analitica !== "object") {
      registro.analitica = {
        visitas: 0,
        clicsWhatsapp: 0,
        enviosFormulario: 0,
        idAnalitica: "",
        idPixel: ""
      };
    }
    registro.analitica.visitas = Number(registro.analitica.visitas) || 0;
    registro.analitica.clicsWhatsapp = Number(registro.analitica.clicsWhatsapp) || 0;
    registro.analitica.enviosFormulario = Number(registro.analitica.enviosFormulario) || 0;
    if (typeof registro.analitica.idAnalitica !== "string") {
      registro.analitica.idAnalitica = "";
    }
    if (typeof registro.analitica.idPixel !== "string") {
      registro.analitica.idPixel = "";
    }

    if (!Array.isArray(registro.versiones)) {
      registro.versiones = [];
    }

    return registro;
  }

  function capturarInstantanea(registro) {
    return clonar({
      datos: registro.datos,
      borrador: registro.borrador,
      diseno: registro.diseno,
      seo: registro.seo,
      dominio: registro.dominio
    });
  }

  function aplicarInstantanea(registro, snap) {
    registro.datos = clonar(snap.datos);
    registro.borrador = clonar(snap.borrador);
    registro.diseno = clonar(snap.diseno);
    registro.seo = clonar(snap.seo);
    if (snap.dominio) {
      registro.dominio = clonar(snap.dominio);
    }
  }

  function describirInstantanea(snap) {
    if (!snap) {
      return "";
    }
    const partes = [];
    const tpl = snap.diseno && PLANTILLAS_ETIQUETAS[snap.diseno.plantilla];
    if (tpl) {
      partes.push(`Plantilla ${tpl}`);
    }
    if (snap.datos && snap.datos.tono) {
      const tono =
        (window.dmdGenerador &&
          window.dmdGenerador.TONOS_ETIQUETAS &&
          window.dmdGenerador.TONOS_ETIQUETAS[snap.datos.tono]) ||
        snap.datos.tono;
      partes.push(`Tono ${tono}`);
    }
    if (snap.borrador && snap.borrador.titulo) {
      const tCorto = String(snap.borrador.titulo).slice(0, 42);
      partes.push(`"${tCorto}${snap.borrador.titulo.length > 42 ? "..." : ""}"`);
    }
    return partes.join(" · ");
  }

  function registrarVersion(registro, etiqueta, detalle) {
    asegurarEstructuraBorrador(registro);
    const nuevaSnap = capturarInstantanea(registro);
    const nuevaFirma = JSON.stringify(nuevaSnap);
    if (
      registro.versiones.length > 0 &&
      registro.versiones[0] &&
      registro.versiones[0].instantanea &&
      JSON.stringify(registro.versiones[0].instantanea) === nuevaFirma
    ) {
      // Evitar guardar versiones idénticas duplicadas
      return;
    }

    const resumen = detalle || describirInstantanea(nuevaSnap);
    registro.versiones.unshift({
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      etiqueta: etiqueta || "Cambio guardado",
      detalle: resumen,
      creadoEn: new Date().toISOString(),
      instantanea: nuevaSnap
    });
    if (registro.versiones.length > 15) {
      registro.versiones = registro.versiones.slice(0, 15);
    }
  }

  let registroActual = null;
  let callbacks = {
    alGuardarBorrador: null,
    alPublicarBorrador: null,
    alIrAlChat: null,
    alDescargarRespaldo: null,
    alPedirImportar: null
  };

  let pilaDeshacer = [];
  let pilaRehacer = [];
  let vistaActual = "movil";
  let modoLienzo = "preview"; // "preview" (página real) o "editar" (edición inline + orden)
  let seccionArrastrada = null;
  let confirmandoRestaurarId = null;

  function obtenerNodos() {
    return {
      vacio: document.getElementById("editor-vacio"),
      espacio: document.getElementById("editor-espacio"),
      btnIrChat: document.getElementById("btn-editor-ir-chat"),
      btnDeshacer: document.getElementById("btn-deshacer"),
      btnRehacer: document.getElementById("btn-rehacer"),
      estadoHistorialAyuda: document.getElementById("estado-historial-ayuda"),
      btnModoPreview: document.getElementById("btn-modo-preview"),
      btnModoEditar: document.getElementById("btn-modo-editar"),
      btnSalirModoEditar: document.getElementById("btn-salir-modo-editar"),
      etiquetaModoLienzo: document.getElementById("etiqueta-modo-lienzo"),
      avisoModoEditar: document.getElementById("editor-modo-aviso"),
      btnMovil: document.getElementById("btn-vista-movil"),
      btnEscritorio: document.getElementById("btn-vista-escritorio"),
      etiquetaViewport: document.getElementById("etiqueta-viewport"),
      stage: document.getElementById("editor-preview-stage"),
      lienzo: document.getElementById("lienzo-editor"),
      estadoAuto: document.getElementById("estado-guardado-auto"),

      tabs: Array.from(document.querySelectorAll(".edtab")),
      paneles: Array.from(document.querySelectorAll(".editor-panel")),

      tplBtns: Array.from(document.querySelectorAll(".tpl-btn")),
      selectFuente: document.getElementById("ed-fuente"),
      inputDireccion: document.getElementById("ed-direccion"),
      inputHorario: document.getElementById("ed-horario"),
      inputWhatsapp: document.getElementById("ed-whatsapp"),
      whatsappHint: document.getElementById("ed-whatsapp-hint"),
      inputLogoFile: document.getElementById("ed-subir-logo"),
      btnQuitarLogo: document.getElementById("ed-quitar-logo"),
      inputLogoAlt: document.getElementById("ed-logo-alt"),
      btnCambiarPortada: document.getElementById("ed-cambiar-portada"),
      inputPortadaFile: document.getElementById("ed-subir-portada"),
      btnQuitarPortada: document.getElementById("ed-quitar-portada"),
      portadaMeta: document.getElementById("ed-portada-meta"),
      portadaOpciones: document.getElementById("ed-portada-opciones"),
      inputPortadaAlt: document.getElementById("ed-portada-alt"),

      inputSeoTitulo: document.getElementById("ed-seo-titulo"),
      cuentaSeoTitulo: document.getElementById("ed-seo-titulo-cuenta"),
      estadoSeoTitulo: document.getElementById("ed-seo-titulo-estado"),
      inputSeoDesc: document.getElementById("ed-seo-desc"),
      cuentaSeoDesc: document.getElementById("ed-seo-desc-cuenta"),
      estadoSeoDesc: document.getElementById("ed-seo-desc-estado"),
      inputSeoKeywords: document.getElementById("ed-seo-keywords"),
      cuentaSeoKeywords: document.getElementById("ed-seo-keywords-cuenta"),
      seoPrevUrl: document.getElementById("seo-preview-url"),
      seoPrevTitulo: document.getElementById("seo-preview-titulo"),
      seoPrevDesc: document.getElementById("seo-preview-desc"),

      pillPub: document.getElementById("ed-estado-pub-pill"),
      inputSubdominio: document.getElementById("ed-subdominio"),
      estadoSubdominio: document.getElementById("ed-subdominio-estado"),
      btnPublicar: document.getElementById("btn-ed-publicar"),
      bloquePub: document.getElementById("ed-bloque-publicada"),
      urlPubEl: document.getElementById("ed-url-publicada"),
      btnVerPub: document.getElementById("btn-ed-ver-publicada"),
      btnCopiarEnlace: document.getElementById("btn-ed-copiar-enlace"),
      btnCompartirWa: document.getElementById("btn-ed-compartir-wa"),
      btnIrPago: document.getElementById("btn-ed-ir-pago"),
      listaEstadoPublicar: document.getElementById("lista-estado-publicar"),
      inputDominio: document.getElementById("ed-dominio-propio"),

      metVisitas: document.getElementById("met-visitas"),
      metWa: document.getElementById("met-wa"),
      metForm: document.getElementById("met-form"),
      btnReiniciarAnalitica: document.getElementById("btn-reiniciar-analitica"),
      confirmarReinicioAnalitica: document.getElementById("confirmar-reiniciar-analitica"),
      btnConfirmarReinicioAnalitica: document.getElementById("btn-confirmar-reinicio-analitica"),
      btnCancelarReinicioAnalitica: document.getElementById("btn-cancelar-reinicio-analitica"),
      inputAnalyticsId: document.getElementById("ed-analytics-id"),
      inputPixelId: document.getElementById("ed-pixel-id"),

      versionesVacio: document.getElementById("versiones-vacio"),
      listaVersiones: document.getElementById("lista-versiones"),
      btnDescargarPanel: document.getElementById("btn-descargar-respaldo-panel"),
      btnImportarPanel: document.getElementById("btn-importar-respaldo-panel"),
      listaSeguridad: document.getElementById("lista-seguridad")
    };
  }

  let ui = null;

  function abrirTabInterno(panelId, enfocarSelector) {
    if (!ui) {
      return;
    }
    const tab = ui.tabs.find((t) => t.dataset.panel === panelId);
    if (tab) {
      tab.click();
    }
    if (enfocarSelector) {
      window.setTimeout(() => {
        const el = document.querySelector(enfocarSelector);
        if (el && typeof el.focus === "function") {
          el.focus();
        }
      }, 60);
    }
  }

  function actualizarBotonesHistorial() {
    if (!ui) {
      return;
    }
    const nDes = pilaDeshacer.length;
    const nReh = pilaRehacer.length;
    ui.btnDeshacer.disabled = nDes === 0;
    ui.btnRehacer.disabled = nReh === 0;
    ui.btnDeshacer.textContent = nDes > 0 ? `Deshacer (${nDes})` : "Deshacer";
    ui.btnRehacer.textContent = nReh > 0 ? `Rehacer (${nReh})` : "Rehacer";
    ui.btnDeshacer.title =
      nDes > 0
        ? `Deshacer último cambio (${nDes} disponible${nDes > 1 ? "s" : ""})`
        : "Edita algún texto, plantilla o ajuste para habilitar Deshacer";
    ui.btnRehacer.title =
      nReh > 0
        ? `Rehacer cambio (${nReh} disponible${nReh > 1 ? "s" : ""})`
        : "Se habilita después de deshacer un cambio";

    if (ui.estadoHistorialAyuda) {
      if (nDes === 0 && nReh === 0) {
        ui.estadoHistorialAyuda.textContent = "Se habilitan al editar en esta sesión";
      } else {
        ui.estadoHistorialAyuda.textContent = `${nDes} cambio${nDes === 1 ? "" : "s"} en esta sesión`;
      }
    }
  }

  function anunciarGuardado(mensaje) {
    if (!ui || !ui.estadoAuto) {
      return;
    }
    const hora = formatearFechaCorta(new Date().toISOString());
    ui.estadoAuto.textContent = mensaje
      ? `${mensaje}${hora ? " · " + hora : ""}`
      : `Guardado automático en este navegador${hora ? " · " + hora : ""}`;
  }

  function guardarCambio(etiquetaVersion, registrarEnHistorial, mensajeEstado, detalleVersion) {
    if (!registroActual) {
      return;
    }
    registroActual.actualizadoEn = new Date().toISOString();
    if (registrarEnHistorial) {
      registrarVersion(registroActual, etiquetaVersion, detalleVersion);
    }
    if (typeof callbacks.alGuardarBorrador === "function") {
      callbacks.alGuardarBorrador(registroActual);
    }
    actualizarBotonesHistorial();
    renderizarPanelSeo();
    renderizarPanelPublicar();
    renderizarPanelAnalitica();
    renderizarPanelHistorialYSeguridad();
    anunciarGuardado(mensajeEstado || "Cambios guardados automáticamente");
  }

  function empujarEstadoDeshacer() {
    if (!registroActual) {
      return;
    }
    pilaDeshacer.push(capturarInstantanea(registroActual));
    if (pilaDeshacer.length > 30) {
      pilaDeshacer.shift();
    }
    pilaRehacer = [];
    actualizarBotonesHistorial();
  }

  function actualizarModoLienzo(nuevoModo) {
    modoLienzo = nuevoModo === "editar" ? "editar" : "preview";
    if (!ui) {
      return;
    }
    const esEditar = modoLienzo === "editar";
    if (ui.btnModoPreview) {
      ui.btnModoPreview.classList.toggle("seg-btn-active", !esEditar);
      ui.btnModoPreview.setAttribute("aria-pressed", !esEditar ? "true" : "false");
    }
    if (ui.btnModoEditar) {
      ui.btnModoEditar.classList.toggle("seg-btn-active", esEditar);
      ui.btnModoEditar.setAttribute("aria-pressed", esEditar ? "true" : "false");
    }
    if (ui.etiquetaModoLienzo) {
      ui.etiquetaModoLienzo.textContent = esEditar ? "Modo edición" : "Vista previa real";
    }
    if (ui.avisoModoEditar) {
      ui.avisoModoEditar.hidden = !esEditar;
    }
    renderizarLienzoEditable();
  }

  function renderizarControlesDiseno() {
    if (!ui || !registroActual) {
      return;
    }
    const { diseno, datos } = registroActual;

    ui.tplBtns.forEach((b) => {
      const activo = b.dataset.plantilla === diseno.plantilla;
      b.classList.toggle("tpl-btn-active", activo);
      b.setAttribute("aria-pressed", activo ? "true" : "false");
    });
    ui.selectFuente.value = diseno.fuente || "sistema";
    if (ui.inputDireccion && document.activeElement !== ui.inputDireccion) {
      ui.inputDireccion.value = datos.direccion || "";
    }
    if (ui.inputHorario && document.activeElement !== ui.inputHorario) {
      ui.inputHorario.value = datos.horario || "";
    }
    if (document.activeElement !== ui.inputWhatsapp) {
      ui.inputWhatsapp.value = datos.whatsapp || "";
    }
    if (ui.whatsappHint) {
      const digitos = String(datos.whatsapp || "").replace(/\D/g, "");
      if (digitos.length >= 10) {
        ui.whatsappHint.textContent = `WhatsApp activo (${digitos}): el botón y formulario ya funcionan en tu página.`;
        ui.whatsappHint.classList.add("hint-ok");
      } else {
        ui.whatsappHint.textContent =
          "Agrega 10 a 15 dígitos con lada (ej. 528112345678) para activar el botón y formulario de WhatsApp en tu página.";
        ui.whatsappHint.classList.remove("hint-ok");
      }
    }

    ui.btnQuitarLogo.hidden = !diseno.logoDataUrl;
    ui.inputLogoAlt.value = diseno.logoAlt || "";
    ui.btnQuitarPortada.hidden = !diseno.portadaDataUrl;
    ui.inputPortadaAlt.value = diseno.portadaAlt || "";

    const gen = window.dmdGenerador;
    const opciones =
      gen && typeof gen.obtenerOpcionesPortada === "function"
        ? gen.obtenerOpcionesPortada(datos)
        : [];

    if (ui.btnCambiarPortada) {
      ui.btnCambiarPortada.hidden = opciones.length === 0;
      ui.btnCambiarPortada.textContent = diseno.portadaDataUrl
        ? "Cambiar foto"
        : "Elegir foto del giro";
    }

    if (ui.portadaMeta) {
      if (!diseno.portadaDataUrl) {
        ui.portadaMeta.textContent = "Sin imagen de portada.";
      } else if (diseno.portadaOrigen === "propia") {
        ui.portadaMeta.textContent = "Imagen propia guardada en tu borrador local.";
      } else {
        const idxActivo = opciones.findIndex((o) => o.url === diseno.portadaDataUrl);
        const giroLbl =
          (opciones[0] && opciones[0].giroEtiqueta) ||
          datos.giroTexto ||
          (gen && gen.GIROS_ETIQUETAS && gen.GIROS_ETIQUETAS[datos.giro]) ||
          "Negocio";
        ui.portadaMeta.textContent =
          idxActivo >= 0
            ? `Foto sugerida · ${giroLbl} (${idxActivo + 1} de ${opciones.length})`
            : `Foto sugerida · ${giroLbl}`;
      }
    }

    if (ui.portadaOpciones) {
      ui.portadaOpciones.textContent = "";
      ui.portadaOpciones.hidden = opciones.length === 0;
      opciones.forEach((op, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        const activa = diseno.portadaDataUrl === op.url;
        btn.className = activa ? "cover-option-btn is-active" : "cover-option-btn";
        btn.dataset.coverIndex = String(idx);
        btn.setAttribute("aria-pressed", activa ? "true" : "false");
        btn.setAttribute("aria-label", `Usar portada: ${op.etiqueta}`);
        const img = document.createElement("img");
        img.src = op.url;
        img.alt = op.etiqueta;
        img.loading = "lazy";
        btn.appendChild(img);
        btn.addEventListener("click", () => {
          if (!registroActual || !gen || typeof gen.seleccionarPortada !== "function") {
            return;
          }
          const elegida = gen.seleccionarPortada(registroActual.datos, 0, idx);
          if (registroActual.diseno.portadaDataUrl === elegida.url) {
            return;
          }
          empujarEstadoDeshacer();
          aplicarPortadaEnRegistro(registroActual, elegida);
          renderizarControlesDiseno();
          renderizarLienzoEditable();
          guardarCambio("Portada cambiada", true, "Portada cambiada", op.etiqueta);
        });
        ui.portadaOpciones.appendChild(btn);
      });
    }
  }

  function renderizarPanelSeo() {
    if (!ui || !registroActual) {
      return;
    }
    const { seo, dominio, publicadaSlug } = registroActual;
    if (document.activeElement !== ui.inputSeoTitulo) {
      ui.inputSeoTitulo.value = seo.titulo || "";
    }
    if (document.activeElement !== ui.inputSeoDesc) {
      ui.inputSeoDesc.value = seo.descripcion || "";
    }
    if (ui.inputSeoKeywords && document.activeElement !== ui.inputSeoKeywords) {
      ui.inputSeoKeywords.value = seo.palabrasClave || "";
    }

    const lenTit = (seo.titulo || "").length;
    const lenDesc = (seo.descripcion || "").length;
    const lenKw = (seo.palabrasClave || "").length;

    ui.cuentaSeoTitulo.textContent = `${lenTit} / 70`;
    ui.cuentaSeoDesc.textContent = `${lenDesc} / 165`;
    if (ui.cuentaSeoKeywords) {
      ui.cuentaSeoKeywords.textContent = `${lenKw} / 160`;
    }

    if (ui.estadoSeoTitulo) {
      if (lenTit === 0) {
        ui.estadoSeoTitulo.textContent = "Escribe un título claro con el nombre de tu negocio y ciudad.";
      } else if (lenTit < 25) {
        ui.estadoSeoTitulo.textContent = "Un poco corto. Ideal entre 30 y 60 caracteres.";
      } else if (lenTit <= 60) {
        ui.estadoSeoTitulo.textContent = "Buena longitud para buscadores.";
      } else {
        ui.estadoSeoTitulo.textContent = "Cerca del límite visible en buscadores (60 a 70 caracteres).";
      }
    }

    if (ui.estadoSeoDesc) {
      if (lenDesc === 0) {
        ui.estadoSeoDesc.textContent = "Resume en una o dos frases lo que ofreces.";
      } else if (lenDesc < 80) {
        ui.estadoSeoDesc.textContent = "Puedes agregar más detalle (ideal entre 110 y 155 caracteres).";
      } else if (lenDesc <= 155) {
        ui.estadoSeoDesc.textContent = "Buena longitud para resultados de búsqueda.";
      } else {
        ui.estadoSeoDesc.textContent = "Cerca del límite visible en buscadores.";
      }
    }

    const gen = window.dmdGenerador;
    const valSub =
      gen && typeof gen.validarSubdominio === "function"
        ? gen.validarSubdominio(dominio.subdominio || "")
        : null;

    const urlMostrar = dominio.dominioPropio
      ? `https://${dominio.dominioPropio.replace(/^https?:\/\//i, "")}`
      : valSub && valSub.ok
        ? valSub.url
        : publicadaSlug && gen
          ? gen.construirUrlPublicada(publicadaSlug)
          : "https://tunegocio.dmd.dmdmx.dev";

    ui.seoPrevUrl.textContent = urlMostrar;
    ui.seoPrevTitulo.textContent = seo.titulo || registroActual.borrador.titulo;
    ui.seoPrevDesc.textContent = seo.descripcion || registroActual.borrador.presentacion;
  }

  function construirItemChecklistAccionable(item) {
    const li = document.createElement("li");
    li.className = "actionable-item";

    const info = document.createElement("div");
    info.className = "actionable-info";

    const top = document.createElement("div");
    top.className = "actionable-head";

    const tit = document.createElement("span");
    tit.className = "actionable-title";
    tit.textContent = item.titulo;

    const badge = document.createElement("span");
    badge.className = item.ok ? "status-tag-ok" : "status-tag-pending";
    badge.textContent = item.estado;

    top.appendChild(tit);
    top.appendChild(badge);
    info.appendChild(top);

    if (item.detalle) {
      const det = document.createElement("p");
      det.className = "actionable-detail";
      det.textContent = item.detalle;
      info.appendChild(det);
    }

    li.appendChild(info);

    if (item.accionTexto) {
      if (item.accionHref) {
        const a = document.createElement("a");
        a.className = "btn btn-secondary btn-sm actionable-btn";
        a.href = item.accionHref;
        a.textContent = item.accionTexto;
        li.appendChild(a);
      } else if (typeof item.alActivar === "function") {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-secondary btn-sm actionable-btn";
        btn.textContent = item.accionTexto;
        btn.addEventListener("click", item.alActivar);
        li.appendChild(btn);
      }
    }

    return li;
  }

  function renderizarPanelPublicar() {
    if (!ui || !registroActual) {
      return;
    }
    const gen = window.dmdGenerador;
    const publicada = Boolean(registroActual.publicadaSlug);
    ui.pillPub.textContent = publicada ? "Publicada" : "Borrador";
    ui.btnPublicar.textContent = publicada ? "Actualizar página publicada" : "Publicar página";

    if (ui.inputSubdominio && document.activeElement !== ui.inputSubdominio) {
      ui.inputSubdominio.value = registroActual.dominio.subdominio || "";
    }

    const valSub =
      gen && typeof gen.validarSubdominio === "function"
        ? gen.validarSubdominio(registroActual.dominio.subdominio || "")
        : { ok: true, mensaje: "" };

    if (ui.estadoSubdominio) {
      ui.estadoSubdominio.textContent = valSub.mensaje;
      ui.estadoSubdominio.classList.toggle("field-error-inline", !valSub.ok && !valSub.vacio);
      ui.estadoSubdominio.classList.toggle("hint-ok", valSub.ok);
    }
    if (ui.inputSubdominio) {
      ui.inputSubdominio.classList.toggle("is-invalid", !valSub.ok && !valSub.vacio);
    }

    if (publicada && gen) {
      const rutaVer = `ver.html?id=${encodeURIComponent(registroActual.publicadaSlug)}`;
      const url = gen.construirUrlPublicada(registroActual.publicadaSlug);
      ui.bloquePub.hidden = false;
      ui.urlPubEl.textContent = url;
      ui.btnVerPub.href = rutaVer;
      const textoWa = `Te comparto la página de ${registroActual.datos.nombre}: ${url}`;
      ui.btnCompartirWa.href = `https://wa.me/?text=${encodeURIComponent(textoWa)}`;
    } else {
      ui.bloquePub.hidden = true;
    }

    if (ui.btnIrPago) {
      ui.btnIrPago.href = `pago.html?borrador=${encodeURIComponent(registroActual.id)}`;
    }

    if (document.activeElement !== ui.inputDominio) {
      ui.inputDominio.value = registroActual.dominio.dominioPropio || "";
    }

    if (ui.listaEstadoPublicar) {
      const sesion =
        window.dmdCuenta && typeof window.dmdCuenta.obtenerSesionActual === "function"
          ? window.dmdCuenta.obtenerSesionActual()
          : null;
      const tieneWa = Boolean(String(registroActual.datos.whatsapp || "").replace(/\D/g, ""));
      const urlPago = `pago.html?borrador=${encodeURIComponent(registroActual.id)}`;

      const items = [
        {
          titulo: "Enlace compartible",
          estado: publicada ? "Activo" : "Sin publicar",
          ok: publicada,
          detalle: publicada
            ? "Tu página ya tiene enlace listo para abrir o enviar por WhatsApp."
            : "Publica tu borrador para generar el enlace compartible.",
          accionTexto: publicada ? "" : "Publicar ahora",
          alActivar: publicada
            ? null
            : () => {
                if (typeof callbacks.alPublicarBorrador === "function") {
                  callbacks.alPublicarBorrador(registroActual);
                  renderizarPanelPublicar();
                  renderizarPanelSeo();
                  anunciarGuardado("Página publicada");
                }
              }
        },
        {
          titulo: "Subdominio dmd y HTTPS (SSL)",
          estado: "Con plan activo",
          ok: false,
          detalle: valSub.ok
            ? `Reserva ${valSub.slug}.dmd.dmdmx.dev con certificado SSL al activar un plan mensual.`
            : "Elige un subdominio válido arriba y activa un plan mensual para conectarlo con HTTPS.",
          accionTexto: "Ver planes",
          accionHref: urlPago
        },
        {
          titulo: "Cuenta para suscripciones",
          estado: sesion ? "Activa" : "Sin sesión",
          ok: Boolean(sesion),
          detalle: sesion
            ? `Conectada como ${sesion.correo}.`
            : "Inicia sesión para asociar tu plan mensual o gestionar tu suscripción.",
          accionTexto: sesion ? "" : "Iniciar sesión",
          accionHref: sesion ? "" : "login.html"
        },
        {
          titulo: "WhatsApp del negocio",
          estado: tieneWa ? "Listo" : "Opcional",
          ok: tieneWa,
          detalle: tieneWa
            ? `Número activo: ${registroActual.datos.whatsapp}.`
            : "Agrega tu número para habilitar el botón y formulario directo a WhatsApp.",
          accionTexto: tieneWa ? "" : "Agregar WhatsApp",
          alActivar: tieneWa ? null : () => abrirTabInterno("panel-diseno", "#ed-whatsapp")
        }
      ];

      ui.listaEstadoPublicar.textContent = "";
      items.forEach((it) => {
        ui.listaEstadoPublicar.appendChild(construirItemChecklistAccionable(it));
      });
    }
  }

  function renderizarPanelAnalitica() {
    if (!ui || !registroActual) {
      return;
    }
    const a = registroActual.analitica;
    ui.metVisitas.textContent = String(a.visitas || 0);
    ui.metWa.textContent = String(a.clicsWhatsapp || 0);
    ui.metForm.textContent = String(a.enviosFormulario || 0);

    if (document.activeElement !== ui.inputAnalyticsId) {
      ui.inputAnalyticsId.value = a.idAnalitica || "";
    }
    if (document.activeElement !== ui.inputPixelId) {
      ui.inputPixelId.value = a.idPixel || "";
    }
  }

  function renderizarPanelHistorialYSeguridad() {
    if (!ui || !registroActual) {
      return;
    }

    const versiones = registroActual.versiones || [];
    ui.listaVersiones.textContent = "";
    if (versiones.length === 0) {
      ui.versionesVacio.hidden = false;
      ui.listaVersiones.hidden = true;
    } else {
      ui.versionesVacio.hidden = true;
      ui.listaVersiones.hidden = false;
      versiones.forEach((v, index) => {
        const li = document.createElement("li");
        li.className = "version-item-wrap";

        const fila = document.createElement("div");
        fila.className = "version-item";

        const info = document.createElement("div");
        info.className = "version-info";
        const tit = document.createElement("p");
        tit.className = "version-label";
        tit.textContent = `${v.etiqueta}${index === 0 ? " (actual)" : ""}`;

        const det = document.createElement("p");
        det.className = "version-detail";
        det.textContent = v.detalle || describirInstantanea(v.instantanea) || `Versión ${versiones.length - index}`;

        const fec = document.createElement("p");
        fec.className = "version-date";
        fec.textContent = formatearFechaCorta(v.creadoEn);

        info.appendChild(tit);
        info.appendChild(det);
        info.appendChild(fec);

        fila.appendChild(info);

        if (index > 0) {
          const btnRest = document.createElement("button");
          btnRest.type = "button";
          btnRest.className = "btn btn-secondary btn-sm";
          btnRest.textContent = "Restaurar";
          btnRest.addEventListener("click", () => {
            confirmandoRestaurarId = confirmandoRestaurarId === v.id ? null : v.id;
            renderizarPanelHistorialYSeguridad();
          });
          fila.appendChild(btnRest);
        }

        li.appendChild(fila);

        if (confirmandoRestaurarId === v.id && index > 0) {
          const confirmBox = document.createElement("div");
          confirmBox.className = "confirm-box version-confirm-box";
          confirmBox.setAttribute("role", "alert");

          const msg = document.createElement("p");
          msg.textContent = `¿Restaurar "${v.etiqueta}"? Tus cambios actuales se guardarán antes en el historial.`;

          const actions = document.createElement("div");
          actions.className = "confirm-actions";

          const bSi = document.createElement("button");
          bSi.type = "button";
          bSi.className = "btn btn-primary btn-sm";
          bSi.textContent = "Sí, restaurar";
          bSi.addEventListener("click", () => {
            confirmandoRestaurarId = null;
            empujarEstadoDeshacer();
            aplicarInstantanea(registroActual, v.instantanea);
            asegurarEstructuraBorrador(registroActual);
            renderizarTodoEditor();
            guardarCambio(
              `Restaurada: ${v.etiqueta}`,
              true,
              "Versión restaurada",
              v.detalle || describirInstantanea(v.instantanea)
            );
          });

          const bNo = document.createElement("button");
          bNo.type = "button";
          bNo.className = "btn btn-secondary btn-sm";
          bNo.textContent = "Cancelar";
          bNo.addEventListener("click", () => {
            confirmandoRestaurarId = null;
            renderizarPanelHistorialYSeguridad();
          });

          actions.appendChild(bSi);
          actions.appendChild(bNo);
          confirmBox.appendChild(msg);
          confirmBox.appendChild(actions);
          li.appendChild(confirmBox);
        }

        ui.listaVersiones.appendChild(li);
      });
    }

    // Lista de verificación accionable
    const { datos, diseno, seo } = registroActual;
    const tieneWa = Boolean(String(datos.whatsapp || "").replace(/\D/g, ""));
    const seoCompleto = Boolean(
      (seo.titulo || "").trim().length >= 10 && (seo.descripcion || "").trim().length >= 30
    );
    const imagenesConAlt =
      (!diseno.logoDataUrl || Boolean((diseno.logoAlt || "").trim())) &&
      (!diseno.portadaDataUrl || Boolean((diseno.portadaAlt || "").trim()));
    const sesion =
      window.dmdCuenta && typeof window.dmdCuenta.obtenerSesionActual === "function"
        ? window.dmdCuenta.obtenerSesionActual()
        : null;

    const elementos = [
      {
        titulo: "Privacidad de pagos",
        estado: "Protegido",
        ok: true,
        detalle: "No se guardan tarjetas ni datos bancarios en el navegador."
      },
      {
        titulo: "WhatsApp del negocio",
        estado: tieneWa ? "Listo" : "Falta",
        ok: tieneWa,
        detalle: tieneWa
          ? "Botón y formulario de contacto activos."
          : "Agrega tu número para recibir mensajes desde tu página.",
        accionTexto: tieneWa ? "" : "Agregar",
        alActivar: tieneWa ? null : () => abrirTabInterno("panel-diseno", "#ed-whatsapp")
      },
      {
        titulo: "SEO completo",
        estado: seoCompleto ? "Listo" : "Falta",
        ok: seoCompleto,
        detalle: seoCompleto
          ? "Título y descripción listos para buscadores."
          : "Completa el título y descripción en la pestaña SEO.",
        accionTexto: seoCompleto ? "" : "Editar SEO",
        alActivar: seoCompleto ? null : () => abrirTabInterno("panel-seo", "#ed-seo-titulo")
      },
      {
        titulo: "Texto alternativo en imágenes",
        estado: imagenesConAlt ? "Listo" : "Falta",
        ok: imagenesConAlt,
        detalle: imagenesConAlt
          ? "Las imágenes incluyen descripción accesible."
          : "Añade texto alternativo a tu logo o portada en Diseño.",
        accionTexto: imagenesConAlt ? "" : "Completar",
        alActivar: imagenesConAlt ? null : () => abrirTabInterno("panel-diseno", "#ed-portada-alt")
      },
      {
        titulo: "Cuenta y suscripción",
        estado: sesion ? "Sesión activa" : "Sin sesión",
        ok: Boolean(sesion),
        detalle: sesion
          ? `Sesión iniciada como ${sesion.correo}.`
          : "Inicia sesión para consultar planes y activar tu subdominio con HTTPS.",
        accionTexto: sesion ? "Ver planes" : "Iniciar sesión",
        accionHref: sesion
          ? `pago.html?borrador=${encodeURIComponent(registroActual.id)}`
          : "login.html"
      }
    ];

    ui.listaSeguridad.textContent = "";
    elementos.forEach((item) => {
      ui.listaSeguridad.appendChild(construirItemChecklistAccionable(item));
    });
  }

  function moverSeccion(indiceOrigen, indiceDestino) {
    if (!registroActual) {
      return;
    }
    const orden = registroActual.diseno.ordenSecciones;
    if (
      indiceDestino < 0 ||
      indiceDestino >= orden.length ||
      indiceOrigen === indiceDestino
    ) {
      return;
    }
    empujarEstadoDeshacer();
    const [movida] = orden.splice(indiceOrigen, 1);
    orden.splice(indiceDestino, 0, movida);
    renderizarLienzoEditable();
    guardarCambio(
      "Orden de secciones",
      true,
      "Orden de secciones actualizado",
      `Movió ${ETIQUETAS_SECCION[movida] || movida}`
    );
  }

  function enlazarTextoEditable(elemento, etiquetaCampo, alConfirmar) {
    elemento.setAttribute("contenteditable", "true");
    elemento.classList.add("editable-inline");
    elemento.setAttribute("spellcheck", "true");
    elemento.setAttribute("title", "Haz clic para editar este texto");

    let valorInicial = "";
    elemento.addEventListener("focus", () => {
      valorInicial = elemento.textContent;
    });
    elemento.addEventListener("blur", () => {
      const nuevo = elemento.textContent.replace(/[\u2014\u2013]/g, ", ").replace(/\s+/g, " ").trim();
      if (!nuevo) {
        elemento.textContent = valorInicial;
        return;
      }
      if (nuevo !== valorInicial) {
        empujarEstadoDeshacer();
        alConfirmar(nuevo);
        guardarCambio(
          `Editó ${etiquetaCampo}`,
          true,
          "Texto actualizado",
          `"${nuevo.slice(0, 48)}${nuevo.length > 48 ? "..." : ""}"`
        );
      }
    });
  }

  function renderizarLienzoEditable() {
    if (!ui || !registroActual) {
      return;
    }

    const { datos, borrador, diseno } = registroActual;
    const plantilla = diseno.plantilla || "clasica";
    const colorMarca = COLOR_MARCA_UNICO;
    const fuente = FUENTES_MAPA[diseno.fuente] || FUENTES_MAPA.sistema;
    const orden = diseno.ordenSecciones || SECCIONES_DEFECTO;
    const esModoEditar = modoLienzo === "editar";

    const numeroWa = String(datos.whatsapp || "").replace(/\D/g, "");
    const estructura =
      (borrador && borrador.estructura) ||
      (window.dmdGenerador &&
        typeof window.dmdGenerador.obtenerEstructuraNegocio === "function" &&
        window.dmdGenerador.obtenerEstructuraNegocio(datos)) ||
      null;
    const claseVisualGiro = (estructura && estructura.claseVisual) || "otro";
    const titulosSec = (estructura && estructura.titulos) || {};

    ui.lienzo.textContent = "";

    const articulo = document.createElement("article");
    articulo.className = `biz-page biz-template-${plantilla} biz-giro-${claseVisualGiro}${
      vistaActual === "escritorio" ? " biz-desktop-layout" : ""
    }${esModoEditar ? " biz-is-editing" : " biz-is-live-preview"}`;
    articulo.dataset.giro = claseVisualGiro;
    articulo.style.setProperty("--biz-accent", colorMarca);
    articulo.style.setProperty("--biz-font", fuente);

    // Encabezado real del negocio
    const header = document.createElement("header");
    header.className = "biz-topbar";

    const identidad = document.createElement("div");
    identidad.className = "biz-identity";

    if (diseno.logoDataUrl) {
      const logoImg = document.createElement("img");
      logoImg.className = "biz-logo";
      logoImg.src = diseno.logoDataUrl;
      logoImg.alt = diseno.logoAlt || `Logo de ${datos.nombre}`;
      identidad.appendChild(logoImg);
    }

    const nombreSpan = document.createElement("span");
    nombreSpan.className = "biz-topbar-name";
    nombreSpan.textContent = datos.nombre;
    identidad.appendChild(nombreSpan);

    const ciudadSpan = document.createElement("span");
    ciudadSpan.className = "biz-topbar-city";
    ciudadSpan.textContent = datos.ciudad;

    header.appendChild(identidad);
    header.appendChild(ciudadSpan);
    articulo.appendChild(header);

    const cuerpo = document.createElement("div");
    cuerpo.className = "biz-body";

    orden.forEach((secId, idx) => {
      let contenedorDestino = cuerpo;

      if (esModoEditar) {
        const wrapper = document.createElement("div");
        wrapper.className = "editor-section-wrap";
        wrapper.dataset.seccion = secId;
        wrapper.draggable = true;

        wrapper.addEventListener("dragstart", () => {
          seccionArrastrada = idx;
          wrapper.classList.add("is-dragging");
        });
        wrapper.addEventListener("dragend", () => {
          seccionArrastrada = null;
          wrapper.classList.remove("is-dragging");
        });
        wrapper.addEventListener("dragover", (e) => {
          e.preventDefault();
        });
        wrapper.addEventListener("drop", (e) => {
          e.preventDefault();
          if (seccionArrastrada !== null && seccionArrastrada !== idx) {
            moverSeccion(seccionArrastrada, idx);
          }
        });

        const barraSec = document.createElement("div");
        barraSec.className = "section-reorder-bar";

        const lblSec = document.createElement("span");
        lblSec.className = "section-reorder-label";
        lblSec.textContent = titulosSec[secId] || ETIQUETAS_SECCION[secId] || secId;

        const btnsSec = document.createElement("div");
        btnsSec.className = "section-reorder-btns";

        const btnSubir = document.createElement("button");
        btnSubir.type = "button";
        btnSubir.className = "reorder-btn";
        btnSubir.disabled = idx === 0;
        btnSubir.setAttribute("aria-label", `Subir sección ${lblSec.textContent}`);
        btnSubir.textContent = "Subir";
        btnSubir.addEventListener("click", () => moverSeccion(idx, idx - 1));

        const btnBajar = document.createElement("button");
        btnBajar.type = "button";
        btnBajar.className = "reorder-btn";
        btnBajar.disabled = idx === orden.length - 1;
        btnBajar.setAttribute("aria-label", `Bajar sección ${lblSec.textContent}`);
        btnBajar.textContent = "Bajar";
        btnBajar.addEventListener("click", () => moverSeccion(idx, idx + 1));

        btnsSec.appendChild(btnSubir);
        btnsSec.appendChild(btnBajar);
        barraSec.appendChild(lblSec);
        barraSec.appendChild(btnsSec);
        wrapper.appendChild(barraSec);

        cuerpo.appendChild(wrapper);
        contenedorDestino = wrapper;
      }

      if (secId === "presentacion") {
        const hero = document.createElement("section");
        hero.className = "biz-section biz-hero";

        if (diseno.portadaDataUrl) {
          const fig = document.createElement("figure");
          fig.className = "biz-cover-wrap";
          const img = document.createElement("img");
          img.className = "biz-cover-img";
          img.src = diseno.portadaDataUrl;
          img.alt = diseno.portadaAlt || `Imagen de ${datos.nombre}`;
          img.decoding = "async";
          img.addEventListener("error", () => {
            fig.classList.add("cover-fallback");
            img.hidden = true;
          });
          fig.appendChild(img);
          if (
            estructura &&
            estructura.sticker &&
            window.dmdGenerador &&
            typeof window.dmdGenerador.crearStickerElemento === "function"
          ) {
            const stickerEl = window.dmdGenerador.crearStickerElemento(estructura.sticker);
            if (stickerEl) {
              fig.appendChild(stickerEl);
            }
          }
          hero.appendChild(fig);
        }

        const h3 = document.createElement("h3");
        h3.className = "biz-title";
        h3.dataset.campoEditable = "titulo";
        h3.textContent = borrador.titulo;
        if (esModoEditar) {
          enlazarTextoEditable(h3, "título principal", (val) => {
            borrador.titulo = val;
          });
        }
        hero.appendChild(h3);

        const p = document.createElement("p");
        p.className = "biz-intro";
        p.dataset.campoEditable = "presentacion";
        p.textContent = borrador.presentacion;
        if (esModoEditar) {
          enlazarTextoEditable(p, "presentación", (val) => {
            borrador.presentacion = val;
          });
        }
        hero.appendChild(p);
        contenedorDestino.appendChild(hero);
      }

      if (secId === "servicios") {
        const bloque = document.createElement("section");
        bloque.className = "biz-section";
        const h4 = document.createElement("h4");
        h4.className = "biz-section-title";
        h4.textContent = titulosSec.servicios || "Servicios";
        bloque.appendChild(h4);

        const ul = document.createElement("ul");
        ul.className = "biz-services-grid";
        (borrador.servicios || []).forEach((s) => {
          const li = document.createElement("li");
          li.className = "biz-service-card";

          const t = document.createElement("p");
          t.className = "biz-service-title";
          t.textContent = s.titulo;
          if (esModoEditar) {
            enlazarTextoEditable(t, "servicio", (val) => {
              s.titulo = val;
            });
          }
          li.appendChild(t);

          if (s.descripcion || esModoEditar) {
            const d = document.createElement("p");
            d.className = "biz-service-desc";
            d.textContent = s.descripcion || "Detalle del servicio.";
            if (esModoEditar) {
              enlazarTextoEditable(d, "descripción de servicio", (val) => {
                s.descripcion = val;
              });
            }
            li.appendChild(d);
          }

          ul.appendChild(li);
        });
        bloque.appendChild(ul);
        contenedorDestino.appendChild(bloque);
      }

      if (secId === "beneficios") {
        const bloque = document.createElement("section");
        bloque.className = "biz-section";
        const h4 = document.createElement("h4");
        h4.className = "biz-section-title";
        h4.textContent = titulosSec.beneficios || "Beneficios";
        bloque.appendChild(h4);

        const ul = document.createElement("ul");
        ul.className = "preview-benefits";
        (borrador.beneficios || []).forEach((b, bIdx) => {
          const li = document.createElement("li");
          li.className = "preview-benefit-item";
          li.appendChild(crearIconoCheck());
          const sp = document.createElement("span");
          sp.textContent = b;
          if (esModoEditar) {
            enlazarTextoEditable(sp, "beneficio", (val) => {
              borrador.beneficios[bIdx] = val;
            });
          }
          li.appendChild(sp);
          ul.appendChild(li);
        });
        bloque.appendChild(ul);
        contenedorDestino.appendChild(bloque);
      }

      if (secId === "preguntas") {
        const bloque = document.createElement("section");
        bloque.className = "biz-section";
        const h4 = document.createElement("h4");
        h4.className = "biz-section-title";
        h4.textContent = titulosSec.preguntas || "Preguntas frecuentes";
        bloque.appendChild(h4);

        const lista = document.createElement("div");
        lista.className = "faq-list";
        (borrador.preguntasFrecuentes || []).forEach((f, fIdx) => {
          if (esModoEditar) {
            const card = document.createElement("div");
            card.className = "faq-item faq-item-editable";

            const q = document.createElement("p");
            q.className = "faq-question-editable";
            q.textContent = f.pregunta;
            enlazarTextoEditable(q, "pregunta frecuente", (val) => {
              borrador.preguntasFrecuentes[fIdx].pregunta = val;
            });

            const a = document.createElement("p");
            a.className = "faq-answer";
            a.textContent = f.respuesta;
            enlazarTextoEditable(a, "respuesta frecuente", (val) => {
              borrador.preguntasFrecuentes[fIdx].respuesta = val;
            });

            card.appendChild(q);
            card.appendChild(a);
            lista.appendChild(card);
          } else {
            const details = document.createElement("details");
            details.className = "faq-item";
            if (fIdx === 0) {
              details.open = true;
            }
            const summary = document.createElement("summary");
            summary.className = "faq-question";
            summary.textContent = f.pregunta;
            const resp = document.createElement("p");
            resp.className = "faq-answer";
            resp.textContent = f.respuesta;
            details.appendChild(summary);
            details.appendChild(resp);
            lista.appendChild(details);
          }
        });
        bloque.appendChild(lista);
        contenedorDestino.appendChild(bloque);
      }

      if (secId === "contacto") {
        const bloque = document.createElement("section");
        bloque.className = "biz-section biz-contact-section";
        const h4 = document.createElement("h4");
        h4.className = "biz-section-title";
        h4.textContent = titulosSec.contacto || "Contacto directo";
        bloque.appendChild(h4);

        if (numeroWa) {
          const msg =
            borrador.mensajeWhatsapp ||
            `Hola, vi la página de ${datos.nombre} y quiero pedir información.`;
          const enlace = document.createElement("a");
          enlace.className = "btn biz-btn-primary btn-full";
          enlace.href = `https://wa.me/${numeroWa}?text=${encodeURIComponent(msg)}`;
          enlace.target = "_blank";
          enlace.rel = "noopener noreferrer";
          enlace.appendChild(crearIconoWhatsapp());
          const sp = document.createElement("span");
          sp.textContent =
            (estructura && estructura.ctaWhatsapp) || `Enviar WhatsApp a ${datos.nombre}`;
          enlace.appendChild(sp);
          bloque.appendChild(enlace);

          // Formulario de contacto funcional solo cuando hay WhatsApp configurado
          const formBox = document.createElement("form");
          formBox.className = "biz-contact-form";
          formBox.noValidate = true;
          formBox.setAttribute("onsubmit", "return false;");

          const formTitle = document.createElement("h5");
          formTitle.className = "biz-form-title";
          formTitle.textContent = "Enviar mensaje directo";
          formBox.appendChild(formTitle);

          const inpNom = document.createElement("input");
          inpNom.id = "ed-prev-form-nombre";
          inpNom.className = "input";
          inpNom.type = "text";
          inpNom.placeholder = "Tu nombre";
          inpNom.setAttribute("aria-label", "Tu nombre");

          const txtMsg = document.createElement("textarea");
          txtMsg.id = "ed-prev-form-mensaje";
          txtMsg.className = "textarea";
          txtMsg.rows = 2;
          txtMsg.placeholder = "Escribe tu consulta";
          txtMsg.setAttribute("aria-label", "Tu mensaje");

          const btnProbar = document.createElement("button");
          btnProbar.id = "ed-prev-form-enviar";
          btnProbar.type = "button";
          btnProbar.className = "btn btn-secondary btn-full btn-sm";
          btnProbar.textContent = "Enviar por WhatsApp";

          const salidaForm = document.createElement("p");
          salidaForm.id = "ed-prev-form-salida";
          salidaForm.className = "field-hint";
          salidaForm.setAttribute("role", "status");
          salidaForm.setAttribute("aria-live", "polite");

          btnProbar.addEventListener("click", () => {
            const nom = inpNom.value.trim();
            const men = txtMsg.value.trim();
            if (nom.length < 2 || men.length < 3) {
              salidaForm.textContent = "Escribe tu nombre y mensaje.";
              return;
            }
            const textoFinal = `Hola ${datos.nombre}, soy ${nom}. ${men}`;
            const urlWa = `https://wa.me/${numeroWa}?text=${encodeURIComponent(textoFinal)}`;
            registroActual.analitica.enviosFormulario =
              (registroActual.analitica.enviosFormulario || 0) + 1;
            guardarCambio("", false, "Guardado");

            salidaForm.textContent = "";
            const link = document.createElement("a");
            link.href = urlWa;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "inline-action-link";
            link.textContent = "Abrir en WhatsApp";
            salidaForm.appendChild(document.createTextNode("Listo: "));
            salidaForm.appendChild(link);
          });

          formBox.appendChild(inpNom);
          formBox.appendChild(txtMsg);
          formBox.appendChild(btnProbar);
          formBox.appendChild(salidaForm);
          bloque.appendChild(formBox);
        } else {
          const cardInfo = document.createElement("div");
          cardInfo.className = "biz-location-card";
          const pLoc = document.createElement("p");
          pLoc.className = "biz-location-title";
          pLoc.textContent = datos.nombre;
          const pDesc = document.createElement("p");
          pDesc.className = "biz-location-sub";
          pDesc.textContent =
            (borrador.estructura && borrador.estructura.notaContactoSinWhatsapp) ||
            `Atención directa en ${datos.ciudad}.`;
          cardInfo.appendChild(pLoc);
          cardInfo.appendChild(pDesc);
          bloque.appendChild(cardInfo);
        }

        contenedorDestino.appendChild(bloque);
      }
    });

    // Pie sutil de la página del negocio
    const footerBiz = document.createElement("footer");
    footerBiz.className = "biz-footer";
    footerBiz.textContent = `${datos.nombre} · ${datos.ciudad}`;

    articulo.appendChild(cuerpo);
    articulo.appendChild(footerBiz);
    ui.lienzo.appendChild(articulo);
  }

  function actualizarViewport(modo) {
    vistaActual = modo === "escritorio" ? "escritorio" : "movil";
    if (!ui) {
      return;
    }
    const esEsc = vistaActual === "escritorio";
    ui.btnMovil.classList.toggle("vp-btn-active", !esEsc);
    ui.btnEscritorio.classList.toggle("vp-btn-active", esEsc);
    ui.btnMovil.setAttribute("aria-pressed", !esEsc ? "true" : "false");
    ui.btnEscritorio.setAttribute("aria-pressed", esEsc ? "true" : "false");
    ui.etiquetaViewport.textContent = esEsc ? "Escritorio" : "Celular";
    ui.stage.classList.toggle("mode-desktop", esEsc);
    ui.stage.classList.toggle("mode-mobile", !esEsc);
    renderizarLienzoEditable();
  }

  function renderizarTodoEditor() {
    if (!ui) {
      return;
    }
    if (!registroActual) {
      ui.vacio.hidden = false;
      ui.espacio.hidden = true;
      return;
    }
    asegurarEstructuraBorrador(registroActual);
    ui.vacio.hidden = true;
    ui.espacio.hidden = false;
    actualizarBotonesHistorial();
    renderizarControlesDiseno();
    renderizarPanelSeo();
    renderizarPanelPublicar();
    renderizarPanelAnalitica();
    renderizarPanelHistorialYSeguridad();
    renderizarLienzoEditable();
  }

  function conectarEventosEditor() {
    ui = obtenerNodos();
    if (!ui.espacio) {
      return;
    }

    if (ui.btnIrChat) {
      ui.btnIrChat.addEventListener("click", () => {
        if (typeof callbacks.alIrAlChat === "function") {
          callbacks.alIrAlChat();
        }
      });
    }

    // Pestañas internas compactas del editor
    ui.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const panelId = tab.dataset.panel;
        ui.tabs.forEach((t) => {
          const activo = t === tab;
          t.classList.toggle("edtab-active", activo);
          t.setAttribute("aria-selected", activo ? "true" : "false");
        });
        ui.paneles.forEach((p) => {
          p.hidden = p.id !== panelId;
        });
      });
    });

    // Modo Vista previa real vs Editar página
    if (ui.btnModoPreview) {
      ui.btnModoPreview.addEventListener("click", () => actualizarModoLienzo("preview"));
    }
    if (ui.btnModoEditar) {
      ui.btnModoEditar.addEventListener("click", () => actualizarModoLienzo("editar"));
    }
    if (ui.btnSalirModoEditar) {
      ui.btnSalirModoEditar.addEventListener("click", () => actualizarModoLienzo("preview"));
    }

    // Deshacer / Rehacer
    const ejecutarDeshacer = () => {
      if (!registroActual || pilaDeshacer.length === 0) {
        return;
      }
      pilaRehacer.push(capturarInstantanea(registroActual));
      const previo = pilaDeshacer.pop();
      aplicarInstantanea(registroActual, previo);
      asegurarEstructuraBorrador(registroActual);
      renderizarTodoEditor();
      guardarCambio("", false, "Se deshizo el último cambio");
    };

    const ejecutarRehacer = () => {
      if (!registroActual || pilaRehacer.length === 0) {
        return;
      }
      pilaDeshacer.push(capturarInstantanea(registroActual));
      const siguiente = pilaRehacer.pop();
      aplicarInstantanea(registroActual, siguiente);
      asegurarEstructuraBorrador(registroActual);
      renderizarTodoEditor();
      guardarCambio("", false, "Se rehízo el cambio");
    };

    ui.btnDeshacer.addEventListener("click", ejecutarDeshacer);
    ui.btnRehacer.addEventListener("click", ejecutarRehacer);

    document.addEventListener("keydown", (e) => {
      if (!registroActual || ui.espacio.hidden) {
        return;
      }
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement && document.activeElement.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          ejecutarRehacer();
        } else {
          ejecutarDeshacer();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        ejecutarRehacer();
      }
    });

    // Vista móvil 360 px / escritorio
    ui.btnMovil.addEventListener("click", () => actualizarViewport("movil"));
    ui.btnEscritorio.addEventListener("click", () => actualizarViewport("escritorio"));

    // Plantillas con miniaturas
    ui.tplBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!registroActual) {
          return;
        }
        const nueva = btn.dataset.plantilla;
        if (registroActual.diseno.plantilla === nueva) {
          return;
        }
        empujarEstadoDeshacer();
        registroActual.diseno.plantilla = nueva;
        const nombreTpl = PLANTILLAS_ETIQUETAS[nueva] || nueva;
        renderizarControlesDiseno();
        renderizarLienzoEditable();
        guardarCambio(
          `Plantilla ${nombreTpl}`,
          true,
          `Plantilla ${nombreTpl} aplicada`,
          `Cambió el diseño visual a ${nombreTpl}`
        );
      });
    });

    // Tipografía
    ui.selectFuente.addEventListener("change", () => {
      if (!registroActual) {
        return;
      }
      empujarEstadoDeshacer();
      registroActual.diseno.fuente = ui.selectFuente.value;
      renderizarLienzoEditable();
      guardarCambio(
        `Tipografía ${ui.selectFuente.value}`,
        true,
        "Tipografía actualizada",
        `Fuente cambiada a ${ui.selectFuente.value}`
      );
    });

    // Calle o colonia del negocio
    if (ui.inputDireccion) {
      ui.inputDireccion.addEventListener("change", () => {
        if (!registroActual || !window.dmdGenerador) {
          return;
        }
        const limpia = window.dmdGenerador.limpiarTexto(ui.inputDireccion.value);
        ui.inputDireccion.value = limpia;
        empujarEstadoDeshacer();
        registroActual.datos.direccion = limpia;
        const nuevo = window.dmdGenerador.generarBorrador(registroActual.datos, registroActual.borrador.variante || 0);
        registroActual.borrador.presentacion = nuevo.presentacion;
        registroActual.borrador.preguntasFrecuentes = nuevo.preguntasFrecuentes;
        registroActual.borrador.estructura = nuevo.estructura;
        renderizarControlesDiseno();
        renderizarLienzoEditable();
        guardarCambio(
          limpia ? "Dirección actualizada" : "Dirección quitada",
          true,
          "Dirección actualizada",
          limpia || "Se dejó sin dirección"
        );
      });
    }

    // Horario del negocio
    if (ui.inputHorario) {
      ui.inputHorario.addEventListener("change", () => {
        if (!registroActual || !window.dmdGenerador) {
          return;
        }
        const limpio = window.dmdGenerador.limpiarTexto(ui.inputHorario.value);
        ui.inputHorario.value = limpio;
        empujarEstadoDeshacer();
        registroActual.datos.horario = limpio;
        const nuevo = window.dmdGenerador.generarBorrador(registroActual.datos, registroActual.borrador.variante || 0);
        registroActual.borrador.presentacion = nuevo.presentacion;
        registroActual.borrador.preguntasFrecuentes = nuevo.preguntasFrecuentes;
        registroActual.borrador.estructura = nuevo.estructura;
        renderizarControlesDiseno();
        renderizarLienzoEditable();
        guardarCambio(
          limpio ? "Horario actualizado" : "Horario quitado",
          true,
          "Horario actualizado",
          limpio || "Se dejó sin horario"
        );
      });
    }

    // WhatsApp del negocio
    ui.inputWhatsapp.addEventListener("change", () => {
      if (!registroActual) {
        return;
      }
      const limpio = ui.inputWhatsapp.value.replace(/\D/g, "").slice(0, 15);
      ui.inputWhatsapp.value = limpio;
      empujarEstadoDeshacer();
      registroActual.datos.whatsapp = limpio;
      registroActual.borrador.whatsapp = limpio;
      if (window.dmdGenerador && typeof window.dmdGenerador.generarBorrador === "function") {
        const nuevo = window.dmdGenerador.generarBorrador(registroActual.datos, registroActual.borrador.variante || 0);
        registroActual.borrador.presentacion = nuevo.presentacion;
        registroActual.borrador.beneficios = nuevo.beneficios;
        registroActual.borrador.preguntasFrecuentes = nuevo.preguntasFrecuentes;
        registroActual.borrador.estructura = nuevo.estructura;
      }
      renderizarControlesDiseno();
      renderizarLienzoEditable();
      guardarCambio(
        limpio ? "WhatsApp configurado" : "WhatsApp quitado",
        true,
        limpio ? "WhatsApp actualizado" : "WhatsApp eliminado",
        limpio ? `Número ${limpio}` : "Se retiró el número de WhatsApp"
      );
    });

    // Subida de logo
    ui.inputLogoFile.addEventListener("change", async () => {
      const archivo = ui.inputLogoFile.files && ui.inputLogoFile.files[0];
      if (!archivo || !registroActual) {
        return;
      }
      try {
        const dataUrl = await comprimirImagenArchivo(archivo, 220);
        empujarEstadoDeshacer();
        registroActual.diseno.logoDataUrl = dataUrl;
        if (!registroActual.diseno.logoAlt) {
          registroActual.diseno.logoAlt = `Logo de ${registroActual.datos.nombre}`;
        }
        renderizarControlesDiseno();
        renderizarLienzoEditable();
        guardarCambio("Logo actualizado", true, "Logo cargado", "Se subió una imagen de logo");
      } catch (error) {
        anunciarGuardado("No se pudo cargar el logo. Usa una imagen válida.");
      } finally {
        ui.inputLogoFile.value = "";
      }
    });

    ui.btnQuitarLogo.addEventListener("click", () => {
      if (!registroActual) {
        return;
      }
      empujarEstadoDeshacer();
      registroActual.diseno.logoDataUrl = "";
      renderizarControlesDiseno();
      renderizarLienzoEditable();
      guardarCambio("Logo quitado", true, "Logo eliminado", "Se retiró la imagen del logo");
    });

    ui.inputLogoAlt.addEventListener("input", () => {
      if (!registroActual) {
        return;
      }
      registroActual.diseno.logoAlt = ui.inputLogoAlt.value.trim();
      renderizarLienzoEditable();
      guardarCambio("", false, "Texto alternativo del logo guardado");
    });

    // Cambio de foto sugerida de portada por giro
    if (ui.btnCambiarPortada) {
      ui.btnCambiarPortada.addEventListener("click", () => {
        if (
          !registroActual ||
          !window.dmdGenerador ||
          typeof window.dmdGenerador.obtenerSiguientePortada !== "function"
        ) {
          return;
        }
        const siguiente = window.dmdGenerador.obtenerSiguientePortada(
          registroActual.datos,
          registroActual.diseno.portadaIndice,
          registroActual.diseno.portadaDataUrl
        );
        if (!siguiente || !siguiente.url) {
          return;
        }
        empujarEstadoDeshacer();
        aplicarPortadaEnRegistro(registroActual, siguiente);
        renderizarControlesDiseno();
        renderizarLienzoEditable();
        guardarCambio("Portada cambiada", true, "Portada cambiada", siguiente.etiqueta || "Foto sugerida");
      });
    }

    // Subida de portada propia
    ui.inputPortadaFile.addEventListener("change", async () => {
      const archivo = ui.inputPortadaFile.files && ui.inputPortadaFile.files[0];
      if (!archivo || !registroActual) {
        return;
      }
      if (
        window.dmdGenerador &&
        typeof window.dmdGenerador.esArchivoImagenValido === "function" &&
        !window.dmdGenerador.esArchivoImagenValido(archivo)
      ) {
        anunciarGuardado("Solo se permiten archivos de imagen");
        ui.inputPortadaFile.value = "";
        return;
      }
      try {
        const dataUrl = await comprimirImagenArchivo(archivo, 720);
        empujarEstadoDeshacer();
        aplicarPortadaEnRegistro(registroActual, {
          url: dataUrl,
          alt:
            registroActual.diseno.portadaAlt ||
            `Imagen principal de ${registroActual.datos.nombre}`,
          origen: "propia",
          giro: registroActual.diseno.portadaGiro || registroActual.datos.giro,
          indice: registroActual.diseno.portadaIndice
        });
        renderizarControlesDiseno();
        renderizarLienzoEditable();
        guardarCambio("Portada propia", true, "Imagen de portada guardada", "Se subió una portada propia");
      } catch (error) {
        anunciarGuardado("Solo se permiten imágenes válidas");
      } finally {
        ui.inputPortadaFile.value = "";
      }
    });

    ui.btnQuitarPortada.addEventListener("click", () => {
      if (!registroActual) {
        return;
      }
      empujarEstadoDeshacer();
      aplicarPortadaEnRegistro(registroActual, null);
      renderizarControlesDiseno();
      renderizarLienzoEditable();
      guardarCambio("Portada quitada", true, "Portada eliminada", "Se quitó la imagen de portada");
    });

    ui.inputPortadaAlt.addEventListener("input", () => {
      if (!registroActual) {
        return;
      }
      registroActual.diseno.portadaAlt = ui.inputPortadaAlt.value.trim();
      if (registroActual.borrador && registroActual.borrador.portada) {
        registroActual.borrador.portada.alt = registroActual.diseno.portadaAlt;
      }
      renderizarLienzoEditable();
      guardarCambio("", false, "Texto alternativo guardado");
    });

    // SEO: título, descripción y palabras clave
    ui.inputSeoTitulo.addEventListener("input", () => {
      if (!registroActual) {
        return;
      }
      registroActual.seo.titulo = ui.inputSeoTitulo.value.trim();
      guardarCambio("", false, "Título SEO guardado");
    });

    ui.inputSeoDesc.addEventListener("input", () => {
      if (!registroActual) {
        return;
      }
      registroActual.seo.descripcion = ui.inputSeoDesc.value.trim();
      guardarCambio("", false, "Descripción SEO guardada");
    });

    if (ui.inputSeoKeywords) {
      ui.inputSeoKeywords.addEventListener("input", () => {
        if (!registroActual) {
          return;
        }
        registroActual.seo.palabrasClave = ui.inputSeoKeywords.value.trim();
        guardarCambio("", false, "Palabras clave guardadas");
      });
    }

    // Subdominio en dmd con validación en vivo
    if (ui.inputSubdominio) {
      ui.inputSubdominio.addEventListener("input", () => {
        if (!registroActual) {
          return;
        }
        registroActual.dominio.subdominio = ui.inputSubdominio.value.trim().toLowerCase();
        renderizarPanelPublicar();
        renderizarPanelSeo();
        guardarCambio("", false, "Subdominio actualizado");
      });
    }

    // Publicar y dominio
    ui.btnPublicar.addEventListener("click", () => {
      if (!registroActual || typeof callbacks.alPublicarBorrador !== "function") {
        return;
      }
      const gen = window.dmdGenerador;
      if (gen && typeof gen.validarSubdominio === "function" && registroActual.dominio.subdominio) {
        const val = gen.validarSubdominio(registroActual.dominio.subdominio);
        if (val.ok && !registroActual.publicadaSlug) {
          registroActual.publicadaSlug = val.slug;
        }
      }
      callbacks.alPublicarBorrador(registroActual);
      renderizarPanelPublicar();
      renderizarPanelSeo();
      anunciarGuardado("Página publicada");
    });

    ui.btnCopiarEnlace.addEventListener("click", () => {
      const url = ui.urlPubEl.textContent;
      if (!url) {
        return;
      }
      copiarTexto(url).then((ok) => {
        anunciarGuardado(ok ? "Enlace copiado" : "No se pudo copiar");
      });
    });

    ui.inputDominio.addEventListener("input", () => {
      if (!registroActual) {
        return;
      }
      registroActual.dominio.dominioPropio = ui.inputDominio.value
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/.*$/, "");
      guardarCambio("", false, "Dominio guardado");
    });

    // Analítica con confirmación antes de reiniciar
    ui.btnReiniciarAnalitica.addEventListener("click", () => {
      if (!registroActual || !ui.confirmarReinicioAnalitica) {
        return;
      }
      ui.confirmarReinicioAnalitica.hidden = false;
      if (ui.btnConfirmarReinicioAnalitica) {
        ui.btnConfirmarReinicioAnalitica.focus();
      }
    });

    if (ui.btnCancelarReinicioAnalitica && ui.confirmarReinicioAnalitica) {
      ui.btnCancelarReinicioAnalitica.addEventListener("click", () => {
        ui.confirmarReinicioAnalitica.hidden = true;
        ui.btnReiniciarAnalitica.focus();
      });
    }

    if (ui.btnConfirmarReinicioAnalitica && ui.confirmarReinicioAnalitica) {
      ui.btnConfirmarReinicioAnalitica.addEventListener("click", () => {
        if (!registroActual) {
          return;
        }
        registroActual.analitica.visitas = 0;
        registroActual.analitica.clicsWhatsapp = 0;
        registroActual.analitica.enviosFormulario = 0;
        ui.confirmarReinicioAnalitica.hidden = true;
        guardarCambio("", false, "Contadores reiniciados a cero");
      });
    }

    ui.inputAnalyticsId.addEventListener("input", () => {
      if (!registroActual) {
        return;
      }
      registroActual.analitica.idAnalitica = ui.inputAnalyticsId.value.trim();
      guardarCambio("", false, "ID de analítica guardado");
    });

    ui.inputPixelId.addEventListener("input", () => {
      if (!registroActual) {
        return;
      }
      registroActual.analitica.idPixel = ui.inputPixelId.value.trim();
      guardarCambio("", false, "ID de píxel guardado");
    });

    // Respaldo en panel historial
    ui.btnDescargarPanel.addEventListener("click", () => {
      if (typeof callbacks.alDescargarRespaldo === "function") {
        callbacks.alDescargarRespaldo();
      }
    });
    ui.btnImportarPanel.addEventListener("click", () => {
      if (typeof callbacks.alPedirImportar === "function") {
        callbacks.alPedirImportar();
      }
    });

    if (window.dmdCuenta && typeof window.dmdCuenta.alCambiarSesion === "function") {
      window.dmdCuenta.alCambiarSesion(() => {
        if (registroActual) {
          renderizarPanelPublicar();
          renderizarPanelHistorialYSeguridad();
        }
      });
    }
  }

  window.dmdEditor = {
    asegurarEstructuraBorrador,
    aplicarPortadaEnRegistro,
    registrarVersion,

    configurar(opciones) {
      callbacks = { ...callbacks, ...(opciones || {}) };
    },

    cargarBorrador(registro, reiniciarPilas) {
      const cambioId = !registroActual || !registro || registroActual.id !== registro.id;
      registroActual = registro ? asegurarEstructuraBorrador(registro) : null;
      if (cambioId || reiniciarPilas) {
        pilaDeshacer = [];
        pilaRehacer = [];
        confirmandoRestaurarId = null;
      }
      renderizarTodoEditor();
    },

    abrirPanel(nombrePanel) {
      abrirTabInterno(nombrePanel);
    },

    cambiarModoLienzo(modo) {
      actualizarModoLienzo(modo);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", conectarEventosEditor);
  } else {
    conectarEventosEditor();
  }
})();
