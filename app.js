"use strict";

/* ==========================================================================
   Configuración principal de dmd (Home y demostración interactiva)
   ========================================================================== */

const NUMERO_WHATSAPP_DMD = "";

const DEMOS_PLANTILLAS_HOME = {
  clasica: {
    nombre: "Café de Barrio",
    ciudad: "Puebla",
    foto: "img/ejemplo-cafeteria.jpg",
    alt: "Preparación de café de filtro en barra de Café de Barrio",
    titulo: "Café de grano tostado en Puebla",
    intro: "Preparamos espresso, filtrado y pan salado desde las 7:30. Si pasas con prisa, aparta tu vaso antes de llegar.",
    seccion: "En barra",
    servicios: [
      { titulo: "Americano y capuchino", desc: "Grano de Veracruz molido al momento." },
      { titulo: "Panini de jamón serrano", desc: "Caliente al comal para llevar o comer aquí." }
    ],
    cta: "Pedir para recoger"
  },
  editorial: {
    nombre: "Ferretería El Tornillo",
    ciudad: "Monterrey",
    foto: "img/ejemplo-ferreteria.jpg",
    alt: "Herramientas manuales de ejemplo para plantilla Editorial",
    titulo: "Herramienta, plomería y material eléctrico",
    intro: "Surtido para reparaciones de casa y obra chica. Pregunta si tenemos la pieza antes de venir.",
    seccion: "Departamentos",
    servicios: [
      { titulo: "Plomería y tubería", desc: "Codos, llaves de paso, empaques y selladores." },
      { titulo: "Taladros y llaves", desc: "Dados, pinzas, brocas y tornillería por pieza." }
    ],
    cta: "Consultar existencia"
  },
  directa: {
    nombre: "Taquería El Fogón",
    ciudad: "Querétaro",
    foto: "img/ejemplo-taqueria.jpg",
    alt: "Tacos tradicionales con rábanos y salsa de ejemplo para plantilla Directa",
    titulo: "Asada, pastor y gringas al carbón",
    intro: "Abrimos de martes a domingo de 6 de la tarde a medianoche. Pedidos para recoger sin hacer fila.",
    seccion: "De la parrilla",
    servicios: [
      { titulo: "Orden de pastor", desc: "Cinco tacos con piña, cebolla asada y salsa de árbol." },
      { titulo: "Gringas y volcanes", desc: "En tortilla de harina o tostada dorada al carbón." }
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

  const aplicarPlantillaDemo = (plantilla) => {
    const elegida = DEMOS_PLANTILLAS_HOME[plantilla] ? plantilla : "clasica";
    const info = DEMOS_PLANTILLAS_HOME[elegida];

    demoPage.classList.remove("biz-template-clasica", "biz-template-editorial", "biz-template-directa");
    demoPage.classList.add(`biz-template-${elegida}`);

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

    tabs.forEach((btn) => {
      const activo = btn.dataset.demoTpl === elegida;
      btn.classList.toggle("is-active", activo);
      btn.setAttribute("aria-selected", activo ? "true" : "false");
    });
  };

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      aplicarPlantillaDemo(btn.dataset.demoTpl);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarDemoPlantillasHome);
} else {
  inicializarDemoPlantillasHome();
}
