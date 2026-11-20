"use strict";

/* ==========================================================================
   Configuración principal de dmd (Home y demostración interactiva)
   ========================================================================== */

const NUMERO_WHATSAPP_DMD = "";

const DEMOS_PLANTILLAS_HOME = {
  clasica: {
    giro: "cafeteria",
    sticker: "Grano al día",
    forma: "ticket",
    pos: "tr",
    tono: "claro",
    nombre: "Café de Barrio",
    ciudad: "Puebla",
    foto: "img/ejemplo-cafeteria.jpg",
    alt: "Preparación de café de filtro en barra de Café de Barrio",
    titulo: "Café de grano tostado en Puebla",
    intro: "Barra abierta desde las 7:30 con espresso, filtrado y pan salado. Si vas tarde, aparta tu vaso antes de llegar.",
    seccion: "En barra",
    servicios: [
      { titulo: "Americano y capuchino", desc: "Grano de Veracruz, molido al momento." },
      { titulo: "Panini de jamón serrano", desc: "Al comal en cinco minutos, para comer en barra o llevar." }
    ],
    cta: "Pedir para recoger"
  },
  editorial: {
    giro: "ferreteria",
    sticker: "Pieza y mayoreo",
    forma: "tag",
    pos: "bl",
    tono: "verde",
    nombre: "Ferretería El Tornillo",
    ciudad: "Monterrey",
    foto: "img/ejemplo-ferreteria.jpg",
    alt: "Herramientas manuales de ejemplo para plantilla Editorial",
    titulo: "Herramienta, plomería y material eléctrico",
    intro: "Para reparaciones de casa o lista de obra chica. Pregunta existencia antes de dar la vuelta.",
    seccion: "Departamentos",
    servicios: [
      { titulo: "Plomería y tubería", desc: "Codos, empaques, llaves de paso y sellador." },
      { titulo: "Taladros y llaves", desc: "Brocas, dados y tornillería desde una pieza suelta." }
    ],
    cta: "Consultar existencia"
  },
  directa: {
    giro: "taqueria",
    sticker: "Al carbón",
    forma: "ribbon",
    pos: "br",
    tono: "verde",
    nombre: "Taquería El Fogón",
    ciudad: "Querétaro",
    foto: "img/ejemplo-taqueria.jpg",
    alt: "Tacos tradicionales con rábanos y salsa de ejemplo para plantilla Directa",
    titulo: "Asada, pastor y gringas al carbón",
    intro: "Martes a domingo de 6 de la tarde a medianoche. Aparta tu orden y pásala a recoger sin fila.",
    seccion: "De la parrilla",
    servicios: [
      { titulo: "Orden de pastor", desc: "Cinco tacos con piña y salsa de árbol." },
      { titulo: "Gringas y volcanes", desc: "Queso fundido al carbón en tortilla de harina o tostada." }
    ],
    cta: "Hacer pedido ahora"
  }
};

function limpiarDigitosWhatsapp(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function construirUrlWhatsappDmd(numeroDigitos, mensaje) {
  const limpio = limpiarDigitosWhatsapp(numeroDigitos);
  if (!limpio) {
    return "";
  }
  return `https://wa.me/${limpio}?text=${encodeURIComponent(mensaje)}`;
}

window.dmdConfig = {
  numeroWhatsappDmd: NUMERO_WHATSAPP_DMD,
  limpiarDigitos: limpiarDigitosWhatsapp,
  construirUrlWhatsapp: construirUrlWhatsappDmd
};

function inicializarDemoPlantillasHome() {
  const demoPage = document.getElementById("hero-demo-page");
  const tabs = Array.from(document.querySelectorAll("[data-demo-tpl]"));
  if (!demoPage || tabs.length === 0) {
    return;
  }

  const elNombre = demoPage.querySelector("[data-demo-field='nombre']");
  const elCiudad = demoPage.querySelector("[data-demo-field='ciudad']");
  const elFoto = demoPage.querySelector("[data-demo-field='foto']");
  const elTitulo = demoPage.querySelector("[data-demo-field='titulo']");
  const elIntro = demoPage.querySelector("[data-demo-field='intro']");
  const elSeccion = demoPage.querySelector("[data-demo-field='seccion']");
  const elS1Tit = demoPage.querySelector("[data-demo-field='s1-titulo']");
  const elS1Desc = demoPage.querySelector("[data-demo-field='s1-desc']");
  const elS2Tit = demoPage.querySelector("[data-demo-field='s2-titulo']");
  const elS2Desc = demoPage.querySelector("[data-demo-field='s2-desc']");
  const elCta = demoPage.querySelector("[data-demo-field='cta']");
  const elSticker = demoPage.querySelector("[data-demo-field='sticker']");
  const stickerWrap = document.getElementById("hero-demo-sticker");

  const aplicarPlantillaDemo = (plantilla) => {
    const elegida = DEMOS_PLANTILLAS_HOME[plantilla] ? plantilla : "clasica";
    const info = DEMOS_PLANTILLAS_HOME[elegida];

    demoPage.classList.remove(
      "biz-template-clasica",
      "biz-template-editorial",
      "biz-template-directa",
      "biz-giro-cafeteria",
      "biz-giro-ferreteria",
      "biz-giro-taqueria",
      "is-switching"
    );
    void demoPage.offsetWidth;
    demoPage.classList.add(`biz-template-${elegida}`, `biz-giro-${info.giro}`, "is-switching");

    if (elNombre) elNombre.textContent = info.nombre;
    if (elCiudad) elCiudad.textContent = info.ciudad;
    if (elFoto) {
      elFoto.setAttribute("src", info.foto);
      elFoto.setAttribute("alt", info.alt);
    }
    if (elTitulo) elTitulo.textContent = info.titulo;
    if (elIntro) elIntro.textContent = info.intro;
    if (elSeccion) elSeccion.textContent = info.seccion;
    if (elS1Tit) elS1Tit.textContent = info.servicios[0].titulo;
    if (elS1Desc) elS1Desc.textContent = info.servicios[0].desc;
    if (elS2Tit) elS2Tit.textContent = info.servicios[1].titulo;
    if (elS2Desc) elS2Desc.textContent = info.servicios[1].desc;
    if (elCta) elCta.textContent = info.cta;
    if (elSticker) elSticker.textContent = info.sticker;
    if (stickerWrap) {
      stickerWrap.className = `biz-sticker biz-sticker-${info.giro} sticker-diecut sticker-pos-${info.pos} sticker-var-${info.forma}`;
      const cutout = stickerWrap.querySelector(".sticker-cutout");
      if (cutout) {
        cutout.className = `sticker-cutout sticker-shape-${info.forma} sticker-tone-${info.tono}`;
      }
    }

    tabs.forEach((btn) => {
      const activo = btn.dataset.demoTpl === elegida;
      btn.classList.toggle("is-active", activo);
      btn.setAttribute("aria-selected", activo ? "true" : "false");
    });
  };

  Object.keys(DEMOS_PLANTILLAS_HOME).forEach((clave) => {
    const imgPrecarga = new Image();
    imgPrecarga.src = DEMOS_PLANTILLAS_HOME[clave].foto;
  });

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      aplicarPlantillaDemo(btn.dataset.demoTpl);
    });
  });

  // Brillo sutil siguiendo el puntero en escritorio (desactivado si el usuario prefiere menos movimiento)
  const stage = document.getElementById("hero-showcase-stage");
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (stage && !reduceMotion) {
    stage.addEventListener("pointermove", (ev) => {
      const rect = stage.getBoundingClientRect();
      stage.style.setProperty("--spot-x", `${Math.round(ev.clientX - rect.left)}px`);
      stage.style.setProperty("--spot-y", `${Math.round(ev.clientY - rect.top)}px`);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarDemoPlantillasHome);
} else {
  inicializarDemoPlantillasHome();
}
