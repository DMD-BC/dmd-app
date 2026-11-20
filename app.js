"use strict";

/* ==========================================================================
   Configuración principal de dmd (Home y demostración de plantillas)
   ========================================================================== */

const NUMERO_WHATSAPP_DMD = "";

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

  const aplicarPlantillaDemo = (plantilla) => {
    const validas = ["clasica", "editorial", "directa"];
    const elegida = validas.includes(plantilla) ? plantilla : "clasica";
    demoPage.classList.remove("biz-template-clasica", "biz-template-editorial", "biz-template-directa");
    demoPage.classList.add(`biz-template-${elegida}`);

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
