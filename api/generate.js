"use strict";

/* ==========================================================================
   dmd - api/generate.js (función serverless de Vercel)
   Genera el borrador de la página de un negocio con Gemini 3.8 Flash.
   La clave vive SOLO en la variable de entorno GEMINI_API_KEY del servidor.
   Nunca se envía al navegador, nunca se guarda en ningún archivo ni en
   ningún registro. Sin clave configurada, responde 503 y el cliente usa
   el generador local como respaldo.
   ========================================================================== */

const MODELO = "gemini-3.8-flash";
const URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/" + MODELO + ":generateContent";

function textoLimpio(valor, maximo) {
  if (typeof valor !== "string") {
    return "";
  }
  return valor.replace(/\s+/g, " ").trim().slice(0, maximo);
}

function esCadena(valor) {
  return typeof valor === "string" && valor.trim().length > 0;
}

function sanitizarMensajeError(valor, clave) {
  if (typeof valor !== "string") {
    return "";
  }
  let texto = valor;
  if (typeof clave === "string" && clave.length > 0) {
    texto = texto.split(clave).join("[redacted]");
    const claveLimpia = clave.trim();
    if (claveLimpia.length > 0 && claveLimpia !== clave) {
      texto = texto.split(claveLimpia).join("[redacted]");
    }
  }
  texto = texto.replace(/AIza[0-9A-Za-z_-]{10,}/g, "[redacted]");
  return texto.trim().slice(0, 1000);
}

function normalizarBorrador(datos, crudo) {
  if (!crudo || typeof crudo !== "object") {
    return null;
  }
  const titulo = textoLimpio(crudo.titulo, 120);
  const presentacion = textoLimpio(crudo.presentacion, 600);
  if (!titulo || !presentacion) {
    return null;
  }
  const serviciosCrudos = Array.isArray(crudo.servicios) ? crudo.servicios : [];
  const servicios = serviciosCrudos
    .slice(0, 6)
    .map((s) => {
      if (typeof s === "string") {
        return { titulo: textoLimpio(s, 80), descripcion: "" };
      }
      if (s && typeof s === "object") {
        return {
          titulo: textoLimpio(s.titulo, 80),
          descripcion: textoLimpio(s.descripcion, 200)
        };
      }
      return null;
    })
    .filter((s) => s && s.titulo);
  const beneficios = (Array.isArray(crudo.beneficios) ? crudo.beneficios : [])
    .filter(esCadena)
    .slice(0, 6)
    .map((b) => textoLimpio(b, 200));
  const preguntasFrecuentes = (Array.isArray(crudo.preguntasFrecuentes) ? crudo.preguntasFrecuentes : [])
    .slice(0, 6)
    .map((f) => {
      if (!f || typeof f !== "object") {
        return null;
      }
      const pregunta = textoLimpio(f.pregunta, 200);
      const respuesta = textoLimpio(f.respuesta, 400);
      return pregunta && respuesta ? { pregunta, respuesta } : null;
    })
    .filter(Boolean);
  if (servicios.length === 0 || beneficios.length === 0 || preguntasFrecuentes.length === 0) {
    return null;
  }
  return {
    titulo,
    presentacion,
    servicios,
    beneficios,
    preguntasFrecuentes,
    variante: Number.isFinite(Number(datos.variante)) ? Math.abs(Number(datos.variante)) : 0
  };
}

function construirPrompt(datos) {
  const giroEtiqueta = datos.giro || "negocio";
  return [
    "Eres quien redacta la página web de un negocio local en México.",
    "Escribe en español natural de México, frases cortas y directas, sin guiones largos.",
    "Usa SOLO los datos del negocio que te doy. No inventes precios, servicios, horarios, direcciones ni datos de contacto.",
    "Si un dato viene vacío, no lo menciones.",
    "Devuelve SOLO un objeto JSON, sin texto fuera del JSON, con exactamente estas claves:",
    "titulo (texto corto), presentacion (2 o 3 frases), servicios (arreglo de 3 a 5 objetos con titulo y descripcion corta),",
    "beneficios (arreglo de 3 o 4 frases cortas), preguntasFrecuentes (arreglo de 3 o 4 objetos con pregunta y respuesta).",
    "",
    "Datos del negocio:",
    "Nombre: " + datos.nombre,
    "Giro: " + giroEtiqueta,
    "Ciudad: " + datos.ciudad,
    "Qué ofrece: " + datos.oferta,
    "Tono: " + datos.tono,
    "WhatsApp: " + (datos.whatsapp || "no proporcionado")
  ].join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const clave = process.env.GEMINI_API_KEY;
  if (!clave) {
    return res.status(503).json({ error: "not_configured" });
  }

  let cuerpo = req.body;
  if (typeof cuerpo === "string") {
    try {
      cuerpo = JSON.parse(cuerpo);
    } catch (e) {
      return res.status(400).json({ error: "invalid_body" });
    }
  }
  if (!cuerpo || typeof cuerpo !== "object") {
    return res.status(400).json({ error: "invalid_body" });
  }

  const datos = {
    nombre: textoLimpio(cuerpo.nombre, 80),
    giro: textoLimpio(cuerpo.giro, 40),
    ciudad: textoLimpio(cuerpo.ciudad, 80),
    oferta: textoLimpio(cuerpo.oferta, 500),
    tono: ["cercano", "profesional", "formal"].includes(cuerpo.tono) ? cuerpo.tono : "cercano",
    whatsapp: String(cuerpo.whatsapp || "").replace(/\D/g, "").slice(0, 15),
    variante: Number(cuerpo.variante) || 0
  };
  if (!datos.nombre || !datos.ciudad || !datos.oferta) {
    return res.status(400).json({ error: "missing_fields" });
  }

  let respuestaGemini;
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 20000);
    try {
      respuestaGemini = await fetch(URL_GEMINI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": clave
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: construirPrompt(datos) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 1200
          }
        }),
        signal: controlador.signal
      });
    } finally {
      clearTimeout(temporizador);
    }
  } catch (e) {
    const detalleRed =
      (e && e.name === "AbortError" ? "Timeout after 20000ms" : "") ||
      (e && e.cause && e.cause.message) ||
      (e && e.message) ||
      "network_error";
    return res.status(502).json({
      error: "provider_unavailable",
      provider_status: null,
      provider_message: sanitizarMensajeError(detalleRed, clave)
    });
  }

  if (!respuestaGemini.ok) {
    let cuerpoError = "";
    try {
      cuerpoError = await respuestaGemini.text();
    } catch (e) {
      cuerpoError = "";
    }
    let errorGoogle = null;
    if (cuerpoError) {
      try {
        const parsed = JSON.parse(cuerpoError);
        if (parsed && typeof parsed === "object") {
          if (parsed.error && typeof parsed.error === "object") {
            errorGoogle = parsed.error;
          } else if (Array.isArray(parsed) && parsed[0] && parsed[0].error && typeof parsed[0].error === "object") {
            errorGoogle = parsed[0].error;
          }
        }
      } catch (e) {
        errorGoogle = null;
      }
    }
    const mensajeCrudo =
      (errorGoogle && (errorGoogle.message || errorGoogle.status)) ||
      cuerpoError ||
      respuestaGemini.statusText ||
      "provider_error";
    const respuestaError = {
      error: "provider_error",
      provider_status: respuestaGemini.status,
      provider_message: sanitizarMensajeError(mensajeCrudo, clave)
    };
    if (errorGoogle && typeof errorGoogle.status === "string" && errorGoogle.status.trim()) {
      respuestaError.provider_error_status = sanitizarMensajeError(errorGoogle.status, clave);
    }
    return res.status(502).json(respuestaError);
  }

  let payload;
  try {
    payload = await respuestaGemini.json();
  } catch (e) {
    return res.status(502).json({
      error: "provider_error",
      provider_status: respuestaGemini.status,
      provider_message: sanitizarMensajeError(e && e.message, clave) || "invalid_provider_json"
    });
  }

  let texto = "";
  try {
    texto = payload.candidates[0].content.parts.map((p) => p.text || "").join("");
  } catch (e) {
    const detallePayload =
      (payload && payload.error && (payload.error.message || payload.error.status)) ||
      (payload && payload.promptFeedback && payload.promptFeedback.blockReason) ||
      (e && e.message) ||
      "missing_candidates";
    return res.status(502).json({
      error: "provider_error",
      provider_status: respuestaGemini.status,
      provider_message: sanitizarMensajeError(detallePayload, clave)
    });
  }
  texto = texto.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  let crudo;
  try {
    crudo = JSON.parse(texto);
  } catch (e) {
    return res.status(502).json({ error: "invalid_response" });
  }

  const borrador = normalizarBorrador(datos, crudo);
  if (!borrador) {
    return res.status(502).json({ error: "invalid_response" });
  }
  return res.status(200).json({ borrador });
};
