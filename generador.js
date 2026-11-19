"use strict";

/* ==========================================================================
   dmd - Generador de páginas web para negocios (es-MX natural)
   Soporta variantes para regenerar el borrador manteniendo los datos reales
   del negocio, y formato de texto plano para copiar.
   ========================================================================== */

// Dominio opcional fijo para publicación. Si queda vacío, usa automáticamente
// el origen actual del sitio (por ejemplo https://dmd.dmdmx.dev).
const DOMINIO_PUBLICACION_DMD = "";

const GIROS_ETIQUETAS = {
  tienda: "Tienda",
  comida: "Comida",
  servicios: "Servicios",
  "salud y belleza": "Salud y belleza",
  "taller u oficio": "Taller u oficio",
  otro: "Otro"
};

const TONOS_ETIQUETAS = {
  cercano: "Cercano",
  profesional: "Profesional",
  formal: "Formal"
};

const PERFILES_GIRO = {
  tienda: {
    introduccion: {
      cercano: [
        "En {nombre} tenemos {oferta} aquí en {ciudad}. Si quieres preguntar si hay existencia antes de darte la vuelta, mándanos un WhatsApp y te respondemos en corto.",
        "En {nombre} encuentras {oferta} en {ciudad}. Escríbenos por WhatsApp para confirmar existencias o apartar lo que buscas antes de pasar."
      ],
      profesional: [
        "{nombre} atiende en {ciudad} con {oferta}. Puedes consultar disponibilidad por WhatsApp antes de visitarnos para ahorrar tiempo.",
        "En {nombre} ofrecemos {oferta} en {ciudad}, con consulta directa de existencias y apartados por WhatsApp."
      ],
      formal: [
        "En {nombre} ponemos a su disposición {oferta} en {ciudad}. Con gusto le confirmamos existencias y horarios por WhatsApp antes de su visita.",
        "{nombre} le ofrece {oferta} en {ciudad}. Puede escribirnos por WhatsApp para verificar disponibilidad y coordinar su atención."
      ]
    },
    complementos: [
      {
        titulo: "Apartado antes de pasar",
        cercano: "Si te interesa algo, nos escribes y te lo dejamos apartado para cuando vengas.",
        profesional: "Confirmamos existencia por mensaje y apartamos tu pedido para recolección.",
        formal: "Previa confirmación de existencia, podemos apartar los artículos que requiera."
      },
      {
        titulo: "Orientación para elegir",
        cercano: "Si dudas entre dos opciones, te decimos cuál te conviene más según lo que buscas.",
        profesional: "Te compartimos medidas, características o alternativas disponibles antes de comprar.",
        formal: "Le brindamos información detallada sobre cada opción para facilitar su elección."
      }
    ],
    beneficios: {
      cercano: [
        "Confirmas existencias por mensaje antes de salir de casa.",
        "Estamos en {ciudad}, sin tener que esperar días por un envío.",
        "Te atendemos directo los mismos que conocemos el surtido.",
        "Si buscas algo específico y no lo ves, pregúntanos por si llega pronto."
      ],
      profesional: [
        "Verificación rápida de inventario por WhatsApp.",
        "Entrega y atención directa en {ciudad}.",
        "Información clara sobre opciones y disponibilidad real.",
        "Posibilidad de apartar productos para pasar por ellos sin esperas."
      ],
      formal: [
        "Confirmación oportuna de existencias antes de acudir al establecimiento.",
        "Atención directa en {ciudad}.",
        "Orientación clara sobre características y opciones disponibles.",
        "Facilidad para coordinar apartados y recolección."
      ]
    },
    faqs: {
      cercano: [
        {
          q: "¿Cómo sé si tienen disponible lo que busco?",
          a: "Escríbenos qué necesitas y te confirmamos al momento si lo tenemos en tienda."
        },
        {
          q: "¿Dónde están en {ciudad}?",
          a: "Mándanos mensaje y te pasamos la ubicación exacta junto con el horario de hoy."
        },
        {
          q: "¿Me pueden apartar algo para pasar más tarde?",
          a: "Sí, avísanos qué te apartamos y a qué hora pasas por ello."
        },
        {
          q: "¿Qué manejan principalmente en {nombre}?",
          a: "Sobre todo {oferta}. Si necesitas algo parecido, pregunta sin pena."
        }
      ],
      profesional: [
        {
          q: "¿Cómo consulto existencias?",
          a: "Envía el nombre del producto o una breve descripción por WhatsApp y te confirmamos disponibilidad."
        },
        {
          q: "¿Cuál es su ubicación en {ciudad}?",
          a: "Atendemos en {ciudad}. Al escribirnos te compartimos dirección y horarios vigentes."
        },
        {
          q: "¿Trabajan con apartados?",
          a: "Sí, una vez confirmada la existencia podemos apartar tu pedido para recolección el mismo día."
        },
        {
          q: "¿Qué productos encuentran en {nombre}?",
          a: "Nuestra oferta principal incluye {oferta}."
        }
      ],
      formal: [
        {
          q: "¿Cómo puedo verificar si cuentan con un artículo?",
          a: "Puede escribirnos indicando el producto de su interés y le confirmaremos existencias a la brevedad."
        },
        {
          q: "¿En qué zona de {ciudad} se encuentran?",
          a: "Brindamos atención en {ciudad}. Con gusto le enviaremos nuestra dirección exacta y horario al contactarnos."
        },
        {
          q: "¿Ofrecen apartado de mercancía?",
          a: "Sí, confirmada la disponibilidad podemos reservar los artículos que usted indique."
        },
        {
          q: "¿Cuál es el giro principal de {nombre}?",
          a: "En {nombre} ofrecemos {oferta}, con atención directa para resolver cualquier duda."
        }
      ]
    }
  },

  comida: {
    introduccion: {
      cercano: [
        "En {nombre} preparamos {oferta} aquí en {ciudad}. Si quieres apartar tu pedido o preguntar qué acaba de salir, mándanos un WhatsApp y te contestamos rápido.",
        "Aquí en {ciudad}, en {nombre} hacemos {oferta} al día. Escríbenos por WhatsApp para apartar tu pedido y pasar directo por él."
      ],
      profesional: [
        "En {nombre} elaboramos {oferta} al día en {ciudad}. Toma tu pedido con anticipación por WhatsApp para pasar sin hacer fila.",
        "{nombre} ofrece {oferta} con preparación diaria en {ciudad}. Coordina tu pedido por WhatsApp y confirma horario de recolección."
      ],
      formal: [
        "En {nombre} preparamos {oferta} en {ciudad}. Puede realizar su pedido con anticipación por WhatsApp para tenerlo listo a su llegada.",
        "{nombre} pone a su disposición {oferta} en {ciudad}, elaborados al día. Con gusto tomamos su pedido por WhatsApp."
      ]
    },
    complementos: [
      {
        titulo: "Pedidos para recoger",
        cercano: "Nos avisas qué vas a querer y a qué hora pasas para tenértelo apartado.",
        profesional: "Envía tu orden con anticipación y pasa a recoger en el horario acordado.",
        formal: "Recibimos su pedido con anticipación para agilizar su recolección."
      },
      {
        titulo: "Encargos para reuniones",
        cercano: "Si tienes junta, café o comida familiar, preparamos pedidos grandes sobre encargo.",
        profesional: "Atendemos órdenes programadas para oficina o reuniones familiares.",
        formal: "Preparamos encargos programados para reuniones laborales o compromisos familiares."
      }
    ],
    beneficios: {
      cercano: [
        "Todo se prepara al día, con buen sazón e ingredientes frescos.",
        "Puedes apartar por WhatsApp para no quedarte sin lo que se te antoja.",
        "Estamos en {ciudad} y te pasamos el punto exacto en cuanto escribes.",
        "Si necesitas un pedido grande para una reunión, nos ponemos de acuerdo con tiempo."
      ],
      profesional: [
        "Preparación diaria en {ciudad} cuidando sabor e higiene.",
        "Toma de pedidos por mensaje para evitar tiempos de espera.",
        "Opción de encargos anticipados para grupos o eventos pequeños.",
        "Confirmación directa de disponibilidad y hora de entrega."
      ],
      formal: [
        "Elaboración diaria con ingredientes frescos y cuidados estándares de higiene en {ciudad}.",
        "Atención ordenada para pedidos individuales y encargos programados.",
        "Confirmación clara de horarios de preparación y recolección.",
        "Trato puntual y directo en cada orden."
      ]
    },
    faqs: {
      cercano: [
        {
          q: "¿Cómo hago un pedido?",
          a: "Mándanos mensaje con lo que quieres y a qué hora pasas. Te confirmamos si ya está listo o en cuánto sale."
        },
        {
          q: "¿Dónde están ubicados en {ciudad}?",
          a: "Escríbenos y te mandamos la ubicación exacta y nuestro horario de hoy."
        },
        {
          q: "¿Tienen que ser pedidos grandes?",
          a: "Para nada, puedes pedir para ti solo o encargar para una reunión."
        },
        {
          q: "¿Qué preparan en {nombre}?",
          a: "Nuestro fuerte es {oferta}. Si traes algún antojo en especial, pregúntanos qué hay hoy."
        }
      ],
      profesional: [
        {
          q: "¿Cómo se toman los pedidos?",
          a: "Envía por WhatsApp lo que deseas ordenar y la hora aproximada en que pasarías; te confirmamos disponibilidad."
        },
        {
          q: "¿Dónde se recoge el pedido en {ciudad}?",
          a: "Al confirmar tu orden te compartimos la dirección exacta y referencias."
        },
        {
          q: "¿Con cuánto tiempo debo pedir para una reunión?",
          a: "Para pedidos de varias personas conviene avisar con al menos un día de anticipación."
        },
        {
          q: "¿Qué incluye su menú principal?",
          a: "Nos enfocamos en {oferta}, elaborados diariamente."
        }
      ],
      formal: [
        {
          q: "¿Cómo puedo realizar un pedido en {nombre}?",
          a: "Puede escribirnos indicando los productos de su preferencia y el horario deseado para confirmarle preparación."
        },
        {
          q: "¿Dónde se encuentran ubicados?",
          a: "Atendemos en {ciudad}. Con gusto le compartimos la dirección exacta y horarios al comunicarse."
        },
        {
          q: "¿Reciben pedidos programados para reuniones?",
          a: "Sí, recibimos encargos con anticipación para asegurar disponibilidad y puntualidad."
        },
        {
          q: "¿Qué especialidades ofrecen?",
          a: "En {nombre} preparamos {oferta}."
        }
      ]
    }
  },

  servicios: {
    introduccion: {
      cercano: [
        "En {nombre} trabajamos en {ciudad} haciendo {oferta}. Cuéntanos qué necesitas por WhatsApp y te decimos cómo le hacemos y cuándo podemos atenderte.",
        "¿Buscas {oferta} en {ciudad}? En {nombre} te atendemos directo por WhatsApp para revisar lo que ocupas y acordar horario."
      ],
      profesional: [
        "{nombre} ofrece {oferta} en {ciudad}. Revisamos tu requerimiento desde el primer mensaje para definir tiempos y pasos concretos.",
        "En {nombre} brindamos {oferta} en {ciudad}, con atención directa por WhatsApp y seguimiento puntual."
      ],
      formal: [
        "En {nombre} brindamos servicios de {oferta} en {ciudad}. Atendemos su solicitud con claridad en el alcance y cumplimiento de tiempos.",
        "{nombre} pone a su disposición {oferta} en {ciudad}. Puede escribirnos por WhatsApp para coordinar una valoración o cita."
      ]
    },
    complementos: [
      {
        titulo: "Revisión de lo que necesitas",
        cercano: "Platicamos primero tu caso para darte una opción clara, sin rodeos.",
        profesional: "Evaluación inicial para definir alcance, materiales y tiempos de entrega.",
        formal: "Realizamos un análisis inicial de sus requerimientos antes de iniciar."
      },
      {
        titulo: "Seguimiento hasta terminar",
        cercano: "Te vamos avisando cómo avanza todo hasta que quede listo.",
        profesional: "Comunicación directa en cada etapa del servicio.",
        formal: "Mantenemos comunicación oportuna desde la solicitud hasta la conclusión."
      }
    ],
    beneficios: {
      cercano: [
        "Hablas directo con quien va a hacer el trabajo, sin intermediarios.",
        "Atendemos en {ciudad} y zonas cercanas.",
        "Dejamos claros los tiempos y detalles antes de arrancar.",
        "Si surge alguna duda después, seguimos al pendiente."
      ],
      profesional: [
        "Alcance y fechas definidas por escrito antes de comenzar.",
        "Cobertura local en {ciudad}.",
        "Trato directo y respuesta ágil por WhatsApp.",
        "Cumplimiento puntual en citas y entregas."
      ],
      formal: [
        "Definición clara del alcance y tiempos antes de iniciar cualquier labor.",
        "Atención directa en {ciudad}.",
        "Seguimiento ordenado y trato respetuoso en todo momento.",
        "Compromiso con la puntualidad y la calidad del resultado."
      ]
    },
    faqs: {
      cercano: [
        {
          q: "¿Qué necesito mandarles para empezar?",
          a: "Con una explicación corta de lo que necesitas y en qué zona de {ciudad} estás es suficiente para orientarte."
        },
        {
          q: "¿En qué zonas de {ciudad} atienden?",
          a: "Trabajamos en {ciudad} y alrededores. Escríbenos tu colonia y te confirmamos."
        },
        {
          q: "¿Hay que agendar con días de anticipación?",
          a: "Depende del trabajo, pero casi siempre podemos coordinar espacio en pocos días."
        },
        {
          q: "¿Qué tipo de trabajos hacen en {nombre}?",
          a: "Nos dedicamos a {oferta}. Si tienes un caso particular, cuéntanos y lo revisamos."
        }
      ],
      profesional: [
        {
          q: "¿Cómo solicito información o agenda?",
          a: "Envía un mensaje describiendo tu requerimiento y tu ubicación en {ciudad} para revisar disponibilidad."
        },
        {
          q: "¿Cuál es su cobertura?",
          a: "Prestamos servicio en {ciudad}. Al escribirnos confirmamos cobertura exacta y horarios."
        },
        {
          q: "¿Requiere cita previa?",
          a: "Sí, agendar nos permite asignar el tiempo necesario para atenderte con puntualidad."
        },
        {
          q: "¿Qué servicios cubre {nombre}?",
          a: "Ofrecemos {oferta}, ajustando cada trabajo a la necesidad del cliente."
        }
      ],
      formal: [
        {
          q: "¿Cómo puedo solicitar una valoración o cita?",
          a: "Puede enviarnos un mensaje con una breve descripción de su necesidad y con gusto coordinaremos los pasos siguientes."
        },
        {
          q: "¿En qué ciudad prestan servicios?",
          a: "Atendemos en {ciudad}. Al comunicarse le confirmaremos disponibilidad en su zona."
        },
        {
          q: "¿Se trabaja mediante cita programada?",
          a: "Sí, programar con anticipación garantiza una atención puntual y dedicada."
        },
        {
          q: "¿Cuáles son sus servicios principales?",
          a: "Ponemos a su disposición {oferta}."
        }
      ]
    }
  },

  "salud y belleza": {
    introduccion: {
      cercano: [
        "En {nombre} te atendemos en {ciudad} con {oferta}. Si quieres apartar tu cita o preguntar qué horarios hay libres, mándanos mensaje y lo vemos rápido.",
        "En {nombre}, aquí en {ciudad}, nos especializamos en {oferta}. Escríbenos por WhatsApp para ver espacios disponibles esta semana."
      ],
      profesional: [
        "{nombre} brinda atención en {ciudad} enfocada en {oferta}. Trabajamos con citas organizadas para respetar tu horario.",
        "En {nombre} te ofrecemos {oferta} en {ciudad}, con agenda organizada y confirmación directa por WhatsApp."
      ],
      formal: [
        "En {nombre} ofrecemos {oferta} en {ciudad}. Atendemos mediante citas programadas en un espacio limpio, tranquilo y puntual.",
        "{nombre} le atiende en {ciudad} con {oferta}. Puede solicitar su cita por WhatsApp para elegir el horario de su conveniencia."
      ]
    },
    complementos: [
      {
        titulo: "Recomendación antes de empezar",
        cercano: "Primero platicamos qué traes en mente para dejar el resultado justo como te gusta.",
        profesional: "Valoración breve previa para elegir la técnica o cuidado más adecuado.",
        formal: "Realizamos una valoración previa para recomendarle el cuidado más conveniente."
      },
      {
        titulo: "Citas sin esperas largas",
        cercano: "Apartas tu hora por WhatsApp y te pasamos puntual, sin perder la tarde esperando.",
        profesional: "Agenda controlada para brindar atención dedicada en cada horario.",
        formal: "Manejamos agenda programada para respetar su tiempo en cada visita."
      }
    ],
    beneficios: {
      cercano: [
        "Lugar limpio, tranquilo y con trato amable en {ciudad}.",
        "Agendas o cambias tu cita rápido desde WhatsApp.",
        "Te dedicamos el tiempo necesario, sin andar a las carreras.",
        "Te damos consejos sencillos para cuidar tu resultado en casa."
      ],
      profesional: [
        "Higiene cuidada y material preparado para cada persona.",
        "Horarios organizados en {ciudad} para evitar esperas.",
        "Asesoría honesta según tus preferencias y cuidados.",
        "Confirmación clara de cita y ubicación por mensaje."
      ],
      formal: [
        "Espacio higienizado y atención cuidadosa en {ciudad}.",
        "Puntualidad en cada cita programada.",
        "Orientación profesional antes y después de la sesión.",
        "Trato respetuoso y personalizado."
      ]
    },
    faqs: {
      cercano: [
        {
          q: "¿Cómo aparto una cita?",
          a: "Mándanos mensaje diciendo qué te quieres hacer y qué día te acomoda, y te pasamos los horarios libres."
        },
        {
          q: "¿En qué parte de {ciudad} están?",
          a: "En cuanto confirmemos tu cita te mandamos la dirección exacta y referencias para llegar fácil."
        },
        {
          q: "¿Atienden sin cita?",
          a: "Es mejor apartar antes para asegurarte lugar, aunque puedes preguntar por mensaje si quedó algún espacio hoy."
        },
        {
          q: "¿Qué hacen en {nombre}?",
          a: "Nos especializamos en {oferta}. Si no sabes cuál opción te conviene, te orientamos antes."
        }
      ],
      profesional: [
        {
          q: "¿Cómo reservo un horario?",
          a: "Escribe el servicio de tu interés y el día preferido por WhatsApp para confirmar espacio disponible."
        },
        {
          q: "¿Dónde se ubican?",
          a: "Atendemos en {ciudad}. Al agendar recibirás ubicación exacta y recomendaciones previas si aplican."
        },
        {
          q: "¿Puedo cambiar mi cita si surge algo?",
          a: "Sí, solo avísanos con anticipación por mensaje para asignarte otro horario."
        },
        {
          q: "¿Qué servicios ofrecen en {nombre}?",
          a: "Contamos con {oferta}."
        }
      ],
      formal: [
        {
          q: "¿Cómo puedo programar una cita?",
          a: "Puede escribirnos indicando el servicio deseado y su disponibilidad para confirmarle un horario."
        },
        {
          q: "¿Cuál es su ubicación en {ciudad}?",
          a: "Brindamos atención en {ciudad}. Al confirmar su cita le compartiremos dirección exacta y detalles."
        },
        {
          q: "¿Es posible reagendar una cita?",
          a: "Sí, le agradecemos avisarnos con anticipación para reubicar su cita en el horario que prefiera."
        },
        {
          q: "¿Qué servicios realizan?",
          a: "Ofrecemos {oferta}, con atención dedicada a cada persona."
        }
      ]
    }
  },

  "taller u oficio": {
    introduccion: {
      cercano: [
        "En {nombre} hacemos {oferta} aquí en {ciudad}. Si necesitas revisar una falla o cotizar un trabajo, mándanos un WhatsApp y te orientamos directo.",
        "En {nombre} trabajamos {oferta} en {ciudad}. Cuéntanos por WhatsApp qué necesitas y coordinamos revisión sin rodeos."
      ],
      profesional: [
        "{nombre} realiza trabajos de {oferta} en {ciudad}. Revisamos cada caso antes de empezar para explicar con claridad qué se requiere.",
        "En {nombre} atendemos trabajos de {oferta} en {ciudad}, con diagnóstico claro y fechas de entrega definidas."
      ],
      formal: [
        "En {nombre} ofrecemos trabajos de {oferta} en {ciudad}. Realizamos una revisión previa para informarle con precisión el procedimiento y tiempos.",
        "{nombre} pone a su servicio trabajos de {oferta} en {ciudad}, con seriedad, diagnóstico claro y cumplimiento en los plazos."
      ]
    },
    complementos: [
      {
        titulo: "Revisión y diagnóstico",
        cercano: "Primero revisamos bien qué tiene y te explicamos sin términos complicados qué conviene hacer.",
        profesional: "Inspección inicial para detectar el origen del problema y definir la reparación.",
        formal: "Efectuamos una valoración inicial para exponerle con claridad el trabajo necesario."
      },
      {
        titulo: "Acabado limpio y entrega a tiempo",
        cercano: "Cuidamos tus cosas o tu espacio y te avisamos en cuanto el trabajo queda listo.",
        profesional: "Ejecución ordenada, cuidado de materiales y cumplimiento de fechas acordadas.",
        formal: "Trabajamos con orden, cuidado en los acabados y apego a los tiempos acordados."
      }
    ],
    beneficios: {
      cercano: [
        "Te explicamos con claridad qué se va a hacer antes de meter mano.",
        "Trabajo bien hecho, sin parches que fallen a la semana.",
        "Atención directa en {ciudad}, hablando con quien realiza el trabajo.",
        "Avisamos avances y entregamos en el día acordado."
      ],
      profesional: [
        "Diagnóstico claro previo a cualquier intervención.",
        "Enfoque en seguridad, durabilidad y buen acabado.",
        "Atención directa en {ciudad}.",
        "Acuerdos transparentes en tiempos y alcance del trabajo."
      ],
      formal: [
        "Experiencia y seriedad en cada trabajo realizado en {ciudad}.",
        "Explicación precisa del procedimiento antes de comenzar.",
        "Cuidado en materiales, limpieza y acabados.",
        "Cumplimiento responsable de los plazos acordados."
      ]
    },
    faqs: {
      cercano: [
        {
          q: "¿Cómo les explico lo que necesito?",
          a: "Mándanos mensaje contándonos qué falló o qué quieres hacer; si ayuda, puedes mandar foto por WhatsApp."
        },
        {
          q: "¿En qué partes de {ciudad} trabajan?",
          a: "Damos servicio en {ciudad}. Dinos en qué colonia estás y te confirmamos disponibilidad."
        },
        {
          q: "¿Me dicen cuánto tarda antes de empezar?",
          a: "Sí, revisando el trabajo te decimos exactamente qué se ocupa y en cuánto tiempo queda."
        },
        {
          q: "¿Qué trabajos hacen en {nombre}?",
          a: "Hacemos {oferta}. Si tienes un trabajo a la medida, pregúntanos."
        }
      ],
      profesional: [
        {
          q: "¿Cómo solicito una revisión?",
          a: "Escribe por WhatsApp describiendo el trabajo requerido y tu ubicación en {ciudad} para agendar."
        },
        {
          q: "¿Cuál es su área de atención?",
          a: "Atendemos en {ciudad} y zonas cercanas según programación."
        },
        {
          q: "¿Informan el tiempo estimado antes de iniciar?",
          a: "Sí, tras la revisión te confirmamos el alcance y la fecha estimada de entrega."
        },
        {
          q: "¿En qué trabajos se especializan?",
          a: "Nos especializamos en {oferta}."
        }
      ],
      formal: [
        {
          q: "¿Cómo puedo solicitar una valoración?",
          a: "Puede escribirnos describiendo el trabajo que requiere y con gusto coordinaremos la revisión."
        },
        {
          q: "¿En qué ciudad brindan servicio?",
          a: "Atendemos en {ciudad}. Al contactarnos le confirmaremos cobertura en su zona."
        },
        {
          q: "¿Detallan el procedimiento antes de comenzar?",
          a: "Sí, antes de iniciar le explicamos claramente qué se realizará y el tiempo estimado."
        },
        {
          q: "¿Qué tipo de trabajos realizan en {nombre}?",
          a: "Realizamos {oferta}."
        }
      ]
    }
  },

  otro: {
    introduccion: {
      cercano: [
        "En {nombre} ofrecemos {oferta} en {ciudad}. Si tienes alguna duda o quieres pedir información, escríbenos por WhatsApp y te atendemos directo.",
        "En {nombre}, aquí en {ciudad}, contamos con {oferta}. Mándanos WhatsApp y resolvemos tus dudas rápido."
      ],
      profesional: [
        "{nombre} atiende en {ciudad} ofreciendo {oferta}. Puedes escribirnos por WhatsApp para consultar disponibilidad y detalles.",
        "En {nombre} brindamos {oferta} en {ciudad}, con atención clara y directa por WhatsApp."
      ],
      formal: [
        "En {nombre} ponemos a su disposición {oferta} en {ciudad}. Con gusto atenderemos cualquier consulta por WhatsApp.",
        "{nombre} le ofrece {oferta} en {ciudad}. Puede comunicarse por WhatsApp para recibir información detallada."
      ]
    },
    complementos: [
      {
        titulo: "Atención directa por mensaje",
        cercano: "Hablas directo con nosotros para resolver dudas rápido, sin rodeos.",
        profesional: "Comunicación clara para resolver dudas y coordinar tu solicitud.",
        formal: "Mantenemos comunicación directa para atender su solicitud con puntualidad."
      },
      {
        titulo: "Opciones a tu medida",
        cercano: "Si buscas algo un poco distinto, cuéntanos y vemos cómo apoyarte.",
        profesional: "Ajustamos cada propuesta según lo que necesites en ese momento.",
        formal: "Adaptamos nuestra atención a las necesidades particulares de cada cliente."
      }
    ],
    beneficios: {
      cercano: [
        "Trato directo y respuestas claras desde el primer mensaje.",
        "Atención local en {ciudad}.",
        "Te explicamos todo sin complicaciones.",
        "Coordinamos el horario o la entrega que mejor te quede."
      ],
      profesional: [
        "Atención ordenada en {ciudad}.",
        "Información clara sobre disponibilidad y tiempos.",
        "Respuesta oportuna por WhatsApp.",
        "Seguimiento directo hasta concluir tu solicitud."
      ],
      formal: [
        "Atención seria y personalizada en {ciudad}.",
        "Información precisa desde el primer contacto.",
        "Puntualidad en horarios y acuerdos.",
        "Trato respetuoso en todo momento."
      ]
    },
    faqs: {
      cercano: [
        {
          q: "¿Cómo puedo pedir información?",
          a: "Mándanos mensaje contando brevemente qué necesitas y te respondemos en cuanto lo veamos."
        },
        {
          q: "¿En qué ciudad atienden?",
          a: "Estamos en {ciudad}. Al escribirnos te decimos horarios y cómo nos coordinamos."
        },
        {
          q: "¿Qué ofrecen en {nombre}?",
          a: "Ofrecemos {oferta}. Pregúntanos si tienes una duda específica."
        },
        {
          q: "¿Cómo se coordina la atención o entrega?",
          a: "Por WhatsApp acordamos el día y la hora que mejor te funcionen."
        }
      ],
      profesional: [
        {
          q: "¿Cómo solicito detalles de su oferta?",
          a: "Envía tu consulta por WhatsApp y te compartimos opciones y disponibilidad."
        },
        {
          q: "¿Dónde operan?",
          a: "Atendemos en {ciudad}. Al escribirnos te confirmamos horarios y cobertura."
        },
        {
          q: "¿Cuál es su oferta principal?",
          a: "En {nombre} nos enfocamos en {oferta}."
        },
        {
          q: "¿Conviene escribir antes de acudir?",
          a: "Sí, escribir antes nos permite confirmar disponibilidad y atenderte sin contratiempos."
        }
      ],
      formal: [
        {
          q: "¿Cómo puedo comunicarme con {nombre}?",
          a: "Puede enviarnos un mensaje indicando su consulta y le responderemos a la brevedad."
        },
        {
          q: "¿En qué ciudad brindan atención?",
          a: "Atendemos en {ciudad}. Con gusto le indicaremos horarios y detalles al contactarnos."
        },
        {
          q: "¿Qué ofrecen principalmente?",
          a: "Ponemos a su disposición {oferta}."
        },
        {
          q: "¿Cómo se acuerda la atención?",
          a: "Mediante mensaje previo definimos el horario o modalidad más conveniente para usted."
        }
      ]
    }
  }
};

function limpiarDigitosGen(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function limpiarTextoGen(valor) {
  return String(valor || "").replace(/\s+/g, " ").trim();
}

function capitalizarGen(texto) {
  if (!texto) {
    return "";
  }
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function aplicarPlantillaGen(texto, variables) {
  return texto
    .replace(/\{nombre\}/g, variables.nombre)
    .replace(/\{ciudad\}/g, variables.ciudad)
    .replace(/\{oferta\}/g, variables.oferta);
}

function normalizarGiro(texto) {
  const limpio = limpiarTextoGen(texto).toLowerCase();
  if (!limpio) {
    return "";
  }
  if (GIROS_ETIQUETAS[limpio]) {
    return limpio;
  }
  if (/comida|panad|restaur|taquer|caf[eé]|postre|pastel|cocina|fonda|antojit|alimento/.test(limpio)) {
    return "comida";
  }
  if (/tienda|ropa|abarrote|papel|regalo|boutique|venta|comercio|calzado|zapater/.test(limpio)) {
    return "tienda";
  }
  if (/salud|belleza|est[eé]tica|barber|u[nñ]as|spa|dental|consult|cl[ií]nica|sal[oó]n|masaje/.test(limpio)) {
    return "salud y belleza";
  }
  if (/taller|oficio|mec[aá]n|plomer|electric|carpint|herrer|reparaci|t[eé]cnico/.test(limpio)) {
    return "taller u oficio";
  }
  if (/servicio|asesor|contab|limpieza|flete|mudanza|fotograf|dise[nñ]|clase|curso|mantenimiento/.test(limpio)) {
    return "servicios";
  }
  if (/otro|otra/.test(limpio)) {
    return "otro";
  }
  return "";
}

function normalizarTono(texto) {
  const limpio = limpiarTextoGen(texto).toLowerCase();
  if (!limpio) {
    return "";
  }
  if (/cercan|amig|t[uú]|calid/.test(limpio)) {
    return "cercano";
  }
  if (/profesional|direct|claro|serio/.test(limpio)) {
    return "profesional";
  }
  if (/formal|usted|elegante|institucional/.test(limpio)) {
    return "formal";
  }
  return "";
}

function extraerServiciosGen(oferta, giro, tono, variante) {
  const perfil = PERFILES_GIRO[giro] || PERFILES_GIRO.otro;
  const textoLimpio = limpiarTextoGen(oferta).replace(/[.]+$/, "");

  let partes = textoLimpio
    .split(/[\n;,\u2022]+/)
    .map((parte) => limpiarTextoGen(parte).replace(/^[-*]\s*/, ""))
    .filter((parte) => parte.length >= 2);

  if (partes.length === 1 && /\s+y\s+/i.test(partes[0])) {
    const divididas = partes[0]
      .split(/\s+y\s+/i)
      .map((parte) => limpiarTextoGen(parte))
      .filter((parte) => parte.length >= 4);
    if (divididas.length >= 2) {
      partes = divididas;
    }
  }

  const unicos = [];
  const vistos = new Set();
  for (const item of partes) {
    const clave = item.toLowerCase();
    if (!vistos.has(clave)) {
      vistos.add(clave);
      unicos.push(capitalizarGen(item));
    }
    if (unicos.length >= 6) {
      break;
    }
  }

  const descripciones = {
    cercano: [
      (t) => `Disponible al día. Si quieres apartar ${t}, escríbenos antes de pasar.`,
      (t) => `Manejamos ${t} según lo que necesites; pregunta por opciones del día.`,
      (t) => `Te orientamos rápido por mensaje para elegir ${t}.`,
      (t) => `Puedes pedir ${t} directo por WhatsApp sin dar vueltas.`
    ],
    profesional: [
      (t) => `Disponible bajo consulta de existencias o agenda previa para ${t}.`,
      (t) => `Atención directa para ${t}, con tiempos claros desde el inicio.`,
      (t) => `Opciones en ${t} adaptadas a lo que requieras.`,
      (t) => `Consulta disponibilidad y detalles de ${t} por mensaje.`
    ],
    formal: [
      (t) => `Ponemos a su disposición ${t}, con información clara sobre disponibilidad.`,
      (t) => `Atendemos su solicitud de ${t} con puntualidad y trato directo.`,
      (t) => `Con gusto le brindamos detalles sobre ${t} por WhatsApp.`,
      (t) => `Servicio dedicado en ${t}, conforme a sus requerimientos.`
    ]
  };

  const listaPlantillas = descripciones[tono] || descripciones.profesional;
  const desplazamiento = Math.abs(Number(variante) || 0);

  const servicios = unicos.map((item, indice) => {
    const itemMinuscula = item.charAt(0).toLowerCase() + item.slice(1);
    const generarDesc = listaPlantillas[(indice + desplazamiento) % listaPlantillas.length];
    return {
      titulo: item,
      descripcion: generarDesc(itemMinuscula)
    };
  });

  if (servicios.length < 3) {
    for (const comp of perfil.complementos) {
      if (servicios.length >= 3) {
        break;
      }
      servicios.push({
        titulo: comp.titulo,
        descripcion: comp[tono] || comp.profesional
      });
    }
  }

  return servicios;
}

function construirMensajeWhatsappNegocioGen(nombre, tono) {
  if (tono === "cercano") {
    return `Hola, vi la página de ${nombre} y quiero pedir información.`;
  }
  if (tono === "formal") {
    return `Buen día, me comunico con ${nombre} para solicitar información.`;
  }
  return `Hola, me comunico desde la página de ${nombre} para pedir informes.`;
}

function construirTituloGen(nombre, ciudad, ofertaLimpia, giro, tono, variante) {
  const primeraParte = limpiarTextoGen(ofertaLimpia.split(/[\n;,]+/)[0] || "");
  const ofertaCorta = primeraParte.length >= 4 && primeraParte.length <= 36 ? primeraParte : "";
  const v = Math.abs(Number(variante) || 0) % 2;

  if (ofertaCorta) {
    const fraseOferta = ofertaCorta.charAt(0).toLowerCase() + ofertaCorta.slice(1);
    if (v === 1) {
      return `${capitalizarGen(fraseOferta)} en ${ciudad} con ${nombre}`;
    }
    if (tono === "formal") {
      return `${nombre}, ${fraseOferta} en ${ciudad}`;
    }
    return `${nombre}: ${fraseOferta} en ${ciudad}`;
  }

  const etiquetaGiro = (GIROS_ETIQUETAS[giro] || "negocio").toLowerCase();
  if (v === 1) {
    return `${nombre} en ${ciudad}`;
  }
  if (tono === "formal") {
    return `${nombre}, atención en ${ciudad}`;
  }
  return `${nombre} en ${ciudad}, ${etiquetaGiro}`;
}

function generarBorradorNegocio(datos, variante) {
  const v = Math.abs(Number(variante) || 0);
  const nombre = limpiarTextoGen(datos.nombre);
  const giro = PERFILES_GIRO[datos.giro] ? datos.giro : "otro";
  const ciudad = limpiarTextoGen(datos.ciudad);
  const oferta = limpiarTextoGen(datos.oferta);
  const tono = TONOS_ETIQUETAS[datos.tono] ? datos.tono : "cercano";
  const whatsapp = limpiarDigitosGen(datos.whatsapp);

  const perfil = PERFILES_GIRO[giro];
  const ofertaLimpia = oferta.replace(/[.]+$/, "");
  const variables = {
    nombre,
    ciudad,
    oferta: ofertaLimpia.charAt(0).toLowerCase() + ofertaLimpia.slice(1)
  };

  const listaIntros = perfil.introduccion[tono] || perfil.introduccion.cercano;
  const plantillaIntro = listaIntros[v % listaIntros.length];

  const titulo = construirTituloGen(nombre, ciudad, ofertaLimpia, giro, tono, v);
  const presentacion = aplicarPlantillaGen(plantillaIntro, variables);
  const servicios = extraerServiciosGen(ofertaLimpia, giro, tono, v);

  const beneficiosBase = perfil.beneficios[tono].map((texto) =>
    aplicarPlantillaGen(texto, variables)
  );
  const beneficios =
    v % 2 === 1 && beneficiosBase.length > 1
      ? beneficiosBase.slice(1).concat(beneficiosBase[0])
      : beneficiosBase;

  const preguntasFrecuentes = perfil.faqs[tono].map((item) => ({
    pregunta: aplicarPlantillaGen(item.q, variables),
    respuesta: aplicarPlantillaGen(item.a, variables)
  }));

  const mensajeWhatsapp = construirMensajeWhatsappNegocioGen(nombre, tono);

  return {
    titulo,
    presentacion,
    servicios,
    beneficios,
    preguntasFrecuentes,
    mensajeWhatsapp,
    whatsapp,
    variante: v
  };
}

function formatearBorradorTextoPlano(datos, borrador) {
  const lineas = [];
  lineas.push(borrador.titulo);
  lineas.push("");
  lineas.push(borrador.presentacion);
  lineas.push("");
  lineas.push("Servicios:");
  borrador.servicios.forEach((s) => {
    lineas.push(`- ${s.titulo}${s.descripcion ? ": " + s.descripcion : ""}`);
  });
  lineas.push("");
  lineas.push("Beneficios:");
  borrador.beneficios.forEach((b) => {
    lineas.push(`- ${b}`);
  });
  lineas.push("");
  lineas.push("Preguntas frecuentes:");
  borrador.preguntasFrecuentes.forEach((f) => {
    lineas.push(`${f.pregunta}`);
    lineas.push(`${f.respuesta}`);
    lineas.push("");
  });
  const wa = limpiarDigitosGen(datos.whatsapp);
  if (wa) {
    lineas.push(`WhatsApp: https://wa.me/${wa}?text=${encodeURIComponent(borrador.mensajeWhatsapp)}`);
  } else {
    lineas.push("WhatsApp: pendiente de agregar.");
  }
  return lineas.join("\n").trim();
}

function construirUrlPublicada(slug) {
  if (DOMINIO_PUBLICACION_DMD) {
    const base = DOMINIO_PUBLICACION_DMD.replace(/\/+$/, "");
    return `${base}/ver.html?id=${encodeURIComponent(slug)}`;
  }
  try {
    const url = new URL("ver.html", window.location.href);
    url.searchParams.set("id", slug);
    return url.toString();
  } catch (error) {
    return `ver.html?id=${encodeURIComponent(slug)}`;
  }
}

function crearSlugPublicacion(nombre) {
  const base = limpiarTextoGen(nombre)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "pagina";
  const sufijo = Math.random().toString(36).slice(2, 6);
  return `${base}-${sufijo}`;
}

window.dmdGenerador = {
  DOMINIO_PUBLICACION_DMD,
  GIROS_ETIQUETAS,
  TONOS_ETIQUETAS,
  limpiarTexto: limpiarTextoGen,
  limpiarDigitos: limpiarDigitosGen,
  normalizarGiro,
  normalizarTono,
  generarBorrador: generarBorradorNegocio,
  formatearTextoPlano: formatearBorradorTextoPlano,
  construirUrlPublicada,
  crearSlugPublicacion,
  construirUrlWhatsapp(numero, mensaje) {
    const limpio = limpiarDigitosGen(numero);
    if (!limpio) {
      return "";
    }
    return `https://wa.me/${limpio}?text=${encodeURIComponent(mensaje)}`;
  }
};
