"use strict";

/* ==========================================================================
   dmd - api/chat.js (función serverless de Vercel)
   Razonamiento conversacional en dos fases con Gemini 3.8 Flash:
   1) Decisión corta (pocos tokens, timeout acotado): clasifica intención,
      extrae datos reales y decide preguntar, responder, generar, actualizar
      o dar por completo.
   2) Generación de borrador (presupuesto completo de tokens): solo corre
      cuando la fase 1 decide generar o actualizar el borrador.
   La clave vive SOLO en GEMINI_API_KEY en el servidor.
   ========================================================================== */

const generateHandler = require("./generate");
const {
  MODELO,
  MAX_OUTPUT_TOKENS,
  PERFILES_DISENO_GIRO,
  detectarPerfilGiro,
  construirPrompt,
  extraerTextoRespuestaGemini,
  extraerJsonSeguro,
  normalizarBorrador
} = generateHandler._test;

const URL_GEMINI =
  "https://generativelanguage.googleapis.com/v1beta/models/" + MODELO + ":generateContent";
const TIMEOUT_TOTAL_MS = 45000;
const TIMEOUT_DECISION_MS = 15000;
const TIMEOUT_BORRADOR_MAX_MS = 22000;
const MAX_TOKENS_DECISION = 420;

const ACCIONES_VALIDAS = new Set(["preguntar", "generar", "actualizar", "responder", "completo"]);
const INTENCIONES_VALIDAS = new Set([
  "datos",
  "pregunta",
  "cambiar",
  "agregar",
  "quitar",
  "saludo",
  "ambiguo",
  "completo"
]);
const CAMPOS_QUITAR_VALIDOS = new Set(["whatsapp", "horario", "direccion"]);
const CAMPOS_OMITIR_VALIDOS = new Set(["direccion", "horario", "whatsapp", "tono"]);
const PLANTILLAS_VALIDAS = new Set(["clasica", "editorial", "directa"]);
const TONOS_VALIDOS = new Set(["cercano", "profesional", "formal"]);

function quitarGuionesLargos(valor) {
  if (typeof valor !== "string") {
    return "";
  }
  return valor
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function textoLimpio(valor, maximo) {
  if (typeof valor !== "string") {
    return "";
  }
  return quitarGuionesLargos(valor).slice(0, maximo).trim();
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

function limpiarRespuestaNatural(texto) {
  let limpio = textoLimpio(texto, 420);
  limpio = limpio
    .replace(
      /^(?:¡?(?:excelente|perfecto|genial|maravilloso|fant[aá]stico|por\s+supuesto|claro\s+que\s+s[ií]|con\s+mucho\s+gusto)!?[\s,.:]+)+/i,
      ""
    )
    .trim();
  if (limpio && /^[a-záéíóúñü]/.test(limpio)) {
    limpio = limpio.charAt(0).toUpperCase() + limpio.slice(1);
  }
  return limpio;
}

function normalizarDatosEntrada(crudo) {
  const src = crudo && typeof crudo === "object" ? crudo : {};
  const waDigitos = String(src.whatsapp || "").replace(/\D/g, "").slice(0, 15);
  const tonoCrudo = String(src.tono || "").trim().toLowerCase();
  return {
    nombre: textoLimpio(src.nombre || "", 80),
    giro: textoLimpio(src.giro || "", 60),
    giroTexto: textoLimpio(src.giroTexto || src.giro || "", 60),
    ciudad: textoLimpio(src.ciudad || "", 80),
    direccion: textoLimpio(src.direccion || "", 140),
    horario: textoLimpio(src.horario || "", 140),
    oferta: textoLimpio(src.oferta || "", 500),
    tono: TONOS_VALIDOS.has(tonoCrudo) ? tonoCrudo : "",
    whatsapp: waDigitos.length >= 10 ? waDigitos : ""
  };
}

function normalizarMensajesEntrada(lista) {
  if (!Array.isArray(lista)) {
    return [];
  }
  return lista
    .filter((m) => m && typeof m === "object" && typeof m.texto === "string")
    .map((m) => ({
      rol: m.rol === "usuario" ? "usuario" : "asistente",
      texto: textoLimpio(m.texto, 320)
    }))
    .filter((m) => m.texto.length > 0)
    .slice(-8);
}

function normalizarCamposLista(lista, permitidos) {
  if (!Array.isArray(lista)) {
    return [];
  }
  const vistos = new Set();
  const salida = [];
  for (const item of lista) {
    const val = String(item || "").trim().toLowerCase();
    if (permitidos.has(val) && !vistos.has(val)) {
      vistos.add(val);
      salida.push(val);
    }
  }
  return salida;
}

function construirPromptDecision({
  mensajes,
  datos,
  camposOmitidos,
  tieneBorrador,
  estadoEditor
}) {
  const editorInfo = estadoEditor && typeof estadoEditor === "object" ? estadoEditor : {};
  const datosCompactos = [
    "nombre=" + (datos.nombre || ""),
    "giro=" + (datos.giroTexto || datos.giro || ""),
    "ciudad=" + (datos.ciudad || ""),
    "oferta=" + (datos.oferta || ""),
    "direccion=" + (datos.direccion || ""),
    "horario=" + (datos.horario || ""),
    "whatsapp=" + (datos.whatsapp || ""),
    "tono=" + (datos.tono || "cercano")
  ].join(";");

  const estadoCompacto = [
    "borrador=" + (tieneBorrador ? "si" : "no"),
    "logo=" + (editorInfo.tieneLogo ? "si" : "no"),
    "plantilla=" + (textoLimpio(editorInfo.plantilla || "clasica", 20) || "clasica"),
    "omitidos=" + (camposOmitidos.length > 0 ? camposOmitidos.join(",") : "")
  ].join(";");

  const historial = mensajes
    .slice(-6)
    .map((m) => (m.rol === "usuario" ? "U: " : "A: ") + m.texto)
    .join("\n");

  return [
    "Asistente DMD (México). Español natural y corto. Una pregunta a la vez. Sin guiones largos, sin clichés de IA, sin inventar precios/datos.",
    "Intención del último mensaje (tolera errores): datos|pregunta|cambiar|agregar|quitar|saludo|ambiguo|completo.",
    "pregunta/saludo/ambiguo => accion='responder', datosExtraidos={}. No pegues preguntas o texto confuso en oferta.",
    "Mínimos: nombre, ciudad, oferta (deduce giro si es obvio). Opcionales: direccion, horario, whatsapp, tono.",
    "Falta mínimo => accion='preguntar' (1 pregunta corta). Ya están los 3 mínimos y borrador=no => accion='generar' (o 1 pregunta opcional con chip 'Armar borrador ya').",
    "borrador=si y cambian datos => accion='actualizar'. Solo plantilla/portada/logo => accion='responder' con ajusteDiseno. Si terminó => accion='completo'.",
    "Datos: " + datosCompactos,
    "Estado: " + estadoCompacto,
    "Chat:\n" + historial,
    'Solo JSON: {"accion":"","intencion":"","respuesta":"","datosExtraidos":{"nombre":"","giro":"","giroTexto":"","ciudad":"","direccion":"","horario":"","oferta":"","tono":"","whatsapp":""},"camposQuitar":[],"camposOmitidos":[],"ajusteDiseno":{"plantilla":"","quitarLogo":false,"quitarPortada":false,"cambiarPortada":false},"sugerencias":[]}'
  ].join("\n");
}

function preguntaFaltanteMinima(datos) {
  if (!datos.nombre) {
    return "¿Cómo se llama tu negocio?";
  }
  if (!datos.ciudad) {
    return "¿En qué ciudad está " + datos.nombre + "?";
  }
  if (!datos.oferta) {
    return "¿Qué productos o servicios ofreces en " + datos.nombre + "?";
  }
  return "¿Quieres agregar tu horario, calle o WhatsApp, o armamos el borrador así?";
}

function normalizarDecisionChat(entrada, crudo) {
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) {
    return null;
  }

  let accion = String(crudo.accion || "").trim().toLowerCase();
  if (!ACCIONES_VALIDAS.has(accion)) {
    accion = "responder";
  }

  let intencion = String(crudo.intencion || "").trim().toLowerCase();
  if (!INTENCIONES_VALIDAS.has(intencion)) {
    intencion = accion === "preguntar" || accion === "generar" ? "datos" : "ambiguo";
  }

  const esSoloLectura =
    intencion === "pregunta" || intencion === "saludo" || intencion === "ambiguo";

  const datosPrevios = normalizarDatosEntrada(entrada.datos);
  const camposOmitidosPrevios = normalizarCamposLista(
    entrada.camposOmitidos,
    CAMPOS_OMITIR_VALIDOS
  );

  const camposQuitar = esSoloLectura
    ? []
    : normalizarCamposLista(crudo.camposQuitar, CAMPOS_QUITAR_VALIDOS);
  const camposOmitidosNuevos = esSoloLectura
    ? []
    : normalizarCamposLista(crudo.camposOmitidos, CAMPOS_OMITIR_VALIDOS);
  const camposOmitidos = Array.from(new Set(camposOmitidosPrevios.concat(camposOmitidosNuevos)));

  const extraidosCrudos =
    !esSoloLectura && crudo.datosExtraidos && typeof crudo.datosExtraidos === "object"
      ? crudo.datosExtraidos
      : {};

  const datosActualizados = Object.assign({}, datosPrevios);

  const aplicarCampoTexto = (campo, maxLen) => {
    const val = textoLimpio(extraidosCrudos[campo] || "", maxLen);
    if (val) {
      datosActualizados[campo] = val;
    }
  };

  aplicarCampoTexto("nombre", 80);
  aplicarCampoTexto("giro", 60);
  aplicarCampoTexto("giroTexto", 60);
  aplicarCampoTexto("ciudad", 80);
  aplicarCampoTexto("direccion", 140);
  aplicarCampoTexto("horario", 140);
  aplicarCampoTexto("oferta", 500);

  const tonoNuevo = String(extraidosCrudos.tono || "").trim().toLowerCase();
  if (TONOS_VALIDOS.has(tonoNuevo)) {
    datosActualizados.tono = tonoNuevo;
  }

  const waNuevo = String(extraidosCrudos.whatsapp || "").replace(/\D/g, "").slice(0, 15);
  if (waNuevo.length >= 10) {
    datosActualizados.whatsapp = waNuevo;
  }

  for (const campo of camposQuitar) {
    datosActualizados[campo] = "";
  }

  if (!datosActualizados.giro) {
    const detectado = detectarPerfilGiro(datosActualizados);
    if (detectado && detectado !== "otro") {
      datosActualizados.giro = detectado;
      if (!datosActualizados.giroTexto && PERFILES_DISENO_GIRO[detectado]) {
        datosActualizados.giroTexto = PERFILES_DISENO_GIRO[detectado].etiqueta;
      }
    }
  }
  if (!datosActualizados.giroTexto && datosActualizados.giro) {
    datosActualizados.giroTexto = datosActualizados.giro;
  }

  const ajusteCrudo =
    !esSoloLectura && crudo.ajusteDiseno && typeof crudo.ajusteDiseno === "object"
      ? crudo.ajusteDiseno
      : {};
  const plantillaNorm = String(ajusteCrudo.plantilla || "").trim().toLowerCase();
  const ajusteDiseno = {
    plantilla: PLANTILLAS_VALIDAS.has(plantillaNorm) ? plantillaNorm : "",
    quitarLogo: Boolean(ajusteCrudo.quitarLogo),
    quitarPortada: Boolean(ajusteCrudo.quitarPortada),
    cambiarPortada: Boolean(ajusteCrudo.cambiarPortada)
  };

  const sugerencias = (Array.isArray(crudo.sugerencias) ? crudo.sugerencias : [])
    .map((s) => textoLimpio(String(s || ""), 36))
    .filter((s) => s.length >= 2)
    .slice(0, 3);

  let respuesta = limpiarRespuestaNatural(crudo.respuesta || "");
  let borrador = null;

  if (esSoloLectura) {
    accion = "responder";
  }

  const tieneMinimos = Boolean(
    datosActualizados.nombre && datosActualizados.ciudad && datosActualizados.oferta
  );

  if (accion === "generar" || accion === "actualizar") {
    if (!tieneMinimos) {
      accion = "preguntar";
      respuesta = respuesta || preguntaFaltanteMinima(datosActualizados);
    } else if (crudo.borrador && typeof crudo.borrador === "object") {
      const datosParaBorrador = Object.assign({}, datosActualizados, {
        tono: datosActualizados.tono || "cercano",
        variante: Number(entrada.variante) || 0
      });
      borrador = normalizarBorrador(datosParaBorrador, crudo.borrador);
    }
  } else if (accion === "completo" && !entrada.tieneBorrador && tieneMinimos) {
    accion = "generar";
  }

  if (!respuesta) {
    if (accion === "preguntar") {
      respuesta = preguntaFaltanteMinima(datosActualizados);
    } else if (accion === "generar") {
      respuesta =
        "Listo, armé el borrador de " +
        datosActualizados.nombre +
        ". Dime si quieres ajustar algo o abrir el Editor visual.";
    } else if (accion === "actualizar") {
      respuesta = "Listo, actualicé el borrador con ese cambio.";
    } else if (accion === "completo") {
      respuesta =
        "Tu borrador quedó listo. Puedes editar cualquier detalle o publicarlo cuando gustes.";
    } else {
      respuesta = "Cuéntame qué necesitas ajustar en tu página.";
    }
  }

  return {
    accion,
    intencion,
    respuesta,
    datosActualizados,
    camposQuitar,
    camposOmitidos,
    ajusteDiseno,
    sugerencias,
    borrador
  };
}

async function invocarGeminiJson({ clave, prompt, maxOutputTokens, temperature, timeoutMs }) {
  const t0 = Date.now();
  let respuestaGemini;
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      respuestaGemini = await fetch(URL_GEMINI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": clave
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature,
            maxOutputTokens,
            thinkingConfig: {
              thinkingLevel: "low"
            }
          }
        }),
        signal: controlador.signal
      });
    } finally {
      clearTimeout(temporizador);
    }
  } catch (e) {
    const elapsedMs = Date.now() - t0;
    const detalleRed =
      (e && e.name === "AbortError" ? "Timeout after " + timeoutMs + "ms" : "") ||
      (e && e.cause && e.cause.message) ||
      (e && e.message) ||
      "network_error";
    return {
      ok: false,
      httpStatus: 502,
      error: "provider_unavailable",
      providerStatus: null,
      providerMessage: sanitizarMensajeError(detalleRed, clave),
      elapsedMs
    };
  }

  if (!respuestaGemini.ok) {
    const elapsedMs = Date.now() - t0;
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
          } else if (
            Array.isArray(parsed) &&
            parsed[0] &&
            parsed[0].error &&
            typeof parsed[0].error === "object"
          ) {
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
    const esCuota = respuestaGemini.status === 429;
    return {
      ok: false,
      httpStatus: esCuota ? 429 : 502,
      error: esCuota ? "quota_exceeded" : "provider_error",
      providerStatus: respuestaGemini.status,
      providerMessage: sanitizarMensajeError(mensajeCrudo, clave),
      elapsedMs
    };
  }

  let payload;
  try {
    payload = await respuestaGemini.json();
  } catch (e) {
    return {
      ok: false,
      httpStatus: 502,
      error: "provider_error",
      providerStatus: respuestaGemini.status,
      providerMessage: sanitizarMensajeError(e && e.message, clave) || "invalid_provider_json",
      elapsedMs: Date.now() - t0
    };
  }

  const texto = extraerTextoRespuestaGemini(payload);
  if (!texto) {
    const detallePayload =
      (payload && payload.error && (payload.error.message || payload.error.status)) ||
      (payload && payload.promptFeedback && payload.promptFeedback.blockReason) ||
      "missing_candidates";
    return {
      ok: false,
      httpStatus: 502,
      error: "provider_error",
      providerStatus: respuestaGemini.status,
      providerMessage: sanitizarMensajeError(detallePayload, clave),
      elapsedMs: Date.now() - t0
    };
  }

  const crudo = extraerJsonSeguro(texto);
  if (!crudo) {
    return {
      ok: false,
      httpStatus: 502,
      error: "invalid_response",
      providerStatus: respuestaGemini.status,
      providerMessage: "invalid_json",
      elapsedMs: Date.now() - t0
    };
  }

  return {
    ok: true,
    crudo,
    elapsedMs: Date.now() - t0
  };
}

function fijarHeaderTiming(res, decisionMs, borradorMs, totalMs) {
  if (res && typeof res.setHeader === "function") {
    res.setHeader(
      "Server-Timing",
      `decision;dur=${decisionMs}, borrador;dur=${borradorMs}, total;dur=${totalMs}`
    );
  }
}

async function handler(req, res) {
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

  const mensajes = normalizarMensajesEntrada(cuerpo.mensajes);
  const tieneMensajeUsuario = mensajes.some((m) => m.rol === "usuario");
  if (!tieneMensajeUsuario) {
    return res.status(400).json({ error: "missing_message" });
  }

  const entrada = {
    mensajes,
    datos: normalizarDatosEntrada(cuerpo.datos),
    camposOmitidos: normalizarCamposLista(cuerpo.camposOmitidos, CAMPOS_OMITIR_VALIDOS),
    tieneBorrador: Boolean(cuerpo.tieneBorrador),
    variante: Number(cuerpo.variante) || 0,
    estadoEditor:
      cuerpo.estadoEditor && typeof cuerpo.estadoEditor === "object" ? cuerpo.estadoEditor : {}
  };

  const tInicio = Date.now();

  // Fase 1: razonamiento corto con pocos tokens para decidir la acción
  const resDecision = await invocarGeminiJson({
    clave,
    prompt: construirPromptDecision(entrada),
    maxOutputTokens: MAX_TOKENS_DECISION,
    temperature: 0.3,
    timeoutMs: TIMEOUT_DECISION_MS
  });

  const decisionMs = resDecision.elapsedMs || Date.now() - tInicio;

  if (!resDecision.ok) {
    const totalMs = Date.now() - tInicio;
    fijarHeaderTiming(res, decisionMs, 0, totalMs);
    return res.status(resDecision.httpStatus).json({
      error: resDecision.error,
      provider_status: resDecision.providerStatus,
      provider_message: resDecision.providerMessage,
      timing: { decision_ms: decisionMs, borrador_ms: 0, total_ms: totalMs }
    });
  }

  const resultado = normalizarDecisionChat(entrada, resDecision.crudo);
  if (!resultado) {
    const totalMs = Date.now() - tInicio;
    fijarHeaderTiming(res, decisionMs, 0, totalMs);
    return res.status(502).json({
      error: "invalid_response",
      timing: { decision_ms: decisionMs, borrador_ms: 0, total_ms: totalMs }
    });
  }

  // Fase 2: solo si la acción es generar o actualizar el borrador (presupuesto completo dentro del límite total de 45s)
  let borradorMs = 0;
  if (
    (resultado.accion === "generar" || resultado.accion === "actualizar") &&
    !resultado.borrador
  ) {
    const restanteMs = TIMEOUT_TOTAL_MS - (Date.now() - tInicio);
    const timeoutBorrador = Math.min(TIMEOUT_BORRADOR_MAX_MS, restanteMs);
    if (timeoutBorrador >= 4000) {
      const datosParaBorrador = Object.assign({}, resultado.datosActualizados, {
        tono: resultado.datosActualizados.tono || "cercano",
        variante: entrada.variante || 0
      });
      const resBorrador = await invocarGeminiJson({
        clave,
        prompt: construirPrompt(datosParaBorrador),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.7,
        timeoutMs: timeoutBorrador
      });
      borradorMs = resBorrador.elapsedMs || 0;
      if (resBorrador.ok) {
        resultado.borrador = normalizarBorrador(datosParaBorrador, resBorrador.crudo);
      }
    }
  }

  const totalMs = Date.now() - tInicio;
  fijarHeaderTiming(res, decisionMs, borradorMs, totalMs);
  resultado.timing = {
    decision_ms: decisionMs,
    borrador_ms: borradorMs,
    total_ms: totalMs
  };
  return res.status(200).json(resultado);
}

handler._test = {
  MODELO,
  TIMEOUT_TOTAL_MS,
  TIMEOUT_DECISION_MS,
  TIMEOUT_BORRADOR_MAX_MS,
  MAX_TOKENS_DECISION,
  MAX_OUTPUT_TOKENS,
  quitarGuionesLargos,
  limpiarRespuestaNatural,
  normalizarDatosEntrada,
  normalizarMensajesEntrada,
  construirPromptDecision,
  construirPromptChat: construirPromptDecision,
  normalizarDecisionChat,
  normalizarRespuestaChat: normalizarDecisionChat
};

module.exports = handler;
