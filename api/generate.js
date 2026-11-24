"use strict";

/* ==========================================================================
   dmd - api/generate.js (función serverless de Vercel)
   Genera el borrador de la página de un negocio con Qwen 3.8 27B en Groq.
   La clave vive SOLO en la variable de entorno GROQ_API_KEY del servidor.
   Nunca se envía al navegador, nunca se guarda en ningún archivo ni en
   ningún registro. Sin clave configurada, responde 503 y el cliente usa
   el generador local como respaldo.
   ========================================================================== */

const MODELO = "qwen/qwen3.8-27b";
const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";
const MAX_OUTPUT_TOKENS = 2500;

function obtenerModeloGroq() {
  const configurado = process.env.GROQ_MODEL;
  return typeof configurado === "string" && configurado.trim() ? configurado.trim() : MODELO;
}

function construirCuerpoGroq({ prompt, temperature, maxTokens }) {
  const modelo = obtenerModeloGroq();
  const cuerpo = {
    model: modelo,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_completion_tokens: maxTokens,
    response_format: { type: "json_object" }
  };
  if (/^qwen\//i.test(modelo)) {
    cuerpo.reasoning_effort = "none";
  }
  return cuerpo;
}

const PERFILES_DISENO_GIRO = {
  panaderia: {
    etiqueta: "Panadería y repostería",
    sistemaVisual: "Editorial cálido de carta impresa (tipografía serif en titular, ritmo amplio de 8 px, líneas punteadas sin cajas pesadas, sello circular).",
    componentes: "Título evocador y corto; tarjetas como renglones de vitrina con longitudes distintas (algunas de 5 palabras y otras de 12); bloque de encargos y mostrador directo.",
    siHacer: [
      "Variar la longitud de cada tarjeta: combina frases muy cortas ('Vainilla y chocolate. Salen temprano.') con notas prácticas de pedido o vitrina.",
      "Hablar de vitrina, mostrador, pieza suelta o charola sobre pedido solo cuando aplique al producto."
    ],
    noHacer: [
      "No escribas 'horneamos todos los días' si el horario real no incluye los 7 días.",
      "No uses la misma estructura sintáctica en dos tarjetas seguidas.",
      "No inventes precios ni sabores que contradigan lo que ofreció el negocio."
    ]
  },
  ferreteria: {
    etiqueta: "Ferretería",
    sistemaVisual: "Catálogo técnico utilitario (sans condensada en peso 800, ritmo compacto de 4 px, radios secos de 4 px, tarjetas numeradas 01-04 con barra verde superior).",
    componentes: "Título claro y práctico; tarjetas de surtido concretas sin relleno; sección de ventajas enfocada en compatibilidad, piezas sueltas y listas de obra.",
    siHacer: [
      "Adaptar cada descripción al departamento real: en pintura hablar de vinílica/esmalte/cubeta; en tornillería de medidas estándar o milimétricas; en taladros de equipos y brocas.",
      "Alternar tarjetas ultra breves de inventario con consejos prácticos de mostrador."
    ],
    noHacer: [
      "Nunca mezcles vocabulario de tornillería ('medidas y calibres') en tarjetas de pintura o herramienta eléctrica.",
      "No uses tono poético ni adjetivos vacíos."
    ]
  },
  taqueria: {
    etiqueta: "Taquería",
    sistemaVisual: "Tablero ágil de órdenes (display grueso peso 800 con tracking cerrado, ritmo vivo de 6 px, barra verde lateral en cada tarjeta, acción de pedido arriba).",
    componentes: "Título directo con antojo real; tarjetas rápidas de parrilla o plancha con cadencia distinta; preguntas breves sobre para llevar y reuniones.",
    siHacer: [
      "Escribir con ritmo ágil y directo, como le hablarías a alguien que tiene hambre ahora mismo.",
      "Mezclar una descripción de 6 palabras con otra que explique guarniciones o servicio para llevar."
    ],
    noHacer: [
      "No inventes menú, bebidas ni precios que el usuario no dio.",
      "No repitas 'preparado al momento' en todas las tarjetas."
    ]
  },
  cafeteria: {
    etiqueta: "Cafetería",
    sistemaVisual: "Galería minimalista de barra (serif limpia en título, mucho aire con unidad base de 8 px, tarjetas sin caja con divisor fino inferior, sombra suave solo bajo la foto).",
    componentes: "Título sereno; presentación breve de barra; tarjetas ligeras diferenciando bebida fría/caliente o panadería de barra.",
    siHacer: [
      "Mantener frases limpias, sin adjetivos inflados, alternando micro frases ('Caliente o con hielo. Molido al momento.') con detalles de barra.",
      "Respetar el horario exacto si fue proporcionado."
    ],
    noHacer: [
      "No exageres con clichés de café de especialidad si el negocio no los mencionó.",
      "No repitas la misma apertura en cada tarjeta."
    ]
  },
  "salud y belleza": {
    etiqueta: "Salud y belleza",
    sistemaVisual: "Editorial sereno de cabina o consultorio (serif suave, unidad base de 8 px, radios amplios de 16 a 20 px, tarjetas limpias con punto verde discreto).",
    componentes: "Título tranquilo y confiable; presentación clara de atención y citas; tarjetas enfocadas en cuidado, higiene y duración o preparación.",
    siHacer: [
      "Transmitir calma, higiene y claridad al agendar.",
      "Alternar frases cortas de beneficio con una explicación breve de cómo se realiza el servicio."
    ],
    noHacer: [
      "No prometas resultados médicos ni inventes certificaciones o precios.",
      "No escribas tarjetas idénticas entre sí."
    ]
  },
  "taller u oficio": {
    etiqueta: "Taller u oficio",
    sistemaVisual: "Hoja técnica de taller (sans peso 700, unidad base de 4 px, radios rectos de 4 px, cuadrícula técnica numerada con borde izquierdo verde).",
    componentes: "Título directo del oficio; tarjetas claras por tipo de reparación o trabajo; sección de proceso (diagnóstico antes de cotizar, tiempos claros).",
    siHacer: [
      "Usar lenguaje honesto de oficio: revisión, diagnóstico, refacciones y entrega clara.",
      "Variar entre frases directas de alcance y preguntas prácticas para el cliente."
    ],
    noHacer: [
      "No inventes garantías en meses ni costos de revisión.",
      "No uses frases rebuscadas ni paralelas."
    ]
  },
  tienda: {
    etiqueta: "Tienda y comercio local",
    sistemaVisual: "Anaquel de catálogo limpio (sans peso 700, unidad base de 6 px, radios de 10 px, tarjetas ordenadas con borde fino).",
    componentes: "Título claro del comercio; presentación breve sobre existencia en tienda; tarjetas concretas por línea de producto.",
    siHacer: [
      "Destacar compra directa en mostrador, disponibilidad y variedad real de lo que ofrece.",
      "Cambiar el largo y el inicio de cada tarjeta."
    ],
    noHacer: [
      "No inventes envíos nacionales ni precios.",
      "No uses la palabra genérica 'Tienda' como único descriptor si el negocio tiene giro claro."
    ]
  },
  comida: {
    etiqueta: "Comida y cocina local",
    sistemaVisual: "Menú cálido del día (sans peso 800 en título, unidad base de 6 px, radios de 10 px, tarjetas con borde de acento limpio).",
    componentes: "Título apetitoso y real; presentación corta sobre comedor o para llevar; tarjetas variadas de platillos.",
    siHacer: [
      "Describir cada platillo o línea con frescura real y longitudes distintas.",
      "Dejar claro si hay consumo local o para llevar sin inventar plataformas de reparto."
    ],
    noHacer: [
      "No inventes ingredientes ni precios.",
      "No repitas el mismo molde en las tarjetas."
    ]
  },
  servicios: {
    etiqueta: "Servicios profesionales",
    sistemaVisual: "Ejecutivo estructurado (sans peso 700 con tracking cerrado, unidad base de 8 px, radios de 8 px, bloques limpios con filete verde izquierdo).",
    componentes: "Título enfocado en el servicio; beneficios antes del detalle operativo; tarjetas con alcance claro y sin jerga innecesaria.",
    siHacer: [
      "Explicar qué incluye cada servicio y cómo se solicita cotización con claridad.",
      "Variar el ritmo entre puntos breves y frases explicativas."
    ],
    noHacer: [
      "No inventes años de experiencia, clientes ni tarifas.",
      "No escribas párrafos largos ni frases calcadas."
    ]
  },
  otro: {
    etiqueta: "Negocio local",
    sistemaVisual: "Sistema limpio equilibrado (sans peso 700, unidad base de 8 px, radios de 12 px, jerarquía clara centrada en el negocio).",
    componentes: "Título directo con negocio y ciudad; presentación clara; tarjetas concretas con ritmo variado.",
    siHacer: [
      "Usar solo la información real del negocio y variar longitud y estructura entre tarjetas."
    ],
    noHacer: [
      "No inventes precios, direcciones, horarios ni teléfonos.",
      "No uses fórmulas repetidas ni guiones largos."
    ]
  }
};

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

function esCadena(valor) {
  return typeof valor === "string" && valor.trim().length > 0;
}

function normalizarClave(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectarPerfilGiro(datos) {
  const fuente = normalizarClave(
    [datos.giro, datos.giroTexto, datos.nombre, datos.oferta].filter(Boolean).join(" ")
  );
  if (/\b(panad\w*|pastel\w*|reposter\w*|concha\w*|bolillo\w*|hornead\w*|bizcoch\w*)\b/.test(fuente)) {
    return "panaderia";
  }
  if (/\b(ferreter\w*|tlapaler\w*|tornill\w*|taladr\w*|plomer\w*|herramient\w*|pintur\w*)\b/.test(fuente)) {
    return "ferreteria";
  }
  if (/\b(taquer\w*|tacos?|pastor|suadero|birria|carnitas|barbacoa|gringas?)\b/.test(fuente)) {
    return "taqueria";
  }
  if (/\b(cafeter\w*|cafe|espresso|capuchino|latte|barista|filtrado)\b/.test(fuente)) {
    return "cafeteria";
  }
  if (/\b(salud|belleza|estetic\w*|barber\w*|peluquer\w*|unas|spa|dental|dentist\w*|consult\w*|clinic\w*|masaje\w*|veterinar\w*)\b/.test(fuente)) {
    return "salud y belleza";
  }
  if (/\b(taller|oficio|mecan\w*|automotriz|carpint\w*|herrer\w*|electric\w*|cerrajer\w*|reparaci\w*|soldadur\w*|tecnic\w*)\b/.test(fuente)) {
    return "taller u oficio";
  }
  if (/\b(comida|restaur\w*|fonda|cocina|antojit\w*|pizzer\w*|hamburgues\w*|marisc\w*|sushi|loncher\w*|postres?)\b/.test(fuente)) {
    return "comida";
  }
  if (/\b(tienda|ropa|boutique|abarrote\w*|papeler\w*|florer\w*|zapater\w*|farmac\w*|regalo\w*|comercio|venta)\b/.test(fuente)) {
    return "tienda";
  }
  if (/\b(servicio\w*|asesor\w*|contab\w*|abogad\w*|limpieza|lavander\w*|mudanza|flete|fotograf\w*|diseno|clase\w*|curso\w*)\b/.test(fuente)) {
    return "servicios";
  }
  return "otro";
}

function limpiarMencionesWhatsappSiVacio(texto, tieneWhatsapp) {
  if (tieneWhatsapp || typeof texto !== "string") {
    return texto || "";
  }
  return texto
    .replace(/\bpor\s+whats?app\b/gi, "en mostrador")
    .replace(/\ben\s+whats?app\b/gi, "en el local")
    .replace(/\bwhats?app\b/gi, "mostrador")
    .replace(/\bm[aá]ndanos\s+(?:un\s+)?mensaje\b/gi, "pasa al local")
    .replace(/\bescr[ií]benos\b/gi, "visítanos")
    .replace(/\s{2,}/g, " ")
    .trim();
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
  texto = texto.replace(/gsk_[0-9A-Za-z_-]{10,}/g, "[redacted]");
  texto = texto.replace(/AIza[0-9A-Za-z_-]{10,}/g, "[redacted]");
  return texto.trim().slice(0, 1000);
}

function extraerTextoRespuestaGroq(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  if (Array.isArray(payload.choices) && payload.choices[0]) {
    const mensaje = payload.choices[0].message;
    if (mensaje && typeof mensaje.content === "string") {
      return mensaje.content.trim();
    }
    if (mensaje && Array.isArray(mensaje.content)) {
      return mensaje.content
        .filter((p) => p && typeof p.text === "string")
        .map((p) => p.text)
        .join("\n")
        .trim();
    }
  }
  return "";
}

const extraerTextoRespuestaGemini = extraerTextoRespuestaGroq;

function extraerBloqueJsonBalanceado(texto) {
  const inicio = texto.indexOf("{");
  if (inicio === -1) {
    return "";
  }
  let profundidad = 0;
  let enCadena = false;
  let escapado = false;
  for (let i = inicio; i < texto.length; i += 1) {
    const ch = texto[i];
    if (enCadena) {
      if (escapado) {
        escapado = false;
      } else if (ch === "\\") {
        escapado = true;
      } else if (ch === "\"") {
        enCadena = false;
      }
      continue;
    }
    if (ch === "\"") {
      enCadena = true;
    } else if (ch === "{") {
      profundidad += 1;
    } else if (ch === "}") {
      profundidad -= 1;
      if (profundidad === 0) {
        return texto.slice(inicio, i + 1);
      }
    }
  }
  return texto.slice(inicio);
}

function repararJsonCortado(fragmento) {
  let s = String(fragmento || "").trim();
  if (!s.startsWith("{")) {
    return "";
  }
  // Eliminar comas sobrantes antes de cierre
  s = s.replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(s);
  } catch (e) {
    // Continuar con cierre de estructuras si quedó truncado
  }

  let enCadena = false;
  let escapado = false;
  const pila = [];
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (enCadena) {
      if (escapado) {
        escapado = false;
      } else if (ch === "\\") {
        escapado = true;
      } else if (ch === "\"") {
        enCadena = false;
      }
      continue;
    }
    if (ch === "\"") {
      enCadena = true;
    } else if (ch === "{") {
      pila.push("}");
    } else if (ch === "[") {
      pila.push("]");
    } else if ((ch === "}" || ch === "]") && pila.length > 0) {
      pila.pop();
    }
  }

  let reparado = s;
  if (enCadena) {
    reparado = reparado.replace(/\\+$/, "") + "\"";
  }
  reparado = reparado.replace(/[,:\s]+$/, "");
  while (pila.length > 0) {
    reparado += pila.pop();
  }
  reparado = reparado.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(reparado);
  } catch (e2) {
    // Rescate mínimo por campos si el corte ocurrió en medio de una clave
    const parcial = {};
    const mTit = s.match(/"titulo"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const mPres = s.match(/"presentacion"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (mTit && mTit[1]) {
      parcial.titulo = mTit[1].replace(/\\"/g, "\"");
    }
    if (mPres && mPres[1]) {
      parcial.presentacion = mPres[1].replace(/\\"/g, "\"");
    }
    if (parcial.titulo || parcial.presentacion) {
      return parcial;
    }
    return null;
  }
}

function extraerJsonSeguro(textoCrudo) {
  if (typeof textoCrudo !== "string" || !textoCrudo.trim()) {
    return null;
  }
  let limpio = textoCrudo
    .replace(/^\uFEFF/, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  // Quitar bloques de código markdown ```json ... ``` o ``` ... ```
  const matchFence = limpio.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (matchFence && matchFence[1] && matchFence[1].includes("{")) {
    limpio = matchFence[1].trim();
  } else {
    limpio = limpio.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // Intento 1: parseo directo
  try {
    const directo = JSON.parse(limpio);
    if (directo && typeof directo === "object" && !Array.isArray(directo)) {
      return directo;
    }
  } catch (e) {
    // Continuar con extracción balanceada
  }

  // Intento 2: extraer bloque JSON balanceado quitando texto antes/después
  const bloque = extraerBloqueJsonBalanceado(limpio);
  if (!bloque) {
    return null;
  }
  try {
    const extraido = JSON.parse(bloque.replace(/,\s*([}\]])/g, "$1"));
    if (extraido && typeof extraido === "object" && !Array.isArray(extraido)) {
      return extraido;
    }
  } catch (e2) {
    // Intento 3: reparar JSON truncado o con cierre faltante
    return repararJsonCortado(bloque);
  }
  return null;
}

function dividirOfertaEnServiciosRespaldo(oferta) {
  const partes = String(oferta || "")
    .replace(/\b(?:ubicaci[oó]n|horario)\s*:[^.]*/gi, "")
    .split(/[\n;,\u2022]+|\s+y\s+/i)
    .map((p) => textoLimpio(p, 70))
    .filter((p) => p.length >= 2);
  const vistos = new Set();
  const salida = [];
  for (const item of partes) {
    const k = item.toLowerCase();
    if (!vistos.has(k)) {
      vistos.add(k);
      const cap = item.charAt(0).toUpperCase() + item.slice(1);
      salida.push({
        titulo: cap,
        descripcion:
          salida.length === 0
            ? "Disponible directo en el local según existencia."
            : salida.length === 1
              ? "Pregunta en mostrador por opciones y presentaciones."
              : "Atención local con trato directo."
      });
    }
    if (salida.length >= 5) {
      break;
    }
  }
  if (salida.length === 0) {
    salida.push({
      titulo: "Oferta principal",
      descripcion: textoLimpio(oferta, 160) || "Atención directa en el local."
    });
  }
  return salida;
}

function construirRespaldoCampoFaltante(datos, perfilClave) {
  const tieneWa = Boolean(datos.whatsapp);
  const lugar = datos.direccion ? `${datos.direccion}, ${datos.ciudad}` : datos.ciudad;
  const titulo = `${datos.nombre} en ${datos.ciudad}`;
  const presentacion = [
    `${datos.nombre} en ${lugar}: ${datos.oferta}.`,
    datos.horario
      ? `Horario: ${datos.horario}.`
      : tieneWa
        ? "Consulta disponibilidad o haz tu pedido directo por WhatsApp."
        : "Atención directa en mostrador."
  ].join(" ");

  const beneficios = [
    `Atención directa en ${datos.ciudad}.`,
    tieneWa
      ? "Respuesta rápida por WhatsApp antes de pasar."
      : "Trato directo en mostrador sin intermediarios.",
    perfilClave === "panaderia"
      ? "Venta por pieza suelta o sobre pedido."
      : perfilClave === "ferreteria"
        ? "Surtido por pieza suelta o lista completa."
        : "Opciones claras según lo que necesitas."
  ];

  const preguntasFrecuentes = [
    {
      pregunta: `¿Qué ofrecen en ${datos.nombre}?`,
      respuesta: `Contamos con ${datos.oferta}.`
    },
    datos.horario
      ? {
          pregunta: "¿Cuál es su horario?",
          respuesta: `Abrimos ${datos.horario}${datos.direccion ? ` en ${lugar}` : ` en ${datos.ciudad}`}.`
        }
      : {
          pregunta: `¿Dónde está ${datos.nombre}?`,
          respuesta: `Estamos en ${lugar}.`
        },
    {
      pregunta: tieneWa ? "¿Cómo puedo pedir informes?" : "¿Cómo los visito?",
      respuesta: tieneWa
        ? "Usa el botón de WhatsApp en esta página y te confirmamos disponibilidad."
        : `Pasa directo a ${lugar} para revisar opciones en mostrador.`
    }
  ];

  return {
    titulo,
    presentacion,
    servicios: dividirOfertaEnServiciosRespaldo(datos.oferta),
    beneficios,
    preguntasFrecuentes
  };
}

function normalizarBorrador(datos, crudo) {
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) {
    return null;
  }
  const perfilClave = detectarPerfilGiro(datos);
  const respaldo = construirRespaldoCampoFaltante(datos, perfilClave);
  const tieneWa = Boolean(datos.whatsapp);

  const limpiarVal = (txt, max) => limpiarMencionesWhatsappSiVacio(textoLimpio(txt, max), tieneWa);

  const tituloCrudo = limpiarVal(crudo.titulo, 120);
  const presentacionCruda = limpiarVal(crudo.presentacion, 600);

  const serviciosCrudos = Array.isArray(crudo.servicios) ? crudo.servicios : [];
  const servicios = serviciosCrudos
    .slice(0, 6)
    .map((s) => {
      if (typeof s === "string") {
        return { titulo: limpiarVal(s, 80), descripcion: "" };
      }
      if (s && typeof s === "object") {
        return {
          titulo: limpiarVal(s.titulo || s.nombre || "", 80),
          descripcion: limpiarVal(s.descripcion || s.detalle || "", 200)
        };
      }
      return null;
    })
    .filter((s) => s && s.titulo);

  const beneficios = (Array.isArray(crudo.beneficios) ? crudo.beneficios : [])
    .filter(esCadena)
    .slice(0, 6)
    .map((b) => limpiarVal(b, 200))
    .filter(Boolean);

  const preguntasFrecuentes = (
    Array.isArray(crudo.preguntasFrecuentes)
      ? crudo.preguntasFrecuentes
      : Array.isArray(crudo.preguntas)
        ? crudo.preguntas
        : []
  )
    .slice(0, 6)
    .map((f) => {
      if (!f || typeof f !== "object") {
        return null;
      }
      const pregunta = limpiarVal(f.pregunta || f.q || "", 200);
      const respuesta = limpiarVal(f.respuesta || f.a || "", 400);
      return pregunta && respuesta ? { pregunta, respuesta } : null;
    })
    .filter(Boolean);

  // Verificar que al menos algún campo útil vino del modelo antes de completar faltantes
  const tieneAlgoUtil = Boolean(
    tituloCrudo ||
      presentacionCruda ||
      servicios.length > 0 ||
      beneficios.length > 0 ||
      preguntasFrecuentes.length > 0
  );
  if (!tieneAlgoUtil) {
    return null;
  }

  return {
    titulo: tituloCrudo || respaldo.titulo,
    presentacion: presentacionCruda || respaldo.presentacion,
    servicios: servicios.length > 0 ? servicios : respaldo.servicios,
    beneficios: beneficios.length > 0 ? beneficios : respaldo.beneficios,
    preguntasFrecuentes:
      preguntasFrecuentes.length > 0 ? preguntasFrecuentes : respaldo.preguntasFrecuentes,
    perfilVisual: perfilClave,
    variante: Number.isFinite(Number(datos.variante)) ? Math.abs(Number(datos.variante)) : 0
  };
}

function construirPrompt(datos) {
  const perfilClave = detectarPerfilGiro(datos);
  const perfil = PERFILES_DISENO_GIRO[perfilClave] || PERFILES_DISENO_GIRO.otro;
  const giroEtiqueta = datos.giro || perfil.etiqueta;
  const lineasDatos = [
    "Nombre: " + datos.nombre,
    "Giro: " + giroEtiqueta,
    "Ciudad: " + datos.ciudad
  ];
  if (datos.direccion) {
    lineasDatos.push("Calle o colonia: " + datos.direccion);
  }
  if (datos.horario) {
    lineasDatos.push("Horario real: " + datos.horario);
  }
  lineasDatos.push("Qué ofrece: " + datos.oferta);
  lineasDatos.push("Tono: " + datos.tono);
  lineasDatos.push("WhatsApp: " + (datos.whatsapp ? datos.whatsapp : "no proporcionado (NO menciones WhatsApp en ningún texto)"));

  return [
    "Eres editor y diseñador de contenido web para negocios locales en México.",
    "Escribe en español natural de México, como un dueño real del negocio, sin sonar a plantilla ni repetir el mismo esquema entre tarjetas.",
    "",
    "Sistema editorial y de componentes para este giro (" + perfil.etiqueta + "):",
    "- Lenguaje visual de la página: " + perfil.sistemaVisual,
    "- Tratamiento de componentes: " + perfil.componentes,
    "- Sí hacer: " + perfil.siHacer.join(" "),
    "- No hacer: " + perfil.noHacer.join(" "),
    "",
    "Reglas obligatorias:",
    "1. Usa SOLO los datos reales del negocio. No inventes precios, promociones, horarios, calles ni teléfonos.",
    "2. Si WhatsApp dice no proporcionado, NO menciones WhatsApp, mensajes ni escribir por chat.",
    "3. Prohibido usar guiones largos o rayas tipográficas en cualquier texto.",
    "4. Varía la longitud y estructura entre tarjetas de servicios: combina frases cortas (5 a 8 palabras) con notas concretas (10 a 16 palabras).",
    "5. Devuelve UNICAMENTE un objeto JSON válido, sin markdown, sin bloques ``` y sin texto antes ni después.",
    "",
    "Esquema JSON exacto requerido (todas las claves no vacías):",
    '{"titulo":"...","presentacion":"...","servicios":[{"titulo":"...","descripcion":"..."}],"beneficios":["..."],"preguntasFrecuentes":[{"pregunta":"...","respuesta":"..."}]}',
    "Limita servicios a 3-5 elementos, beneficios a 3-4 frases cortas y preguntasFrecuentes a 2-4 objetos.",
    "",
    "Datos del negocio:",
    ...lineasDatos
  ].join("\n");
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const clave = process.env.GROQ_API_KEY;
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
    giro: textoLimpio(cuerpo.giro, 60),
    giroTexto: textoLimpio(cuerpo.giroTexto || cuerpo.giro || "", 60),
    ciudad: textoLimpio(cuerpo.ciudad, 80),
    direccion: textoLimpio(cuerpo.direccion || "", 140),
    horario: textoLimpio(cuerpo.horario || "", 140),
    oferta: textoLimpio(cuerpo.oferta, 500),
    tono: ["cercano", "profesional", "formal"].includes(cuerpo.tono) ? cuerpo.tono : "cercano",
    whatsapp: String(cuerpo.whatsapp || "").replace(/\D/g, "").slice(0, 15),
    variante: Number(cuerpo.variante) || 0
  };
  if (!datos.nombre || !datos.ciudad || !datos.oferta) {
    return res.status(400).json({ error: "missing_fields" });
  }

  let respuestaGroq;
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 45000);
    try {
      respuestaGroq = await fetch(URL_GROQ, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + clave
        },
        body: JSON.stringify(
          construirCuerpoGroq({
            prompt: construirPrompt(datos),
            temperature: 0.7,
            maxTokens: MAX_OUTPUT_TOKENS
          })
        ),
        signal: controlador.signal
      });
    } finally {
      clearTimeout(temporizador);
    }
  } catch (e) {
    const detalleRed =
      (e && e.name === "AbortError" ? "Timeout after 45000ms" : "") ||
      (e && e.cause && e.cause.message) ||
      (e && e.message) ||
      "network_error";
    return res.status(502).json({
      error: "provider_unavailable",
      provider_status: null,
      provider_message: sanitizarMensajeError(detalleRed, clave)
    });
  }

  if (!respuestaGroq.ok) {
    let cuerpoError = "";
    try {
      cuerpoError = await respuestaGroq.text();
    } catch (e) {
      cuerpoError = "";
    }
    let errorProveedor = null;
    if (cuerpoError) {
      try {
        const parsed = JSON.parse(cuerpoError);
        if (parsed && typeof parsed === "object") {
          if (parsed.error && typeof parsed.error === "object") {
            errorProveedor = parsed.error;
          } else if (Array.isArray(parsed) && parsed[0] && parsed[0].error && typeof parsed[0].error === "object") {
            errorProveedor = parsed[0].error;
          }
        }
      } catch (e) {
        errorProveedor = null;
      }
    }
    const mensajeCrudo =
      (errorProveedor && (errorProveedor.message || errorProveedor.type || errorProveedor.code || errorProveedor.status)) ||
      cuerpoError ||
      respuestaGroq.statusText ||
      "provider_error";
    const respuestaError = {
      error: "provider_error",
      provider_status: respuestaGroq.status,
      provider_message: sanitizarMensajeError(mensajeCrudo, clave)
    };
    const estadoProveedor =
      errorProveedor && (errorProveedor.code || errorProveedor.type || errorProveedor.status);
    if (typeof estadoProveedor === "string" && estadoProveedor.trim()) {
      respuestaError.provider_error_status = sanitizarMensajeError(estadoProveedor, clave);
    }
    return res.status(502).json(respuestaError);
  }

  let payload;
  try {
    payload = await respuestaGroq.json();
  } catch (e) {
    return res.status(502).json({
      error: "provider_error",
      provider_status: respuestaGroq.status,
      provider_message: sanitizarMensajeError(e && e.message, clave) || "invalid_provider_json"
    });
  }

  const texto = extraerTextoRespuestaGroq(payload);
  if (!texto) {
    const detallePayload =
      (payload && payload.error && (payload.error.message || payload.error.type || payload.error.code || payload.error.status)) ||
      "missing_choices";
    return res.status(502).json({
      error: "provider_error",
      provider_status: respuestaGroq.status,
      provider_message: sanitizarMensajeError(detallePayload, clave)
    });
  }

  const crudo = extraerJsonSeguro(texto);
  if (!crudo) {
    return res.status(502).json({ error: "invalid_response" });
  }

  const borrador = normalizarBorrador(datos, crudo);
  if (!borrador) {
    return res.status(502).json({ error: "invalid_response" });
  }
  return res.status(200).json({ borrador });
}

handler._test = {
  MODELO,
  URL_GROQ,
  MAX_OUTPUT_TOKENS,
  obtenerModeloGroq,
  construirCuerpoGroq,
  PERFILES_DISENO_GIRO,
  detectarPerfilGiro,
  construirPrompt,
  extraerTextoRespuestaGroq,
  extraerTextoRespuestaGemini,
  extraerJsonSeguro,
  normalizarBorrador
};

module.exports = handler;
