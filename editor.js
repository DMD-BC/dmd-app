"use strict";

/* ==========================================================================
   dmd - Editor visual, plantillas, kit de marca, SEO, publicación,
   analítica, historial de versiones y revisión básica de seguridad.
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

  const FUENTES_MAPA = {
    sistema:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    editorial: 'Georgia, "Times New Roman", Times, serif',
    moderna: '"Trebuchet MS", "Segoe UI", Roboto, Arial, sans-serif'
  };

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
    const giroActual = (registro.datos && registro.datos.giro) || "otro";
    const nombreActual = (registro.datos && registro.datos.nombre) || "Mi negocio";

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
    const alt =
      typeof portada.alt === "string" && portada.alt.trim()
        ? portada.alt.trim()
        : `Imagen principal de ${nombreActual}`;

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

  function asegurarEstructuraBorrador(registro) {
    if (!registro) {
      return null;
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
    if (!/^#[0-9a-fA-F]{6}$/.test(registro.diseno.colorMarca || "")) {
      registro.diseno.colorMarca = "#0f5c4d";
    }
    if (!FUENTES_MAPA[registro.diseno.fuente]) {
      registro.diseno.fuente = "sistema";
    }
    if (!Array.isArray(registro.diseno.ordenSecciones) || registro.diseno.ordenSecciones.length !== SECCIONES_DEFECTO.length) {
      const ordenSugerido =
        (registro.borrador &&
          registro.borrador.estructura &&
          Array.isArray(registro.borrador.estructura.ordenSecciones) &&
          registro.borrador.estructura.ordenSecciones.length === SECCIONES_DEFECTO.length &&
          registro.borrador.estructura.ordenSecciones) ||
        (window.dmdGenerador &&
          typeof window.dmdGenerador.obtenerEstructuraNegocio === "function" &&
          window.dmdGenerador.obtenerEstructuraNegocio(registro.datos).ordenSecciones) ||
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
          : window.dmdGenerador && typeof window.dmdGenerador.seleccionarPortada === "function"
            ? window.dmdGenerador.seleccionarPortada(
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

    if (!registro.dominio || typeof registro.dominio !== "object") {
      registro.dominio = { dominioPropio: "" };
    }
    if (typeof registro.dominio.dominioPropio !== "string") {
      registro.dominio.dominioPropio = "";
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

  function registrarVersion(registro, etiqueta) {
    asegurarEstructuraBorrador(registro);
    registro.versiones.unshift({
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      etiqueta: etiqueta || "Cambio guardado",
      creadoEn: new Date().toISOString(),
      instantanea: capturarInstantanea(registro)
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
  let seccionArrastrada = null;

  function obtenerNodos() {
    return {
      vacio: document.getElementById("editor-vacio"),
      espacio: document.getElementById("editor-espacio"),
      btnIrChat: document.getElementById("btn-editor-ir-chat"),
      btnDeshacer: document.getElementById("btn-deshacer"),
      btnRehacer: document.getElementById("btn-rehacer"),
      btnMovil: document.getElementById("btn-vista-movil"),
      btnEscritorio: document.getElementById("btn-vista-escritorio"),
      etiquetaViewport: document.getElementById("etiqueta-viewport"),
      stage: document.getElementById("editor-preview-stage"),
      lienzo: document.getElementById("lienzo-editor"),
      estadoAuto: document.getElementById("estado-guardado-auto"),

      tabs: Array.from(document.querySelectorAll(".edtab")),
      paneles: Array.from(document.querySelectorAll(".editor-panel")),

      tplBtns: Array.from(document.querySelectorAll(".tpl-btn")),
      swatchBtns: Array.from(document.querySelectorAll(".swatch-btn")),
      inputColor: document.getElementById("ed-color-marca"),
      selectFuente: document.getElementById("ed-fuente"),
      inputWhatsapp: document.getElementById("ed-whatsapp"),
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
      inputSeoDesc: document.getElementById("ed-seo-desc"),
      cuentaSeoDesc: document.getElementById("ed-seo-desc-cuenta"),
      seoPrevUrl: document.getElementById("seo-preview-url"),
      seoPrevTitulo: document.getElementById("seo-preview-titulo"),
      seoPrevDesc: document.getElementById("seo-preview-desc"),

      pillPub: document.getElementById("ed-estado-pub-pill"),
      btnPublicar: document.getElementById("btn-ed-publicar"),
      bloquePub: document.getElementById("ed-bloque-publicada"),
      urlPubEl: document.getElementById("ed-url-publicada"),
      btnVerPub: document.getElementById("btn-ed-ver-publicada"),
      btnCopiarEnlace: document.getElementById("btn-ed-copiar-enlace"),
      btnCompartirWa: document.getElementById("btn-ed-compartir-wa"),
      inputDominio: document.getElementById("ed-dominio-propio"),
      tagDominio: document.getElementById("ed-estado-dominio-tag"),
      btnIrPago: document.getElementById("btn-ed-ir-pago"),

      metVisitas: document.getElementById("met-visitas"),
      metWa: document.getElementById("met-wa"),
      metForm: document.getElementById("met-form"),
      btnReiniciarAnalitica: document.getElementById("btn-reiniciar-analitica"),
      inputAnalyticsId: document.getElementById("ed-analytics-id"),
      inputPixelId: document.getElementById("ed-pixel-id"),
      estadoAnalitica: document.getElementById("estado-analitica"),

      versionesVacio: document.getElementById("versiones-vacio"),
      listaVersiones: document.getElementById("lista-versiones"),
      btnDescargarPanel: document.getElementById("btn-descargar-respaldo-panel"),
      btnImportarPanel: document.getElementById("btn-importar-respaldo-panel"),
      listaSeguridad: document.getElementById("lista-seguridad")
    };
  }

  let ui = null;

  function actualizarBotonesHistorial() {
    if (!ui) {
      return;
    }
    ui.btnDeshacer.disabled = pilaDeshacer.length === 0;
    ui.btnRehacer.disabled = pilaRehacer.length === 0;
  }

  function anunciarGuardado(mensaje) {
    if (!ui || !ui.estadoAuto) {
      return;
    }
    const hora = formatearFechaCorta(new Date().toISOString());
    ui.estadoAuto.textContent = mensaje
      ? `${mensaje}${hora ? " · " + hora : ""}`
      : `Guardado automático${hora ? " · " + hora : ""}`;
  }

  function guardarCambio(etiquetaVersion, registrarEnHistorial, mensajeEstado) {
    if (!registroActual) {
      return;
    }
    registroActual.actualizadoEn = new Date().toISOString();
    if (registrarEnHistorial) {
      registrarVersion(registroActual, etiquetaVersion);
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
    ui.swatchBtns.forEach((s) => {
      const activo = (s.dataset.color || "").toLowerCase() === (diseno.colorMarca || "").toLowerCase();
      s.classList.toggle("swatch-active", activo);
      s.setAttribute("aria-pressed", activo ? "true" : "false");
    });
    ui.inputColor.value = diseno.colorMarca || "#0f5c4d";
    ui.selectFuente.value = diseno.fuente || "sistema";
    ui.inputWhatsapp.value = datos.whatsapp || "";
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
          guardarCambio("Foto de portada", true, "Portada cambiada");
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
    ui.cuentaSeoTitulo.textContent = `${(seo.titulo || "").length} / 70`;
    ui.cuentaSeoDesc.textContent = `${(seo.descripcion || "").length} / 165`;

    const urlMostrar = dominio.dominioPropio
      ? `https://${dominio.dominioPropio.replace(/^https?:\/\//i, "")}`
      : publicadaSlug && window.dmdGenerador
        ? window.dmdGenerador.construirUrlPublicada(publicadaSlug)
        : "Vista previa";

    ui.seoPrevUrl.textContent = urlMostrar;
    ui.seoPrevTitulo.textContent = seo.titulo || registroActual.borrador.titulo;
    ui.seoPrevDesc.textContent = seo.descripcion || registroActual.borrador.presentacion;
  }

  function renderizarPanelPublicar() {
    if (!ui || !registroActual) {
      return;
    }
    const publicada = Boolean(registroActual.publicadaSlug);
    ui.pillPub.textContent = publicada ? "Publicada" : "Borrador";
    ui.btnPublicar.textContent = publicada ? "Actualizar página" : "Publicar página";

    if (publicada && window.dmdGenerador) {
      const rutaVer = `ver.html?id=${encodeURIComponent(registroActual.publicadaSlug)}`;
      const url = window.dmdGenerador.construirUrlPublicada(registroActual.publicadaSlug);
      ui.bloquePub.hidden = false;
      ui.urlPubEl.textContent = url;
      ui.btnVerPub.href = rutaVer;
      const textoWa = `Te comparto la página de ${registroActual.datos.nombre}: ${url}`;
      ui.btnCompartirWa.href = `https://wa.me/?text=${encodeURIComponent(textoWa)}`;
    } else {
      ui.bloquePub.hidden = true;
    }

    if (document.activeElement !== ui.inputDominio) {
      ui.inputDominio.value = registroActual.dominio.dominioPropio || "";
    }
    ui.tagDominio.textContent = registroActual.dominio.dominioPropio
      ? `Pendiente: ${registroActual.dominio.dominioPropio}`
      : "Pendiente";
    ui.btnIrPago.href = `pago.html?borrador=${encodeURIComponent(registroActual.id)}`;
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
      versiones.forEach((v) => {
        const li = document.createElement("li");
        li.className = "version-item";

        const info = document.createElement("div");
        const tit = document.createElement("p");
        tit.className = "version-label";
        tit.textContent = v.etiqueta;
        const fec = document.createElement("p");
        fec.className = "version-date";
        fec.textContent = formatearFechaCorta(v.creadoEn);
        info.appendChild(tit);
        info.appendChild(fec);

        const btnRest = document.createElement("button");
        btnRest.type = "button";
        btnRest.className = "btn btn-secondary btn-sm";
        btnRest.textContent = "Restaurar";
        btnRest.addEventListener("click", () => {
          empujarEstadoDeshacer();
          aplicarInstantanea(registroActual, v.instantanea);
          asegurarEstructuraBorrador(registroActual);
          renderizarTodoEditor();
          guardarCambio(`Restaurada: ${v.etiqueta}`, true, "Restaurada");
        });

        li.appendChild(info);
        li.appendChild(btnRest);
        ui.listaVersiones.appendChild(li);
      });
    }

    // Estado del sitio
    const { datos, diseno, seo } = registroActual;
    const tieneWa = Boolean(String(datos.whatsapp || "").replace(/\D/g, ""));
    const seoCompleto = Boolean((seo.titulo || "").trim().length >= 10 && (seo.descripcion || "").trim().length >= 30);
    const imagenesConAlt =
      (!diseno.logoDataUrl || Boolean((diseno.logoAlt || "").trim())) &&
      (!diseno.portadaDataUrl || Boolean((diseno.portadaAlt || "").trim()));

    const elementos = [
      {
        texto: "Sin datos de tarjeta en el navegador",
        ok: true,
        estado: "Listo"
      },
      {
        texto: "WhatsApp del negocio",
        ok: tieneWa,
        estado: tieneWa ? "Listo" : "Falta"
      },
      {
        texto: "SEO completo",
        ok: seoCompleto,
        estado: seoCompleto ? "Listo" : "Falta"
      },
      {
        texto: "Texto alt en imágenes",
        ok: imagenesConAlt,
        estado: imagenesConAlt ? "Listo" : "Falta"
      },
      {
        texto: "Cuentas en servidor",
        ok: false,
        estado: "Pendiente"
      },
      {
        texto: "Dominio y SSL",
        ok: false,
        estado: "Pendiente"
      }
    ];

    ui.listaSeguridad.textContent = "";
    elementos.forEach((item) => {
      const li = document.createElement("li");
      li.className = "security-item";
      const spTxt = document.createElement("span");
      spTxt.textContent = item.texto;
      const spBadge = document.createElement("span");
      spBadge.className = item.ok ? "status-tag-ok" : "status-tag-pending";
      spBadge.textContent = item.estado;
      li.appendChild(spTxt);
      li.appendChild(spBadge);
      ui.listaSeguridad.appendChild(li);
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
    guardarCambio("Reordenó secciones", true, "Orden de secciones actualizado");
  }

  function enlazarTextoEditable(elemento, alConfirmar) {
    elemento.setAttribute("contenteditable", "true");
    elemento.classList.add("editable-inline");
    elemento.setAttribute("spellcheck", "true");

    let valorInicial = "";
    elemento.addEventListener("focus", () => {
      valorInicial = elemento.textContent;
    });
    elemento.addEventListener("blur", () => {
      const nuevo = elemento.textContent.replace(/\s+/g, " ").trim();
      if (!nuevo) {
        elemento.textContent = valorInicial;
        return;
      }
      if (nuevo !== valorInicial) {
        empujarEstadoDeshacer();
        alConfirmar(nuevo);
        guardarCambio("Edición manual de texto", true, "Texto actualizado");
      }
    });
  }

  function renderizarLienzoEditable() {
    if (!ui || !registroActual) {
      return;
    }

    const { datos, borrador, diseno } = registroActual;
    const plantilla = diseno.plantilla || "clasica";
    const colorMarca = diseno.colorMarca || "#0f5c4d";
    const fuente = FUENTES_MAPA[diseno.fuente] || FUENTES_MAPA.sistema;
    const orden = diseno.ordenSecciones || SECCIONES_DEFECTO;

    ui.lienzo.textContent = "";

    const articulo = document.createElement("article");
    articulo.className = `biz-page biz-template-${plantilla}${vistaActual === "escritorio" ? " biz-desktop-layout" : ""}`;
    articulo.style.setProperty("--biz-accent", colorMarca);
    articulo.style.setProperty("--biz-font", fuente);

    // Encabezado del negocio
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

    const numeroWa = String(datos.whatsapp || "").replace(/\D/g, "");

    orden.forEach((secId, idx) => {
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

      const estructura =
        (borrador && borrador.estructura) ||
        (window.dmdGenerador &&
          typeof window.dmdGenerador.obtenerEstructuraNegocio === "function" &&
          window.dmdGenerador.obtenerEstructuraNegocio(datos)) ||
        null;
      const titulosSec = (estructura && estructura.titulos) || {};

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
          fig.appendChild(img);
          hero.appendChild(fig);
        }

        const h3 = document.createElement("h3");
        h3.className = "biz-title";
        h3.dataset.campoEditable = "titulo";
        h3.textContent = borrador.titulo;
        enlazarTextoEditable(h3, (val) => {
          borrador.titulo = val;
        });
        hero.appendChild(h3);

        const p = document.createElement("p");
        p.className = "biz-intro";
        p.dataset.campoEditable = "presentacion";
        p.textContent = borrador.presentacion;
        enlazarTextoEditable(p, (val) => {
          borrador.presentacion = val;
        });
        hero.appendChild(p);
        wrapper.appendChild(hero);
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
          enlazarTextoEditable(t, (val) => {
            s.titulo = val;
          });
          li.appendChild(t);

          const d = document.createElement("p");
          d.className = "biz-service-desc";
          d.textContent = s.descripcion || "Detalle del servicio.";
          enlazarTextoEditable(d, (val) => {
            s.descripcion = val;
          });
          li.appendChild(d);

          ul.appendChild(li);
        });
        bloque.appendChild(ul);
        wrapper.appendChild(bloque);
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
          enlazarTextoEditable(sp, (val) => {
            borrador.beneficios[bIdx] = val;
          });
          li.appendChild(sp);
          ul.appendChild(li);
        });
        bloque.appendChild(ul);
        wrapper.appendChild(bloque);
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
          const card = document.createElement("div");
          card.className = "faq-item faq-item-editable";

          const q = document.createElement("p");
          q.className = "faq-question-editable";
          q.textContent = f.pregunta;
          enlazarTextoEditable(q, (val) => {
            borrador.preguntasFrecuentes[fIdx].pregunta = val;
          });

          const a = document.createElement("p");
          a.className = "faq-answer";
          a.textContent = f.respuesta;
          enlazarTextoEditable(a, (val) => {
            borrador.preguntasFrecuentes[fIdx].respuesta = val;
          });

          card.appendChild(q);
          card.appendChild(a);
          lista.appendChild(card);
        });
        bloque.appendChild(lista);
        wrapper.appendChild(bloque);
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
          sp.textContent = (estructura && estructura.ctaWhatsapp) || `Enviar WhatsApp a ${datos.nombre}`;
          enlace.appendChild(sp);
          bloque.appendChild(enlace);
        } else {
          const aviso = document.createElement("p");
          aviso.className = "notice-box";
          aviso.textContent = "Agrega tu WhatsApp en Diseño.";
          bloque.appendChild(aviso);
        }

        // Formulario de contacto funcional en la vista previa
        const formBox = document.createElement("form");
        formBox.className = "biz-contact-form";
        formBox.noValidate = true;
        formBox.setAttribute("onsubmit", "return false;");

        const formTitle = document.createElement("h5");
        formTitle.className = "biz-form-title";
        formTitle.textContent = "Enviar mensaje";
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
        txtMsg.placeholder = "Tu mensaje";
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
          if (!numeroWa) {
            salidaForm.textContent = "Agrega tu WhatsApp en Diseño.";
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

        wrapper.appendChild(bloque);
      }

      cuerpo.appendChild(wrapper);
    });

    articulo.appendChild(cuerpo);
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
    ui.etiquetaViewport.textContent = esEsc ? "Escritorio" : "Celular 360 px";
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

    // Pestañas internas del editor
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

    // Deshacer / Rehacer
    ui.btnDeshacer.addEventListener("click", () => {
      if (!registroActual || pilaDeshacer.length === 0) {
        return;
      }
      pilaRehacer.push(capturarInstantanea(registroActual));
      const previo = pilaDeshacer.pop();
      aplicarInstantanea(registroActual, previo);
      asegurarEstructuraBorrador(registroActual);
      renderizarTodoEditor();
      guardarCambio("", false, "Se deshizo el último cambio");
    });

    ui.btnRehacer.addEventListener("click", () => {
      if (!registroActual || pilaRehacer.length === 0) {
        return;
      }
      pilaDeshacer.push(capturarInstantanea(registroActual));
      const siguiente = pilaRehacer.pop();
      aplicarInstantanea(registroActual, siguiente);
      asegurarEstructuraBorrador(registroActual);
      renderizarTodoEditor();
      guardarCambio("", false, "Se rehízo el cambio");
    });

    // Vista móvil / escritorio
    ui.btnMovil.addEventListener("click", () => actualizarViewport("movil"));
    ui.btnEscritorio.addEventListener("click", () => actualizarViewport("escritorio"));

    // Plantillas
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
        renderizarControlesDiseno();
        renderizarLienzoEditable();
        guardarCambio(`Plantilla ${btn.textContent}`, true, `Plantilla ${btn.textContent} aplicada`);
      });
    });

    // Colores
    ui.swatchBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!registroActual) {
          return;
        }
        empujarEstadoDeshacer();
        registroActual.diseno.colorMarca = btn.dataset.color;
        renderizarControlesDiseno();
        renderizarLienzoEditable();
        guardarCambio("Color de marca", true, "Color de marca actualizado");
      });
    });

    ui.inputColor.addEventListener("change", () => {
      if (!registroActual) {
        return;
      }
      empujarEstadoDeshacer();
      registroActual.diseno.colorMarca = ui.inputColor.value;
      renderizarControlesDiseno();
      renderizarLienzoEditable();
      guardarCambio("Color personalizado", true, "Color personalizado aplicado");
    });

    // Tipografía
    ui.selectFuente.addEventListener("change", () => {
      if (!registroActual) {
        return;
      }
      empujarEstadoDeshacer();
      registroActual.diseno.fuente = ui.selectFuente.value;
      renderizarLienzoEditable();
      guardarCambio("Tipografía", true, "Tipografía actualizada");
    });

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
      renderizarLienzoEditable();
      guardarCambio("WhatsApp del negocio", true, "WhatsApp actualizado");
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
        guardarCambio("Logo actualizado", true, "Logo cargado");
      } catch (error) {
        anunciarGuardado("No se pudo cargar el logo");
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
      guardarCambio("Logo quitado", true, "Logo eliminado");
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
        guardarCambio("Foto de portada", true, "Portada cambiada");
      });
    }

    // Subida de portada propia (solo imagen, guardada localmente)
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
        anunciarGuardado("Solo se permiten imágenes");
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
        guardarCambio("Imagen de portada", true, "Imagen de portada guardada");
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
      guardarCambio("Portada quitada", true, "Portada eliminada");
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

    // SEO
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

    // Publicar y dominio
    ui.btnPublicar.addEventListener("click", () => {
      if (!registroActual || typeof callbacks.alPublicarBorrador !== "function") {
        return;
      }
      callbacks.alPublicarBorrador(registroActual);
      renderizarPanelPublicar();
      renderizarPanelSeo();
      anunciarGuardado("Publicada");
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
      guardarCambio("", false, "Guardado");
    });

    // Analítica
    ui.btnReiniciarAnalitica.addEventListener("click", () => {
      if (!registroActual) {
        return;
      }
      registroActual.analitica.visitas = 0;
      registroActual.analitica.clicsWhatsapp = 0;
      registroActual.analitica.enviosFormulario = 0;
      guardarCambio("", false, "Reiniciado");
    });

    ui.inputAnalyticsId.addEventListener("input", () => {
      if (!registroActual) {
        return;
      }
      registroActual.analitica.idAnalitica = ui.inputAnalyticsId.value.trim();
      guardarCambio("", false, "Guardado");
    });

    ui.inputPixelId.addEventListener("input", () => {
      if (!registroActual) {
        return;
      }
      registroActual.analitica.idPixel = ui.inputPixelId.value.trim();
      guardarCambio("", false, "Guardado");
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
      }
      renderizarTodoEditor();
    },

    abrirPanel(nombrePanel) {
      if (!ui) {
        return;
      }
      const tab = ui.tabs.find((t) => t.dataset.panel === nombrePanel);
      if (tab) {
        tab.click();
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", conectarEventosEditor);
  } else {
    conectarEventosEditor();
  }
})();
