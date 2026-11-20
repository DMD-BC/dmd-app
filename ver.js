"use strict";

/* ==========================================================================
   dmd - Visor de página publicada (ver.html?id=<slug>)
   Renderiza la página del negocio con su plantilla, kit de marca, imágenes,
   orden de secciones, formulario funcional a WhatsApp y conteo local de
   actividad (visitas, clics en WhatsApp y envíos de formulario).
   ========================================================================== */

(function inicializarPaginaPublicada() {
  const SCRIPT_VER_SRC =
    document.currentScript && typeof document.currentScript.src === "string"
      ? document.currentScript.src
      : "";

  const FUENTES_MAPA = {
    sistema:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    editorial: 'Georgia, "Times New Roman", Times, serif',
    moderna: '"Trebuchet MS", "Segoe UI", Roboto, Arial, sans-serif'
  };

  const SECCIONES_DEFECTO = [
    "presentacion",
    "servicios",
    "beneficios",
    "preguntas",
    "contacto"
  ];

  let visitaContada = false;

  function extraerIdDeQuery(textoQuery) {
    if (!textoQuery || typeof textoQuery !== "string") {
      return "";
    }
    try {
      const limpio = textoQuery.startsWith("?") ? textoQuery : `?${textoQuery}`;
      const params = new URLSearchParams(limpio);
      return (params.get("id") || "").trim();
    } catch (error) {
      return "";
    }
  }

  function obtenerSlugUrl() {
    // 1) Parámetro ?id= en window.location.search
    const desdeSearch = extraerIdDeQuery(window.location.search || "");
    if (desdeSearch) {
      return desdeSearch;
    }
    // 2) Respaldo en window.location.hash (#id=... o #<slug>)
    try {
      const hash = String(window.location.hash || "").replace(/^#/, "").trim();
      if (hash) {
        if (hash.includes("=")) {
          const desdeHash = extraerIdDeQuery(hash);
          if (desdeHash) {
            return desdeHash;
          }
        } else {
          return decodeURIComponent(hash);
        }
      }
    } catch (error) {
      // Ignorar
    }
    return "";
  }

  function leerColeccion(clave) {
    if (window.dmdAlmacen && typeof window.dmdAlmacen.leer === "function") {
      const lista = window.dmdAlmacen.leer(clave, []);
      if (Array.isArray(lista)) {
        return lista;
      }
    }
    return [];
  }

  function leerPublicadas() {
    return leerColeccion("dmd_paginas_publicadas_v1");
  }

  function construirPaginaDesdeBorrador(borradorReg, slugPreferido) {
    if (!borradorReg || !borradorReg.datos || !borradorReg.borrador) {
      return null;
    }
    return {
      slug: borradorReg.publicadaSlug || slugPreferido || borradorReg.id,
      borradorId: borradorReg.id,
      cuentaId: borradorReg.cuentaId || "invitado",
      publicadaEn: borradorReg.actualizadoEn || borradorReg.creadoEn || "",
      actualizadaEn: borradorReg.actualizadoEn || "",
      datos: borradorReg.datos,
      borrador: borradorReg.borrador,
      diseno: borradorReg.diseno || {},
      seo: borradorReg.seo || {},
      dominio: borradorReg.dominio || {},
      analitica: borradorReg.analitica || {}
    };
  }

  function sanearPaginaPublicadaAlCargar(pagina) {
    if (!pagina || !pagina.datos || !pagina.borrador || !window.dmdGenerador) {
      return false;
    }
    const gen = window.dmdGenerador;
    let cambio = false;
    if (typeof gen.esOmisionWhatsapp === "function" && gen.esOmisionWhatsapp(pagina.datos.whatsapp)) {
      pagina.datos.whatsapp = "";
      pagina.borrador.whatsapp = "";
      cambio = true;
    } else {
      const digWa = String(pagina.datos.whatsapp || "").replace(/\D/g, "");
      const waValido = digWa.length >= 10 && digWa.length <= 15 ? digWa : "";
      if (waValido !== (pagina.datos.whatsapp || "")) {
        pagina.datos.whatsapp = waValido;
        pagina.borrador.whatsapp = waValido;
        cambio = true;
      }
    }
    if (typeof gen.formatearNombrePropio === "function") {
      const nom = gen.formatearNombrePropio(pagina.datos.nombre, "nombre");
      const ciu = gen.formatearNombrePropio(pagina.datos.ciudad, "ciudad");
      if (nom && nom !== pagina.datos.nombre) {
        pagina.datos.nombre = nom;
        cambio = true;
      }
      if (ciu && ciu !== pagina.datos.ciudad) {
        pagina.datos.ciudad = ciu;
        cambio = true;
      }
    }
    if (typeof gen.sanearBorradorLegado === "function" && gen.sanearBorradorLegado(pagina)) {
      cambio = true;
    }
    return cambio;
  }

  function buscarPaginaPublicada(slug) {
    const clave = String(slug || "").trim();
    if (!clave) {
      return null;
    }
    const claveMin = clave.toLowerCase();
    const publicadas = leerPublicadas();

    const exacta = publicadas.find(
      (p) =>
        p &&
        (p.slug === clave ||
          (typeof p.slug === "string" && p.slug.toLowerCase() === claveMin) ||
          p.borradorId === clave)
    );
    if (exacta && exacta.datos && exacta.borrador) {
      if (
        sanearPaginaPublicadaAlCargar(exacta) &&
        window.dmdAlmacen &&
        typeof window.dmdAlmacen.guardar === "function"
      ) {
        window.dmdAlmacen.guardar("dmd_paginas_publicadas_v1", publicadas);
      }
      return exacta;
    }

    const borradores = leerColeccion("dmd_borradores_v1");
    const borradorMatch = borradores.find(
      (b) =>
        b &&
        (b.publicadaSlug === clave ||
          (typeof b.publicadaSlug === "string" &&
            b.publicadaSlug.toLowerCase() === claveMin) ||
          b.id === clave)
    );
    if (!borradorMatch) {
      return null;
    }
    const desdeBorrador = construirPaginaDesdeBorrador(borradorMatch, clave);
    if (desdeBorrador) {
      sanearPaginaPublicadaAlCargar(desdeBorrador);
    }
    return desdeBorrador;
  }

  function construirEnlaceCompartible(slug) {
    try {
      const href = String(window.location.href || "");
      if (/^https?:\/\//i.test(href)) {
        const u = new URL("ver.html", href);
        u.searchParams.set("id", slug);
        return u.toString();
      }
      if (/^https?:\/\//i.test(SCRIPT_VER_SRC)) {
        const u = new URL("ver.html", SCRIPT_VER_SRC);
        u.searchParams.set("id", slug);
        return u.toString();
      }
      if (/^https?:\/\//i.test(String(document.baseURI || ""))) {
        const u = new URL("ver.html", document.baseURI);
        u.searchParams.set("id", slug);
        return u.toString();
      }
    } catch (error) {
      // Usar ruta relativa
    }
    if (
      window.dmdGenerador &&
      typeof window.dmdGenerador.construirUrlPublicada === "function"
    ) {
      return window.dmdGenerador.construirUrlPublicada(slug);
    }
    return `ver.html?id=${encodeURIComponent(slug)}`;
  }

  function registrarEventoAnalitica(slug, borradorId, campo) {
    if (!window.dmdAlmacen || typeof window.dmdAlmacen.leer !== "function") {
      return;
    }
    if (
      typeof window.dmdAlmacen.estaHidratado === "function" &&
      !window.dmdAlmacen.estaHidratado()
    ) {
      return;
    }

    const publicadas = leerPublicadas();
    let cambioPub = false;
    publicadas.forEach((p) => {
      if (p && p.slug === slug) {
        p.analitica = p.analitica || { visitas: 0, clicsWhatsapp: 0, enviosFormulario: 0 };
        p.analitica[campo] = (Number(p.analitica[campo]) || 0) + 1;
        p.analitica.ultimaActividad = new Date().toISOString();
        cambioPub = true;
      }
    });

    const borradores = window.dmdAlmacen.leer("dmd_borradores_v1", []);
    let cambioBor = false;
    if (Array.isArray(borradores)) {
      borradores.forEach((b) => {
        if (b && (b.id === borradorId || b.publicadaSlug === slug)) {
          b.analitica = b.analitica || { visitas: 0, clicsWhatsapp: 0, enviosFormulario: 0 };
          b.analitica[campo] = (Number(b.analitica[campo]) || 0) + 1;
          b.analitica.ultimaActividad = new Date().toISOString();
          cambioBor = true;
        }
      });
    }

    if (cambioPub || cambioBor) {
      const lote = {};
      if (cambioPub) {
        lote.dmd_paginas_publicadas_v1 = publicadas;
      }
      if (cambioBor) {
        lote.dmd_borradores_v1 = borradores;
      }
      if (typeof window.dmdAlmacen.guardarLote === "function") {
        window.dmdAlmacen.guardarLote(lote);
      } else {
        if (cambioPub) {
          window.dmdAlmacen.guardar("dmd_paginas_publicadas_v1", publicadas);
        }
        if (cambioBor) {
          window.dmdAlmacen.guardar("dmd_borradores_v1", borradores);
        }
      }
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

  function copiarConTextarea(texto) {
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "0";
      area.style.left = "0";
      area.style.width = "1px";
      area.style.height = "1px";
      area.style.fontSize = "16px";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      try {
        area.setSelectionRange(0, texto.length);
      } catch (errSel) {
        // Ignorar si no aplica
      }
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return Boolean(ok);
    } catch (error) {
      return false;
    }
  }

  function copiarTextoSeguro(texto) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(texto).then(
        () => true,
        () => copiarConTextarea(texto)
      );
    }
    return Promise.resolve(copiarConTextarea(texto));
  }

  function renderizarPaginaPublicada(esFinal) {
    const raiz = document.getElementById("pagina-publicada-raiz");
    const noEncontrada = document.getElementById("pagina-no-encontrada");
    const barra = document.getElementById("barra-publicada");
    const btnCopiar = document.getElementById("btn-pub-copiar");
    const btnCompartir = document.getElementById("btn-pub-compartir");
    const estadoBarra = document.getElementById("estado-barra-publicada");

    const slug = obtenerSlugUrl();
    const pagina = buscarPaginaPublicada(slug);

    if (!pagina || !pagina.datos || !pagina.borrador) {
      const esperandoHidratacion =
        !esFinal &&
        window.dmdAlmacen &&
        typeof window.dmdAlmacen.estaHidratado === "function" &&
        !window.dmdAlmacen.estaHidratado();

      if (esperandoHidratacion) {
        noEncontrada.hidden = true;
        barra.hidden = true;
        raiz.hidden = false;
        return;
      }

      raiz.hidden = true;
      barra.hidden = true;
      noEncontrada.hidden = false;
      document.title = "Página no disponible | dmd";
      return;
    }

    noEncontrada.hidden = true;
    raiz.hidden = false;
    barra.hidden = false;

    const { datos, borrador } = pagina;
    const diseno = pagina.diseno || {};
    const seo = pagina.seo || {};
    const plantilla = diseno.plantilla || "clasica";
    const colorMarca = "#0f5c4d";
    const fuente = FUENTES_MAPA[diseno.fuente] || FUENTES_MAPA.sistema;
    const estructura =
      (borrador && borrador.estructura) ||
      (window.dmdGenerador &&
        typeof window.dmdGenerador.obtenerEstructuraNegocio === "function" &&
        window.dmdGenerador.obtenerEstructuraNegocio(datos)) ||
      null;
    const titulosSec = (estructura && estructura.titulos) || {};
    const ordenSecciones =
      Array.isArray(diseno.ordenSecciones) && diseno.ordenSecciones.length
        ? diseno.ordenSecciones
        : estructura && Array.isArray(estructura.ordenSecciones) && estructura.ordenSecciones.length
          ? estructura.ordenSecciones
          : SECCIONES_DEFECTO;

    let portadaSrc = "";
    let portadaAlt = "";
    if (diseno.portadaOrigen !== "ninguna") {
      if (diseno.portadaDataUrl) {
        portadaSrc = diseno.portadaDataUrl;
        portadaAlt = diseno.portadaAlt || `Imagen de ${datos.nombre}`;
      } else if (borrador.portada && borrador.portada.url) {
        portadaSrc = borrador.portada.url;
        portadaAlt = borrador.portada.alt || `Imagen de ${datos.nombre}`;
      } else if (
        window.dmdGenerador &&
        typeof window.dmdGenerador.seleccionarPortada === "function"
      ) {
        const autoPortada = window.dmdGenerador.seleccionarPortada(datos, borrador.variante || 0);
        if (autoPortada && autoPortada.url) {
          portadaSrc = autoPortada.url;
          portadaAlt = autoPortada.alt || `Imagen de ${datos.nombre}`;
        }
      }
    }

    // SEO dinámico en el documento
    document.title = seo.titulo || borrador.titulo || `${datos.nombre} | dmd`;
    const metaDesc = document.getElementById("meta-descripcion-pagina");
    if (metaDesc) {
      metaDesc.setAttribute("content", seo.descripcion || borrador.presentacion || "");
    }
    if (seo.palabrasClave) {
      let metaKw = document.querySelector('meta[name="keywords"]');
      if (!metaKw) {
        metaKw = document.createElement("meta");
        metaKw.setAttribute("name", "keywords");
        document.head.appendChild(metaKw);
      }
      metaKw.setAttribute("content", seo.palabrasClave);
    }

    if (!visitaContada) {
      visitaContada = true;
      registrarEventoAnalitica(pagina.slug, pagina.borradorId, "visitas");
    }

    raiz.textContent = "";
    const claseVisualGiro = (estructura && estructura.claseVisual) || "otro";
    const articulo = document.createElement("article");
    articulo.className = `biz-page biz-template-${plantilla} biz-giro-${claseVisualGiro} biz-is-live-preview`;
    articulo.dataset.giro = claseVisualGiro;
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

    const numeroWa = window.dmdGenerador
      ? window.dmdGenerador.limpiarDigitos(datos.whatsapp)
      : String(datos.whatsapp || "").replace(/\D/g, "");

    ordenSecciones.forEach((sec) => {
      if (sec === "presentacion") {
        const hero = document.createElement("section");
        hero.className = "biz-section biz-hero";

        if (portadaSrc) {
          const fig = document.createElement("figure");
          fig.className = "biz-cover-wrap";
          const img = document.createElement("img");
          img.className = "biz-cover-img";
          img.src = portadaSrc;
          img.alt = portadaAlt || `Imagen de ${datos.nombre}`;
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

        const h1 = document.createElement("h1");
        h1.className = "biz-title";
        h1.textContent = borrador.titulo;
        hero.appendChild(h1);

        const p = document.createElement("p");
        p.className = "biz-intro";
        p.textContent = borrador.presentacion;
        hero.appendChild(p);
        cuerpo.appendChild(hero);
      }

      if (sec === "servicios") {
        const bloque = document.createElement("section");
        bloque.className = "biz-section";
        const h2 = document.createElement("h2");
        h2.className = "biz-section-title";
        h2.textContent = titulosSec.servicios || "Servicios";
        bloque.appendChild(h2);

        const ul = document.createElement("ul");
        ul.className = "biz-services-grid";
        (borrador.servicios || []).forEach((s) => {
          const li = document.createElement("li");
          li.className = "biz-service-card";
          const t = document.createElement("p");
          t.className = "biz-service-title";
          t.textContent = s.titulo;
          li.appendChild(t);
          if (s.descripcion) {
            const d = document.createElement("p");
            d.className = "biz-service-desc";
            d.textContent = s.descripcion;
            li.appendChild(d);
          }
          ul.appendChild(li);
        });
        bloque.appendChild(ul);
        cuerpo.appendChild(bloque);
      }

      if (sec === "beneficios") {
        const bloque = document.createElement("section");
        bloque.className = "biz-section";
        const h2 = document.createElement("h2");
        h2.className = "biz-section-title";
        h2.textContent = titulosSec.beneficios || "Beneficios";
        bloque.appendChild(h2);

        const ul = document.createElement("ul");
        ul.className = "preview-benefits";
        (borrador.beneficios || []).forEach((b) => {
          const li = document.createElement("li");
          li.className = "preview-benefit-item";
          li.appendChild(crearIconoCheck());
          const sp = document.createElement("span");
          sp.textContent = b;
          li.appendChild(sp);
          ul.appendChild(li);
        });
        bloque.appendChild(ul);
        cuerpo.appendChild(bloque);
      }

      if (sec === "preguntas") {
        const bloque = document.createElement("section");
        bloque.className = "biz-section";
        const h2 = document.createElement("h2");
        h2.className = "biz-section-title";
        h2.textContent = titulosSec.preguntas || "Preguntas frecuentes";
        bloque.appendChild(h2);

        const lista = document.createElement("div");
        lista.className = "faq-list";
        (borrador.preguntasFrecuentes || []).forEach((f, idx) => {
          const details = document.createElement("details");
          details.className = "faq-item";
          if (idx === 0) {
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
        });
        bloque.appendChild(lista);
        cuerpo.appendChild(bloque);
      }

      if (sec === "contacto") {
        const bloque = document.createElement("section");
        bloque.className = "biz-section biz-contact-section";
        const h2 = document.createElement("h2");
        h2.className = "biz-section-title";
        h2.textContent = titulosSec.contacto || "Contacto directo";
        bloque.appendChild(h2);

        if (numeroWa) {
          const msg =
            borrador.mensajeWhatsapp ||
            `Hola, vi la página de ${datos.nombre} y quiero pedir información.`;
          const enlace = document.createElement("a");
          enlace.id = "pub-btn-whatsapp";
          enlace.className = "btn biz-btn-primary btn-full";
          enlace.href = `https://wa.me/${numeroWa}?text=${encodeURIComponent(msg)}`;
          enlace.target = "_blank";
          enlace.rel = "noopener noreferrer";
          enlace.appendChild(crearIconoWhatsapp());
          const sp = document.createElement("span");
          sp.textContent =
            (estructura && estructura.ctaWhatsapp) || `Enviar WhatsApp a ${datos.nombre}`;
          enlace.appendChild(sp);
          enlace.addEventListener("click", () => {
            registrarEventoAnalitica(pagina.slug, pagina.borradorId, "clicsWhatsapp");
          });
          bloque.appendChild(enlace);

          // Formulario de contacto a WhatsApp
          const formBox = document.createElement("form");
          formBox.className = "biz-contact-form";
          formBox.noValidate = true;
          formBox.setAttribute("onsubmit", "return false;");

          const formTitle = document.createElement("h3");
          formTitle.className = "biz-form-title";
          formTitle.textContent = "Enviar mensaje directo";
          formBox.appendChild(formTitle);

          const campoNombre = document.createElement("div");
          campoNombre.className = "field";
          const lblNombre = document.createElement("label");
          lblNombre.className = "field-label";
          lblNombre.htmlFor = "pub-form-nombre";
          lblNombre.textContent = "Tu nombre";
          const inpNombre = document.createElement("input");
          inpNombre.id = "pub-form-nombre";
          inpNombre.className = "input";
          inpNombre.type = "text";
          inpNombre.placeholder = "Tu nombre";
          campoNombre.appendChild(lblNombre);
          campoNombre.appendChild(inpNombre);

          const campoMsg = document.createElement("div");
          campoMsg.className = "field";
          const lblMsg = document.createElement("label");
          lblMsg.className = "field-label";
          lblMsg.htmlFor = "pub-form-mensaje";
          lblMsg.textContent = "Mensaje";
          const txtMsg = document.createElement("textarea");
          txtMsg.id = "pub-form-mensaje";
          txtMsg.className = "textarea";
          txtMsg.rows = 3;
          txtMsg.placeholder = "Escribe tu consulta";
          campoMsg.appendChild(lblMsg);
          campoMsg.appendChild(txtMsg);

          const btnEnviarForm = document.createElement("button");
          btnEnviarForm.id = "pub-form-enviar";
          btnEnviarForm.type = "button";
          btnEnviarForm.className = "btn btn-secondary btn-full";
          btnEnviarForm.textContent = "Enviar por WhatsApp";

          const estadoForm = document.createElement("p");
          estadoForm.id = "pub-form-estado";
          estadoForm.className = "status-banner";
          estadoForm.setAttribute("role", "status");
          estadoForm.setAttribute("aria-live", "polite");

          const manejarEnvioForm = (ev) => {
            if (ev) {
              ev.preventDefault();
              ev.stopPropagation();
            }
            const nom = inpNombre.value.trim();
            const men = txtMsg.value.trim();
            if (nom.length < 2 || men.length < 3) {
              estadoForm.textContent = "Escribe tu nombre y mensaje.";
              return;
            }
            const textoFinal = `Hola ${datos.nombre}, soy ${nom}. ${men}`;
            const urlWa = `https://wa.me/${numeroWa}?text=${encodeURIComponent(textoFinal)}`;
            registrarEventoAnalitica(pagina.slug, pagina.borradorId, "enviosFormulario");
            estadoForm.textContent = "";
            const enlaceWa = document.createElement("a");
            enlaceWa.href = urlWa;
            enlaceWa.target = "_blank";
            enlaceWa.rel = "noopener noreferrer";
            enlaceWa.className = "inline-action-link";
            enlaceWa.textContent = "Abrir en WhatsApp";
            estadoForm.appendChild(document.createTextNode("Listo: "));
            estadoForm.appendChild(enlaceWa);
          };

          btnEnviarForm.addEventListener("click", manejarEnvioForm);
          formBox.addEventListener("submit", manejarEnvioForm);

          formBox.appendChild(campoNombre);
          formBox.appendChild(campoMsg);
          formBox.appendChild(btnEnviarForm);
          formBox.appendChild(estadoForm);
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
            (estructura && estructura.notaContactoSinWhatsapp) ||
            `Atención directa en ${datos.ciudad}.`;
          cardInfo.appendChild(pLoc);
          cardInfo.appendChild(pDesc);
          bloque.appendChild(cardInfo);
        }

        cuerpo.appendChild(bloque);
      }
    });

    const footerBiz = document.createElement("footer");
    footerBiz.className = "biz-footer";
    footerBiz.textContent = `${datos.nombre} · ${datos.ciudad}`;

    articulo.appendChild(cuerpo);
    articulo.appendChild(footerBiz);
    raiz.appendChild(articulo);

    // Barra inferior de compartir (sin mostrar WhatsApp si el negocio no dio teléfono)
    const urlActual = construirEnlaceCompartible(pagina.slug);
    if (btnCompartir) {
      if (numeroWa) {
        const textoCompartir = `Te comparto la página de ${datos.nombre}: ${urlActual}`;
        btnCompartir.href = `https://wa.me/?text=${encodeURIComponent(textoCompartir)}`;
        btnCompartir.hidden = false;
      } else {
        btnCompartir.hidden = true;
        btnCompartir.removeAttribute("href");
      }
    }

    btnCopiar.onclick = () => {
      copiarTextoSeguro(urlActual).then((ok) => {
        estadoBarra.textContent = ok ? "Enlace copiado." : "No se pudo copiar.";
      });
    };
  }

  function iniciar() {
    const slug = obtenerSlugUrl();
    const paginaInicial = buscarPaginaPublicada(slug);

    if (paginaInicial) {
      renderizarPaginaPublicada(false);
    }

    if (window.dmdAlmacen && typeof window.dmdAlmacen.alHidratar === "function") {
      window.dmdAlmacen.alHidratar(() => renderizarPaginaPublicada(true));
    }

    if (window.dmdAlmacen && typeof window.dmdAlmacen.esperarHidratacion === "function") {
      window.dmdAlmacen.esperarHidratacion().then(() => renderizarPaginaPublicada(true));
    } else {
      renderizarPaginaPublicada(true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
