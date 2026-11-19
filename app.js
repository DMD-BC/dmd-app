"use strict";

/* ==========================================================================
   Configuración principal de dmd (Home y contacto por WhatsApp)
   ========================================================================== */

// Edita esta constante con el número oficial de WhatsApp de dmd
// (solo dígitos con código de país, por ejemplo: "525512345678").
// Déjala vacía ("") mientras no exista un número oficial.
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

function crearIconoWhatsappDmd() {
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

window.dmdConfig = {
  numeroWhatsappDmd: NUMERO_WHATSAPP_DMD,
  limpiarDigitos: limpiarDigitosWhatsapp,
  construirUrlWhatsapp: construirUrlWhatsappDmd,
  crearIconoWhatsapp: crearIconoWhatsappDmd
};

function inicializarContactoDmd() {
  const contenedor = document.getElementById("contacto-whatsapp-dmd");
  if (!contenedor) {
    return;
  }

  contenedor.textContent = "";
  const numeroLimpio = limpiarDigitosWhatsapp(NUMERO_WHATSAPP_DMD);

  if (numeroLimpio) {
    const mensaje = "Hola, quiero preguntar cómo publicar la página de mi negocio con dmd.";
    const enlace = document.createElement("a");
    enlace.id = "btn-whatsapp-dmd";
    enlace.className = "btn btn-primary btn-full";
    enlace.href = construirUrlWhatsappDmd(numeroLimpio, mensaje);
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.appendChild(crearIconoWhatsappDmd());

    const texto = document.createElement("span");
    texto.textContent = "Escribir por WhatsApp a dmd";
    enlace.appendChild(texto);

    contenedor.appendChild(enlace);
    return;
  }

  const botonDesactivado = document.createElement("button");
  botonDesactivado.id = "btn-whatsapp-dmd";
  botonDesactivado.type = "button";
  botonDesactivado.className = "btn btn-full";
  botonDesactivado.disabled = true;
  botonDesactivado.appendChild(crearIconoWhatsappDmd());

  const textoBoton = document.createElement("span");
  textoBoton.textContent = "WhatsApp pendiente de configurar";
  botonDesactivado.appendChild(textoBoton);

  contenedor.appendChild(botonDesactivado);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarContactoDmd);
} else {
  inicializarContactoDmd();
}
