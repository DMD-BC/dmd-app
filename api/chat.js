"use strict";

/* ==========================================================================
   dmd - api/chat.js (función serverless de Vercel)
   Razonamiento conversacional en el servidor con Gemini 3.8 Flash.
   En cada turno la IA analiza el historial y los datos reales del negocio,
   clasifica la intención del mensaje y devuelve una decisión estructurada:
   preguntar lo que falta (una pregunta a la vez), generar o actualizar el
   borrador, responder una duda sin editar el borrador o darlo por completo.
   La clave vive SOLO en GEMINI_API_KEY en el servidor.
   ========================================================================== */

const generateHandler = require("./generate");
const {
  MODELO,
  MAX_OUTPUT_TOKENS,
  PERFILES_DISENO_GIRO,
  detectarPerfilGiro,
  extraerTextoRespuestaGemini,
  extraerJsonSeguro,
  normalizarBorrador
} = generateHandler._test;

const URL_GEMINI =
  "https://generativelanguage.googleapis.com/v1beta/models/" + MODELO + ":generateContent";
const TIMEOUT_MS = 45000;

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
  // Quitar aperturas típicas de IA si aparecieran al inicio
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
      texto: textoLimpio(m.texto, 400)
    }))
    .filter((m) => m.texto.length > 0)
    .slice(-14);
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

function construirPromptChat({
  mensajes,
  datos,
  camposOmitidos,
  tieneBorrador,
  estadoEditor
}) {
  const perfilClave = detectarPerfilGiro(datos);
  const perfil = PERFILES_DISENO_GIRO[perfilClave] || PERFILES_DISENO_GIRO.otro;

  const resumenDatos = [
    "nombre: " + (datos.nombre || "(falta)"),
    "giro: " + (datos.giroTexto || datos.giro || "(falta)"),
    "ciudad: " + (datos.ciudad || "(falta)"),
    "oferta: " + (datos.oferta || "(falta)"),
    "direccion: " + (datos.direccion || "(no indicada)"),
    "horario: " + (datos.horario || "(no indicado)"),
    "whatsapp: " + (datos.whatsapp || "(no indicado)"),
    "tono: " + (datos.tono || "(predeterminado cercano)")
  ];

  const editorInfo = estadoEditor && typeof estadoEditor === "object" ? estadoEditor : {};
  const resumenEditor = [
    "tieneBorrador: " + (tieneBorrador ? "sí" : "no"),
    "tieneLogo: " + (editorInfo.tieneLogo ? "sí" : "no"),
    "portadaOrigen: " + (textoLimpio(editorInfo.portadaOrigen || "ninguna", 30) || "ninguna"),
    "plantilla: " + (textoLimpio(editorInfo.plantilla || "clasica", 30) || "clasica"),
    "publicadaUrl: " + (textoLimpio(editorInfo.publicadaUrl || "", 180) || "(no publicada)"),
    "camposOmitidosPorUsuario: " + (camposOmitidos.length > 0 ? camposOmitidos.join(", ") : "(ninguno)")
  ];

  const historialLineas = mensajes.map(
    (m) => (m.rol === "usuario" ? "Usuario: " : "Asistente: ") + m.texto
  );

  return [
    "Eres el asistente conversacional de DMD para crear y ajustar la página web de un negocio local en México.",
    "Hablas en español natural de México, con frases cortas, claras y directas.",
    "NO uses un guion fijo ni numeres pasos. En cada turno razona qué información falta, qué quiere hacer el usuario y qué conviene responder.",
    "",
    "Reglas de estilo obligatorias:",
    "1. Haz SOLO UNA pregunta a la vez cuando pidas un dato faltante.",
    "2. Prohibido usar guiones largos o rayas tipográficas en cualquier texto.",
    "3. Prohibido usar frases hechas de IA como '¡Excelente!', '¡Por supuesto!', '¡Claro que sí!', 'Como asistente de IA' o mencionar IA, modelos, constructores ni especificaciones de diseño.",
    "4. Usa SOLO datos reales del usuario. Nunca inventes precios, horarios, calles, promociones ni teléfonos.",
    "5. Si WhatsApp está vacío, NO menciones WhatsApp ni escribir por mensaje dentro del borrador.",
    "",
    "Clasificación de intención (evalúa el último mensaje del usuario con tolerancia a faltas de ortografía):",
    "- 'pregunta': el usuario pregunta algo sobre el logo, foto, WhatsApp, horario, dirección, precios, plantilla, tono, cómo publicar o cómo usar la app. Usa accion='responder', deja datosExtraidos={} y borrador=null. NUNCA pegues una pregunta en oferta ni edites el borrador.",
    "- 'saludo': saludo corto o agradecimiento sin datos nuevos. Usa accion='responder', datosExtraidos={} y borrador=null.",
    "- 'ambiguo': mensaje confuso o con demasiados errores donde no queda claro qué cambiar o agregar. Usa accion='responder', pide aclaración breve, datosExtraidos={} y borrador=null. NUNCA pegues texto literal al borrador.",
    "- 'quitar': pide quitar WhatsApp, horario, dirección, logo, portada o un producto específico. Para campos usa camposQuitar (['whatsapp'|'horario'|'direccion']); para logo/portada usa ajusteDiseno; para quitar un producto entrega la oferta restante limpia en datosExtraidos.oferta.",
    "- 'cambiar': pide cambiar nombre, ciudad, horario, dirección, WhatsApp, tono (cercano|profesional|formal), plantilla (clasica|editorial|directa), portada o precios. Si pide poner precios sin indicar montos, usa accion='responder' y pide los precios reales sin inventarlos.",
    "- 'agregar': pide sumar productos o servicios. Limpia palabras de relleno ('agrega', 'ponle', 'también vendemos') y devuelve la oferta completa actualizada en datosExtraidos.oferta.",
    "- 'completo': el usuario indica que el borrador ya quedó listo. Si tieneBorrador=sí, usa accion='completo' y borrador=null.",
    "- 'datos': el usuario da información del negocio (puede dar uno o varios datos en el mismo mensaje, incluso con faltas de ortografía). Extrae TODOS los datos que mencionó en datosExtraidos sin copiar frases de relleno.",
    "",
    "Reglas para decidir accion:",
    "- Datos mínimos indispensables para generar un borrador: nombre, ciudad y oferta. Si giro se deduce del nombre u oferta (ej. Panadería La Espiga -> panaderia), extráelo sin preguntar por él.",
    "- Datos útiles opcionales: direccion (calle o colonia), horario, whatsapp (10 a 15 dígitos) y tono. NO preguntes por un dato que ya está en datos o en camposOmitidosPorUsuario. Si el usuario dice que no tiene o prefiere omitir un dato opcional, inclúyelo en camposOmitidos.",
    "- Si falta algún dato indispensable (nombre, ciudad u oferta), usa accion='preguntar', borrador=null y haz UNA sola pregunta corta para el siguiente dato que falte.",
    "- Si ya tienes nombre, ciudad y oferta y tieneBorrador=no:",
    "  * Si el usuario ya dio algún dato opcional (direccion, horario o whatsapp), o ya omitió opcionales, o pidió armar el borrador ya, usa accion='generar' y devuelve el objeto 'borrador' completo en este mismo JSON.",
    "  * Si todavía no da ningún dato opcional ni pidió generar ya, puedes hacer UNA pregunta breve por un dato opcional útil (horario, calle o WhatsApp) e incluir 'Armar borrador ya' en sugerencias, O generar directamente si ya dio bastante contexto.",
    "- Si tieneBorrador=sí y hubo un cambio real en datos (cambiar, agregar, quitar campo/producto o datos nuevos), usa accion='actualizar' y devuelve el objeto 'borrador' actualizado en este mismo JSON.",
    "- Si solo cambió diseño (plantilla, quitarLogo, quitarPortada o cambiarPortada), usa accion='responder' con ajusteDiseno y borrador=null.",
    "",
    "Guía editorial cuando generes o actualices 'borrador' (" + perfil.etiqueta + "):",
    "- Sí hacer: " + perfil.siHacer.join(" "),
    "- No hacer: " + perfil.noHacer.join(" "),
    "- Varía longitud y estructura entre tarjetas de servicios (3 a 5 servicios, 3 a 4 beneficios, 2 a 4 preguntasFrecuentes).",
    "",
    "Estado actual del negocio:",
    ...resumenDatos,
    "",
    "Estado de la página y editor:",
    ...resumenEditor,
    "",
    "Conversación:",
    ...historialLineas,
    "",
    "Devuelve UNICAMENTE un objeto JSON válido con este esquema exacto (sin markdown ni texto extra):",
    '{"accion":"preguntar|generar|actualizar|responder|completo","intencion":"datos|pregunta|cambiar|agregar|quitar|saludo|ambiguo|completo","respuesta":"...","datosExtraidos":{"nombre":"","giro":"","giroTexto":"","ciudad":"","direccion":"","horario":"","oferta":"","tono":"","whatsapp":""},"camposQuitar":[],"camposOmitidos":[],"ajusteDiseno":{"plantilla":"","quitarLogo":false,"quitarPortada":false,"cambiarPortada":false},"sugerencias":[],"borrador":null}',
    "Cuando accion sea 'generar' o 'actualizar', 'borrador' DEBE ser el objeto completo: {\"titulo\":\"...\",\"presentacion\":\"...\",\"servicios\":[{\"titulo\":\"...\",\"descripcion\":\"...\"}],\"beneficios\":[\"...\"],\"preguntasFrecuentes\":[{\"pregunta\":\"...\",\"respuesta\":\"...\"}]}. En cualquier otra acción, borrador debe ser null.",
    "En 'sugerencias' incluye de 0 a 3 chips cortos opcionales (máximo 30 caracteres cada uno) solo si ayudan al usuario."
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

function normalizarRespuestaChat(entrada, crudo) {
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

  // Deducir giro automáticamente si ya es claro por nombre u oferta
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
    } else {
      const datosParaBorrador = Object.assign({}, datosActualizados, {
        tono: datosActualizados.tono || "cercano",
        variante: Number(entrada.variante) || 0
      });
      if (crudo.borrador && typeof crudo.borrador === "object") {
        borrador = normalizarBorrador(datosParaBorrador, crudo.borrador);
      }
    }
  } else if (accion === "completo" && !entrada.tieneBorrador && tieneMinimos) {
    accion = "generar";
    const datosParaBorrador = Object.assign({}, datosActualizados, {
      tono: datosActualizados.tono || "cercano",
      variante: Number(entrada.variante) || 0
    });
    if (crudo.borrador && typeof crudo.borrador === "object") {
      borrador = normalizarBorrador(datosParaBorrador, crudo.borrador);
    }
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

  let respuestaGemini;
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    try {
      respuestaGemini = await fetch(URL_GEMINI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": clave
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: construirPromptChat(entrada) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.5,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
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
    const detalleRed =
      (e && e.name === "AbortError" ? "Timeout after " + TIMEOUT_MS + "ms" : "") ||
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
    return res.status(502).json({
      error: "provider_error",
      provider_status: respuestaGemini.status,
      provider_message: sanitizarMensajeError(mensajeCrudo, clave)
    });
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

  const texto = extraerTextoRespuestaGemini(payload);
  if (!texto) {
    const detallePayload =
      (payload && payload.error && (payload.error.message || payload.error.status)) ||
      (payload && payload.promptFeedback && payload.promptFeedback.blockReason) ||
      "missing_candidates";
    return res.status(502).json({
      error: "provider_error",
      provider_status: respuestaGemini.status,
      provider_message: sanitizarMensajeError(detallePayload, clave)
    });
  }

  const crudo = extraerJsonSeguro(texto);
  if (!crudo) {
    return res.status(502).json({ error: "invalid_response" });
  }

  const resultado = normalizarRespuestaChat(entrada, crudo);
  if (!resultado) {
    return res.status(502).json({ error: "invalid_response" });
  }

  return res.status(200).json(resultado);
}

handler._test = {
  MODELO,
  TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
  quitarGuionesLargos,
  limpiarRespuestaNatural,
  normalizarDatosEntrada,
  normalizarMensajesEntrada,
  construirPromptChat,
  normalizarRespuestaChat
};

module.exports = handler;
