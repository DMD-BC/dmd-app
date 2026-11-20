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

/* Catálogo inicial extensible de fotos reales para portada (URLs directas
   estables, sin clave de API). Es un punto de partida abierto: cuando el
   usuario escribe cualquier otro giro, la selección analiza sinónimos y
   palabras clave del giro escrito, el nombre y la oferta. */
const PORTADAS_POR_GIRO = {
  taqueria: {
    etiqueta: "Taquería",
    sinonimos: ["taqueria", "tacos", "taco", "taquitos", "antojitos", "birria", "birrieria", "barbacoa", "carnitas", "suadero", "pastor", "asada", "loncheria", "torteria", "tortas"],
    palabras: ["taco", "taqueria", "pastor", "asada", "birria", "barbacoa", "carnitas", "suadero", "gringa", "salsa", "antojito", "torta", "gordita", "sope", "huarache", "quesabirria"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/8448339/pexels-photo-8448339.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Tacos tradicionales mexicanos"
      },
      {
        url: "https://images.pexels.com/photos/5848714/pexels-photo-5848714.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Tacos con guacamole y acompañamientos"
      },
      {
        url: "https://images.pexels.com/photos/19453402/pexels-photo-19453402.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Tacos recién preparados"
      }
    ]
  },
  panaderia: {
    etiqueta: "Panadería y repostería",
    sinonimos: ["panaderia", "pan", "pasteleria", "reposteria", "postres", "pasteles", "panificadora", "boulangerie"],
    palabras: ["pan", "panaderia", "bolillo", "concha", "cuernito", "pastel", "pasteleria", "reposteria", "postre", "galleta", "dona", "cupcake", "horneado", "bizcocho", "rosca", "pay"],
    fotos: [
      {
        url: "img/panaderia-portada.jpg",
        etiqueta: "Panadería con pan recién horneado"
      },
      {
        url: "https://images.pexels.com/photos/14363849/pexels-photo-14363849.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Vitrina de pan dulce y repostería"
      },
      {
        url: "https://images.pexels.com/photos/30826794/pexels-photo-30826794.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Surtido artesanal de pan"
      }
    ]
  },
  cafeteria: {
    etiqueta: "Cafetería",
    sinonimos: ["cafeteria", "cafe", "barra de cafe", "coffee shop", "expreso", "te", "teteria", "bebidas"],
    palabras: ["cafe", "cafeteria", "espresso", "latte", "capuchino", "americano", "frappe", "matcha", "barista", "te", "infusion", "cold brew", "molido"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/36729739/pexels-photo-36729739.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Barra de cafetería local"
      },
      {
        url: "https://images.pexels.com/photos/10497545/pexels-photo-10497545.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Preparación de café artesanal"
      },
      {
        url: "https://images.pexels.com/photos/32258174/pexels-photo-32258174.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Estación de café de especialidad"
      }
    ]
  },
  dulceria: {
    etiqueta: "Dulcería",
    sinonimos: ["dulceria", "dulces", "chocolateria", "botanas", "golosinas", "pinateria", "confiteria", "heladeria", "paleteria", "neveria"],
    palabras: ["dulce", "dulceria", "chocolate", "gomita", "paleta", "caramelo", "botana", "pinata", "chamoys", "tamarindo", "golosina", "nieve", "helado"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/39889186/pexels-photo-39889186.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Vitrina de chocolates y dulces"
      },
      {
        url: "https://images.pexels.com/photos/35285845/pexels-photo-35285845.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Exhibición de dulcería tradicional"
      },
      {
        url: "https://images.pexels.com/photos/35798654/pexels-photo-35798654.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Surtido de dulces y botanas"
      }
    ]
  },
  carniceria: {
    etiqueta: "Carnicería",
    sinonimos: ["carniceria", "carnes", "polleria", "obrador", "cortes de carne", "pescaderia", "cremeria"],
    palabras: ["carne", "carniceria", "res", "cerdo", "puerco", "pollo", "polleria", "bistec", "arrachera", "chorizo", "costilla", "corte", "molida", "chicharron"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/35023463/pexels-photo-35023463.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Mostrador de carnicería fresca"
      },
      {
        url: "https://images.pexels.com/photos/29834275/pexels-photo-29834275.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Cortes frescos en carnicería"
      },
      {
        url: "https://images.pexels.com/photos/12884549/pexels-photo-12884549.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Exhibidor de cortes de carne"
      }
    ]
  },
  tortilleria: {
    etiqueta: "Tortillería",
    sinonimos: ["tortilleria", "tortillas", "molino", "masa", "nixtamal", "totopos", "tostadas"],
    palabras: ["tortilla", "tortilleria", "masa", "maiz", "nixtamal", "totopo", "tostada", "quesadilla", "harina", "comal", "tamal"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/16821506/pexels-photo-16821506.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Tortillas recién hechas"
      },
      {
        url: "https://images.pexels.com/photos/14930606/pexels-photo-14930606.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Tortillas y antojitos de maíz"
      },
      {
        url: "https://images.pexels.com/photos/28443135/pexels-photo-28443135.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Platillos con tortillas calientes"
      }
    ]
  },
  comida: {
    etiqueta: "Comida y restaurante",
    sinonimos: ["comida", "restaurante", "fonda", "cocina", "cocina economica", "comedor", "marisqueria", "pizzeria", "hamburgueseria", "sushi", "catering"],
    palabras: ["comida", "restaurante", "fonda", "cocina", "platillo", "menu", "desayuno", "almuerzo", "cena", "hamburguesa", "pizza", "marisco", "sushi", "alita", "guisado", "caldo", "banquete"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/6971733/pexels-photo-6971733.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Cocina preparando platillos al momento"
      },
      {
        url: "https://images.pexels.com/photos/7624679/pexels-photo-7624679.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Mesa con platillos recién servidos"
      },
      {
        url: "https://images.pexels.com/photos/13485216/pexels-photo-13485216.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Variedad de comida en restaurante"
      }
    ]
  },
  fruteria: {
    etiqueta: "Frutería y verdulería",
    sinonimos: ["fruteria", "verduleria", "frutas", "verduras", "abarrotes", "minisuper", "miscelanea", "mercado", "recauderia", "organico"],
    palabras: ["fruta", "verdura", "fruteria", "verduleria", "abarrotes", "aguacate", "tomate", "naranja", "limon", "fresco", "semilla", "granel", "minisuper", "despensa"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/33975355/pexels-photo-33975355.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Frutas y verduras frescas"
      },
      {
        url: "https://images.pexels.com/photos/36033532/pexels-photo-36033532.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Puesto de productos frescos del día"
      },
      {
        url: "https://images.pexels.com/photos/11831458/pexels-photo-11831458.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Surtido de frutería local"
      }
    ]
  },
  ferreteria: {
    etiqueta: "Ferretería",
    sinonimos: ["ferreteria", "tlapaleria", "herramientas", "materiales", "tornilleria", "cerrajeria", "pinturas"],
    palabras: ["ferreteria", "tlapaleria", "herramienta", "martillo", "taladro", "tornillo", "clavo", "llave", "pinza", "desarmador", "tubo", "cemento", "pintura", "candado", "cerradura", "cerrajeria"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/33000620/pexels-photo-33000620.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Herramientas organizadas en ferretería"
      },
      {
        url: "https://images.pexels.com/photos/175039/pexels-photo-175039.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Surtido de herramientas manuales"
      },
      {
        url: "https://images.pexels.com/photos/5194861/pexels-photo-5194861.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Llaves, pinzas y equipo de ferretería"
      }
    ]
  },
  farmacia: {
    etiqueta: "Farmacia",
    sinonimos: ["farmacia", "botica", "medicamentos", "drogueria", "herbolaria", "naturista"],
    palabras: ["farmacia", "medicamento", "medicina", "vitamina", "receta", "suplemento", "curacion", "botica", "generico", "patente", "inyectable"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/13119976/pexels-photo-13119976.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Atención en mostrador de farmacia"
      },
      {
        url: "https://images.pexels.com/photos/13119975/pexels-photo-13119975.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Anaqueles de medicamentos en farmacia"
      },
      {
        url: "https://images.pexels.com/photos/3652750/pexels-photo-3652750.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Sección de farmacia y recetas"
      }
    ]
  },
  papeleria: {
    etiqueta: "Papelería",
    sinonimos: ["papeleria", "utiles", "libreria", "copias", "imprenta", "ciber", "merceria"],
    palabras: ["papeleria", "cuaderno", "libreta", "lapiz", "pluma", "utiles", "copia", "impresion", "engargolado", "enmicado", "cartulina", "mochila", "libro", "oficina", "escolar"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/7054754/pexels-photo-7054754.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Útiles escolares y artículos de papelería"
      },
      {
        url: "https://images.pexels.com/photos/28503361/pexels-photo-28503361.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Cuadernos, colores y material escolar"
      },
      {
        url: "https://images.pexels.com/photos/5088017/pexels-photo-5088017.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Libretas y artículos de escritorio"
      }
    ]
  },
  estetica: {
    etiqueta: "Salón y estética",
    sinonimos: ["estetica", "salon", "salon de belleza", "belleza", "unas", "manicure", "pedicure", "maquillaje", "peluqueria", "estudio de belleza"],
    palabras: ["estetica", "salon", "cabello", "tinte", "mecha", "alaciado", "peinado", "una", "gelish", "acrilico", "manicure", "pedicure", "maquillaje", "ceja", "pestana", "belleza"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/1654834/pexels-photo-1654834.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Interior de salón de belleza"
      },
      {
        url: "https://images.pexels.com/photos/4783330/pexels-photo-4783330.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Estilismo y cuidado del cabello"
      },
      {
        url: "https://images.pexels.com/photos/30866297/pexels-photo-30866297.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Estaciones de atención en estética"
      }
    ]
  },
  barberia: {
    etiqueta: "Barbería",
    sinonimos: ["barberia", "barber", "barber shop", "peluqueria caballeros", "barba"],
    palabras: ["barber", "barberia", "barba", "fade", "desvanecido", "navaja", "afeitado", "caballero", "bigote", "corte"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/1813272/pexels-photo-1813272.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Cortes y atención en barbería"
      },
      {
        url: "https://images.pexels.com/photos/4969838/pexels-photo-4969838.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Sillas y espacio de barbería"
      },
      {
        url: "https://images.pexels.com/photos/8867163/pexels-photo-8867163.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Barbero en estación de corte"
      }
    ]
  },
  "taller mecanico": {
    etiqueta: "Taller mecánico",
    sinonimos: ["taller mecanico", "mecanico", "mecanica", "automotriz", "llantera", "vulcanizadora", "hojalateria", "autolavado", "refaccionaria", "motos"],
    palabras: ["mecanico", "mecanica", "auto", "carro", "coche", "vehiculo", "motor", "freno", "afinacion", "aceite", "suspension", "llanta", "alineacion", "balanceo", "hojalateria", "transmision", "escaner", "moto"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/4489743/pexels-photo-4489743.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Servicio automotriz en taller mecánico"
      },
      {
        url: "https://images.pexels.com/photos/33814734/pexels-photo-33814734.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Interior de taller de mantenimiento automotriz"
      },
      {
        url: "https://images.pexels.com/photos/8986130/pexels-photo-8986130.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Revisión y diagnóstico de vehículo"
      }
    ]
  },
  lavanderia: {
    etiqueta: "Lavandería y tintorería",
    sinonimos: ["lavanderia", "tintoreria", "planchaduria", "lavado"],
    palabras: ["lavanderia", "tintoreria", "lavado", "secado", "planchado", "edredon", "prenda", "traje", "vestido", "ropa limpia", "autoservicio"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/4700388/pexels-photo-4700388.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Lavadoras en lavandería moderna"
      },
      {
        url: "https://images.pexels.com/photos/8774444/pexels-photo-8774444.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Servicio de lavado de prendas"
      },
      {
        url: "https://images.pexels.com/photos/4700410/pexels-photo-4700410.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Equipos de lavado y secado"
      }
    ]
  },
  "tienda de ropa": {
    etiqueta: "Tienda de ropa y boutique",
    sinonimos: ["tienda de ropa", "boutique", "ropa", "moda", "vestidos", "sastreria", "bordados"],
    palabras: ["ropa", "boutique", "moda", "blusa", "camisa", "pantalon", "vestido", "chamarra", "jeans", "prenda", "talla", "coleccion", "bolsa", "sastreria"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/5865196/pexels-photo-5865196.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Exhibición de prendas en boutique"
      },
      {
        url: "https://images.pexels.com/photos/37080678/pexels-photo-37080678.jpeg?auto=compress&cs=tinysrgb&w=1200&h=750&fit=crop",
        etiqueta: "Interior moderno de tienda de ropa"
      },
      {
        url: "https://images.pexels.com/photos/18699669/pexels-photo-18699669.jpeg?auto=compress&cs=tinysrgb&w=1200&h=750&fit=crop",
        etiqueta: "Selección de moda y accesorios"
      }
    ]
  },
  zapateria: {
    etiqueta: "Zapatería",
    sinonimos: ["zapateria", "calzado", "zapatos", "tenis", "botas"],
    palabras: ["zapato", "zapateria", "calzado", "tenis", "bota", "sandalia", "tacon", "piel", "suela", "deportivo", "huarache"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/5863630/pexels-photo-5863630.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Exhibidor de calzado en zapatería"
      },
      {
        url: "https://images.pexels.com/photos/5531542/pexels-photo-5531542.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Calzado y accesorios en boutique"
      },
      {
        url: "https://images.pexels.com/photos/29090887/pexels-photo-29090887.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Botas y zapatos en exhibición"
      }
    ]
  },
  floreria: {
    etiqueta: "Florería",
    sinonimos: ["floreria", "flores", "vivero", "plantas", "jardineria", "arreglos florales"],
    palabras: ["flor", "floreria", "ramo", "rosa", "girasol", "tulipan", "arreglo", "planta", "maceta", "vivero", "bouquet", "corona", "centro de mesa"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/5414337/pexels-photo-5414337.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Mostrador de florería con arreglos"
      },
      {
        url: "https://images.pexels.com/photos/6912882/pexels-photo-6912882.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Ramo de rosas recién armado"
      },
      {
        url: "https://images.pexels.com/photos/5414331/pexels-photo-5414331.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Preparación de arreglos florales"
      }
    ]
  },
  veterinaria: {
    etiqueta: "Veterinaria y mascotas",
    sinonimos: ["veterinaria", "clinica veterinaria", "mascotas", "estetica canina", "pet shop", "forrajera"],
    palabras: ["veterinaria", "veterinario", "mascota", "perro", "gato", "vacuna", "desparasitacion", "estetica canina", "bano de perro", "croqueta", "alimento para mascota", "cachorro"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/6816859/pexels-photo-6816859.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Consulta veterinaria para mascotas"
      },
      {
        url: "https://images.pexels.com/photos/6234622/pexels-photo-6234622.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Revisión de salud canina en veterinaria"
      },
      {
        url: "https://images.pexels.com/photos/7470754/pexels-photo-7470754.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Atención profesional en clínica veterinaria"
      }
    ]
  },
  gimnasio: {
    etiqueta: "Gimnasio y entrenamiento",
    sinonimos: ["gimnasio", "gym", "fitness", "crossfit", "yoga", "pilates", "entrenamiento", "box", "artes marciales", "deportes"],
    palabras: ["gimnasio", "gym", "pesa", "mancuerna", "entrenamiento", "entrenador", "cardio", "crossfit", "yoga", "pilates", "box", "funcional", "rutina", "musculacion", "fitness"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/31015145/pexels-photo-31015145.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Área de pesas y mancuernas en gimnasio"
      },
      {
        url: "https://images.pexels.com/photos/32610333/pexels-photo-32610333.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Equipo de entrenamiento funcional"
      },
      {
        url: "https://images.pexels.com/photos/3916766/pexels-photo-3916766.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Zona de fuerza y acondicionamiento"
      }
    ]
  },
  muebleria: {
    etiqueta: "Mueblería",
    sinonimos: ["muebleria", "muebles", "decoracion", "colchones", "hogar", "tapiceria"],
    palabras: ["mueble", "muebleria", "sala", "sofa", "sillon", "comedor", "recamara", "colchon", "mesa", "silla", "ropero", "closet", "decoracion", "tapiceria"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/6969830/pexels-photo-6969830.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Exhibición de salas y muebles"
      },
      {
        url: "https://images.pexels.com/photos/6758238/pexels-photo-6758238.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Muebles modernos para el hogar"
      },
      {
        url: "https://images.pexels.com/photos/7535062/pexels-photo-7535062.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Showroom de recámaras y decoración"
      }
    ]
  },
  joyeria: {
    etiqueta: "Joyería y relojería",
    sinonimos: ["joyeria", "relojeria", "bisuteria", "plateria", "joyas"],
    palabras: ["joya", "joyeria", "anillo", "collar", "pulsera", "arete", "oro", "plata", "diamante", "compromiso", "argolla", "reloj", "relojeria", "bisuteria"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/32610505/pexels-photo-32610505.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Colección de joyería fina"
      },
      {
        url: "https://images.pexels.com/photos/35187488/pexels-photo-35187488.jpeg?auto=compress&cs=tinysrgb&w=1200&h=750&fit=crop",
        etiqueta: "Anillos en vitrina de joyería"
      },
      {
        url: "https://images.pexels.com/photos/33569933/pexels-photo-33569933.jpeg?auto=compress&cs=tinysrgb&w=1200&h=750&fit=crop",
        etiqueta: "Collares y piezas de oro"
      }
    ]
  },
  optica: {
    etiqueta: "Óptica",
    sinonimos: ["optica", "lentes", "optometria", "oftalmologia"],
    palabras: ["optica", "lente", "armazon", "anteojo", "graduacion", "examen de la vista", "vista", "miopia", "astigmatismo", "lentes de contacto", "solares"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/5752258/pexels-photo-5752258.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Selección de armazones en óptica"
      },
      {
        url: "https://images.pexels.com/photos/5766162/pexels-photo-5766162.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Asesoría para elegir lentes"
      },
      {
        url: "https://images.pexels.com/photos/32593246/pexels-photo-32593246.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Exhibición de lentes en tienda óptica"
      }
    ]
  },
  "salud y belleza": {
    etiqueta: "Salud y bienestar",
    sinonimos: ["salud y belleza", "salud", "clinica", "consultorio", "dental", "dentista", "odontologia", "spa", "masajes", "fisioterapia", "psicologia", "nutricion", "laboratorio"],
    palabras: ["dental", "dentista", "odontologia", "ortodoncia", "clinica", "consultorio", "medico", "doctor", "salud", "spa", "masaje", "facial", "relajacion", "fisioterapia", "psicologia", "nutricion", "terapia", "laboratorio"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/18524125/pexels-photo-18524125.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Atención profesional en clínica y consultorio"
      },
      {
        url: "https://images.pexels.com/photos/5659008/pexels-photo-5659008.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Sesión de spa y bienestar"
      },
      {
        url: "https://images.pexels.com/photos/6187287/pexels-photo-6187287.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Cuidado facial y relajación"
      }
    ]
  },
  servicios: {
    etiqueta: "Servicios",
    sinonimos: ["servicios", "asesoria", "contabilidad", "despacho", "consultoria", "limpieza", "fotografia", "diseno", "clases", "cursos", "escuela", "academia", "eventos", "fletes", "mudanza", "inmobiliaria", "seguros"],
    palabras: ["asesoria", "contabilidad", "contador", "abogado", "legal", "consultoria", "seguro", "finanza", "inmobiliaria", "limpieza", "fumigacion", "fotografia", "video", "diseno", "marketing", "clase", "curso", "academia", "evento", "flete", "mudanza", "envio"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/8301240/pexels-photo-8301240.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Atención y asesoría personalizada"
      },
      {
        url: "https://images.pexels.com/photos/4506937/pexels-photo-4506937.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Estudio creativo y servicios profesionales"
      },
      {
        url: "https://images.pexels.com/photos/3768914/pexels-photo-3768914.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Servicios para el hogar y mantenimiento"
      },
      {
        url: "https://images.pexels.com/photos/8301225/pexels-photo-8301225.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Equipo de trabajo y consultoría"
      }
    ]
  },
  "taller u oficio": {
    etiqueta: "Taller u oficio",
    sinonimos: ["taller u oficio", "taller", "oficio", "carpinteria", "plomeria", "electricista", "herreria", "soldadura", "aluminio", "construccion", "remodelacion", "clima", "aire acondicionado", "reparacion", "electronica"],
    palabras: ["carpinteria", "madera", "puerta", "closet", "plomero", "plomeria", "electricista", "electrico", "clima", "aire", "refrigeracion", "boiler", "herreria", "soldadura", "aluminio", "vidrio", "albanil", "construccion", "remodelacion", "reparacion", "celular", "computadora"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/10316634/pexels-photo-10316634.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Taller de carpintería y fabricación"
      },
      {
        url: "https://images.pexels.com/photos/7859953/pexels-photo-7859953.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Instalación técnica y mantenimiento"
      },
      {
        url: "https://images.pexels.com/photos/15419937/pexels-photo-15419937.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Trabajos de herrería y soldadura"
      }
    ]
  },
  tienda: {
    etiqueta: "Tienda",
    sinonimos: ["tienda", "comercio", "local", "regalos", "novedades", "artesanias", "jugueteria", "electronica", "celulares", "distribuidora"],
    palabras: ["tienda", "local", "comercio", "mostrador", "regalo", "artesania", "juguete", "novedad", "accesorio", "producto", "mayoreo", "menudeo"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/3735183/pexels-photo-3735183.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Interior de tienda local con anaqueles"
      },
      {
        url: "https://images.pexels.com/photos/19418844/pexels-photo-19418844.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Negocio local abierto al público"
      },
      {
        url: "https://images.pexels.com/photos/29462804/pexels-photo-29462804.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Atención directa en mostrador"
      }
    ]
  },
  otro: {
    etiqueta: "Negocio local",
    sinonimos: ["otro", "otra", "negocio", "emprendimiento"],
    palabras: ["negocio", "emprendimiento", "proyecto", "espacio", "estudio", "atencion"],
    fotos: [
      {
        url: "https://images.pexels.com/photos/20390771/pexels-photo-20390771.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Espacio moderno de atención"
      },
      {
        url: "https://images.pexels.com/photos/5444180/pexels-photo-5444180.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Espacio para proyectos y clientes"
      },
      {
        url: "https://images.pexels.com/photos/7875953/pexels-photo-7875953.jpeg?auto=compress&cs=tinysrgb&w=1200",
        etiqueta: "Atención personalizada de negocio"
      }
    ]
  }
};

/* Estructura adaptable por tipo de negocio (secciones, orden y títulos
   contextualizados que se aplican con los datos reales del usuario, sin
   copiar textos ajenos ni inventar precios). */
const ESTRUCTURAS_POR_TIPO_NEGOCIO = {
  comida: {
    ordenSecciones: ["presentacion", "servicios", "contacto", "beneficios", "preguntas"],
    titulos: {
      presentacion: "Presentación",
      servicios: "Menú y especialidades",
      beneficios: "Por qué elegirnos",
      preguntas: "Preguntas frecuentes",
      contacto: "Pedidos y contacto"
    },
    ctaWhatsapp: "Hacer pedido a {nombre}"
  },
  tienda: {
    ordenSecciones: ["presentacion", "servicios", "beneficios", "preguntas", "contacto"],
    titulos: {
      presentacion: "Presentación",
      servicios: "Productos disponibles",
      beneficios: "Ventajas en tienda",
      preguntas: "Preguntas frecuentes",
      contacto: "Consulta existencias"
    },
    ctaWhatsapp: "Preguntar disponibilidad a {nombre}"
  },
  "salud y belleza": {
    ordenSecciones: ["presentacion", "servicios", "contacto", "beneficios", "preguntas"],
    titulos: {
      presentacion: "Presentación",
      servicios: "Servicios y atención",
      beneficios: "Atención y confianza",
      preguntas: "Preguntas frecuentes",
      contacto: "Agenda tu cita"
    },
    ctaWhatsapp: "Agendar cita en {nombre}"
  },
  "taller u oficio": {
    ordenSecciones: ["presentacion", "servicios", "beneficios", "contacto", "preguntas"],
    titulos: {
      presentacion: "Presentación",
      servicios: "Trabajos y servicios",
      beneficios: "Cómo trabajamos",
      preguntas: "Preguntas frecuentes",
      contacto: "Solicita cotización"
    },
    ctaWhatsapp: "Cotizar por WhatsApp con {nombre}"
  },
  servicios: {
    ordenSecciones: ["presentacion", "servicios", "beneficios", "preguntas", "contacto"],
    titulos: {
      presentacion: "Presentación",
      servicios: "Servicios",
      beneficios: "Cómo te ayudamos",
      preguntas: "Preguntas frecuentes",
      contacto: "Contacto y cotización"
    },
    ctaWhatsapp: "Pedir información a {nombre}"
  },
  otro: {
    ordenSecciones: ["presentacion", "servicios", "beneficios", "preguntas", "contacto"],
    titulos: {
      presentacion: "Presentación",
      servicios: "Lo que ofrecemos",
      beneficios: "Beneficios",
      preguntas: "Preguntas frecuentes",
      contacto: "Contacto directo"
    },
    ctaWhatsapp: "Enviar WhatsApp a {nombre}"
  }
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

const CONECTORES_MINUSCULA = new Set([
  "a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "los", "o", "para", "por", "sin", "u", "y"
]);

const CIUDADES_CANONICAS = {
  mexico: "México",
  "ciudad de mexico": "Ciudad de México",
  cdmx: "CDMX",
  "edo mex": "Estado de México",
  edomex: "Estado de México",
  "estado de mexico": "Estado de México",
  queretaro: "Querétaro",
  merida: "Mérida",
  cancun: "Cancún",
  leon: "León",
  "nuevo leon": "Nuevo León",
  "san luis potosi": "San Luis Potosí",
  michoacan: "Michoacán",
  yucatan: "Yucatán",
  mazatlan: "Mazatlán",
  culiacan: "Culiacán",
  tehuacan: "Tehuacán",
  teotihuacan: "Teotihuacán",
  "ciudad juarez": "Ciudad Juárez",
  juarez: "Juárez",
  "boca del rio": "Boca del Río",
  "playa del carmen": "Playa del Carmen",
  "puerto vallarta": "Puerto Vallarta",
  "cabo san lucas": "Cabo San Lucas",
  "san jose del cabo": "San José del Cabo",
  "san miguel de allende": "San Miguel de Allende",
  "san cristobal de las casas": "San Cristóbal de las Casas",
  "san pedro garza garcia": "San Pedro Garza García",
  "garza garcia": "Garza García",
  "torreon": "Torreón",
  "gomez palacio": "Gómez Palacio",
  "poza rica": "Poza Rica",
  "ciudad obregon": "Ciudad Obregón",
  "obregon": "Obregón",
  "los mochis": "Los Mochis",
  "tepic": "Tepic",
  "irapuato": "Irapuato",
  "celaya": "Celaya",
  "pachuca": "Pachuca",
  "tuxtla gutierrez": "Tuxtla Gutiérrez",
  "villahermosa": "Villahermosa",
  "aguascalientes": "Aguascalientes",
  "guadalajara": "Guadalajara",
  "monterrey": "Monterrey",
  "tijuana": "Tijuana",
  "puebla": "Puebla",
  "toluca": "Toluca",
  "morelia": "Morelia",
  "oaxaca": "Oaxaca",
  "veracruz": "Veracruz",
  "chihuahua": "Chihuahua",
  "hermosillo": "Hermosillo",
  "saltillo": "Saltillo",
  "mexicali": "Mexicali",
  "reynosa": "Reynosa",
  "matamoros": "Matamoros",
  "tampico": "Tampico",
  "acapulco": "Acapulco",
  "cuernavaca": "Cuernavaca",
  "xalapa": "Xalapa",
  "durango": "Durango",
  "zacatecas": "Zacatecas",
  "colima": "Colima",
  "campeche": "Campeche",
  "chetumal": "Chetumal",
  "tlaxcala": "Tlaxcala",
  "la paz": "La Paz"
};

const PALABRAS_RELLENO_SET = new Set([
  "omitir",
  "saltar",
  "ninguno",
  "ninguna",
  "pendiente",
  "nada",
  "n/a",
  "na",
  "no",
  "sin dato",
  "sin datos",
  "sin whatsapp",
  "no tengo",
  "no tengo whatsapp",
  "no uso whatsapp",
  "sin numero",
  "sin número",
  "sin telefono",
  "sin teléfono",
  "seguir sin whatsapp",
  "continuar sin telefono",
  "continuar sin teléfono",
  "despues",
  "después",
  "luego",
  "mas tarde",
  "más tarde"
]);

function esTextoRellenoGen(texto) {
  const limpio = limpiarTextoGen(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.!?¡¿,:;"'()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpio) {
    return true;
  }
  if (PALABRAS_RELLENO_SET.has(limpio)) {
    return true;
  }
  return /^(omitir|saltar|sin\s+whats?app|no\s+tengo\s+whats?app|seguir\s+sin\s+whats?app|continuar\s+sin\s+(telefono|numero|whats?app)|sin\s+(telefono|numero))$/i.test(
    limpio
  );
}

function esOmisionWhatsapp(texto) {
  const limpio = limpiarTextoGen(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.!?¡¿,:;"'()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpio) {
    return true;
  }
  if (esTextoRellenoGen(limpio)) {
    return true;
  }
  return /^(omitir|saltar|no|ninguno|ninguna|pendiente|despues|luego|nada|sin\s+whats?app|no\s+tengo|no\s+uso|continuar\s+sin|seguir\s+sin)\b/i.test(
    limpio
  );
}

function limpiarOfertaDeRelleno(texto) {
  const crudo = limpiarTextoGen(texto).replace(/[\u2014\u2013]/g, ", ");
  if (!crudo) {
    return "";
  }
  const partes = crudo
    .split(/[\n;,\u2022]+/)
    .map((p) => limpiarTextoGen(p).replace(/^[-*]\s*/, ""))
    .filter((p) => p.length >= 2 && !esTextoRellenoGen(p));

  const unicas = [];
  const vistas = new Set();
  for (let i = 0; i < partes.length; i += 1) {
    const clave = partes[i].toLowerCase();
    if (!vistas.has(clave)) {
      vistas.add(clave);
      unicas.push(partes[i]);
    }
  }
  return unicas.join(", ");
}

function quitarGuionesLargosGen(texto) {
  return limpiarTextoGen(String(texto || "").replace(/[\u2014\u2013]/g, ", "));
}

function formatearNombrePropio(texto, tipo) {
  const limpio = quitarGuionesLargosGen(texto);
  if (!limpio) {
    return "";
  }
  const normalizado = limpio
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (tipo === "ciudad" && CIUDADES_CANONICAS[normalizado]) {
    return CIUDADES_CANONICAS[normalizado];
  }

  // Si el usuario ya usó mayúsculas intencionales (ej. iPhone, DMD, La Espiga), respetarlas
  const tieneMayuscula = /[A-ZÁÉÍÓÚÑÜ]/.test(limpio);
  const todoMinuscula = limpio === limpio.toLowerCase();

  if (tieneMayuscula && !todoMinuscula) {
    // Aun así corregir acento común si escribió "Mexico"
    if (tipo === "ciudad" && CIUDADES_CANONICAS[normalizado]) {
      return CIUDADES_CANONICAS[normalizado];
    }
    return limpio;
  }

  const palabras = limpio.split(" ");
  return palabras
    .map((pal, idx) => {
      const baja = pal.toLowerCase();
      if (baja === "mexico" || baja === "méxico") {
        return "México";
      }
      if (baja === "cdmx") {
        return "CDMX";
      }
      if (idx > 0 && CONECTORES_MINUSCULA.has(baja)) {
        return baja;
      }
      return baja.charAt(0).toUpperCase() + baja.slice(1);
    })
    .join(" ");
}

function normalizarSubdominioGen(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^https?:\/\//i, "")
    .replace(/\.dmd\.dmdmx\.dev.*$/i, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function validarSubdominio(valor) {
  const crudo = String(valor || "").trim().toLowerCase();
  if (!crudo) {
    return {
      ok: false,
      vacio: true,
      slug: "",
      url: "",
      mensaje: "Escribe el nombre de tu subdominio, por ejemplo: el-inge."
    };
  }
  const limpioSinDominio = crudo
    .replace(/^https?:\/\//i, "")
    .replace(/\.dmd\.dmdmx\.dev.*$/i, "")
    .trim();
  const sugerido = normalizarSubdominioGen(limpioSinDominio);

  if (!/^[a-z0-9-]+$/.test(limpioSinDominio)) {
    return {
      ok: false,
      vacio: false,
      slug: sugerido,
      url: sugerido ? `https://${sugerido}.dmd.dmdmx.dev` : "",
      mensaje: sugerido
        ? `Usa solo letras minúsculas, números y guiones. Sugerencia: ${sugerido}`
        : "Usa solo letras minúsculas, números y guiones."
    };
  }
  if (/^-|-$/.test(limpioSinDominio) || /--/.test(limpioSinDominio)) {
    return {
      ok: false,
      vacio: false,
      slug: sugerido,
      url: sugerido ? `https://${sugerido}.dmd.dmdmx.dev` : "",
      mensaje: "No puede empezar ni terminar con guion ni llevar dos guiones seguidos."
    };
  }
  if (limpioSinDominio.length < 3) {
    return {
      ok: false,
      vacio: false,
      slug: limpioSinDominio,
      url: "",
      mensaje: "Escribe al menos 3 caracteres para tu subdominio."
    };
  }
  if (limpioSinDominio.length > 40) {
    return {
      ok: false,
      vacio: false,
      slug: limpioSinDominio.slice(0, 40),
      url: "",
      mensaje: "El subdominio debe tener máximo 40 caracteres."
    };
  }
  return {
    ok: true,
    vacio: false,
    slug: limpioSinDominio,
    url: `https://${limpioSinDominio}.dmd.dmdmx.dev`,
    mensaje: `Dirección válida: https://${limpioSinDominio}.dmd.dmdmx.dev`
  };
}

function aplicarPlantillaGen(texto, variables) {
  return texto
    .replace(/\{nombre\}/g, variables.nombre)
    .replace(/\{ciudad\}/g, variables.ciudad)
    .replace(/\{oferta\}/g, variables.oferta);
}

function normalizarTextoBusquedaGen(texto) {
  return limpiarTextoGen(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarGiro(texto) {
  const limpio = normalizarTextoBusquedaGen(texto);
  if (!limpio) {
    return "";
  }
  if (GIROS_ETIQUETAS[limpio]) {
    return limpio;
  }
  if (/\b(comida|panad\w*|pastel\w*|reposter\w*|restaur\w*|taquer\w*|tacos?|cafet\w*|cafe|postres?|cocina|fonda|antojit\w*|alimento\w*|dulcer\w*|dulces?|chocolat\w*|carnicer\w*|poller\w*|pescader\w*|tortiller\w*|tortillas?|birria\w*|barbacoa|pizzer\w*|hamburgues\w*|marisc\w*|helader\w*|paleter\w*|never\w*|loncher\w*|torter\w*|sushi)\b/.test(limpio)) {
    return "comida";
  }
  if (/\b(tienda|ropa|boutique|moda|abarrote\w*|fruter\w*|verduler\w*|minisuper|miscelan\w*|papel\w*|librer\w*|regalo\w*|venta|comercio|calzado|zapater\w*|ferreter\w*|tlapaler\w*|farmac\w*|botica|florer\w*|flores?|vivero|muebler\w*|muebles?|joyer\w*|relojer\w*|bisuter\w*|optic\w*|lentes?|jugueter\w*|artesan\w*|mercer\w*|forrajer\w*)\b/.test(limpio)) {
    return "tienda";
  }
  if (/\b(salud|belleza|estetic\w*|barber\w*|peluquer\w*|unas|manicur\w*|pedicur\w*|maquill\w*|spa|dental|dentist\w*|odontolog\w*|consult\w*|clinic\w*|salon|masaje\w*|veterinar\w*|mascotas?|gimnasio|gym|fitness|crossfit|yoga|pilates|fisioterap\w*|psicolog\w*|nutric\w*|medic\w*|doctor\w*|laboratorio)\b/.test(limpio)) {
    return "salud y belleza";
  }
  if (/\b(taller|oficio|mecan\w*|automotriz|llanter\w*|vulcaniz\w*|hojalater\w*|plomer\w*|electric\w*|carpint\w*|herrer\w*|soldadur\w*|reparaci\w*|tecnic\w*|cerrajer\w*|albanil\w*|construc\w*|remodel\w*|climat\w*|refriger\w*|tapicer\w*|aluminio|vidrier\w*|pintor\w*|impermeab\w*)\b/.test(limpio)) {
    return "taller u oficio";
  }
  if (/\b(servicio\w*|asesor\w*|contab\w*|contador\w*|abogad\w*|legal\w*|consultor\w*|limpieza|lavander\w*|tintorer\w*|planchad\w*|fumig\w*|flete\w*|mudanza\w*|envio\w*|paqueter\w*|fotograf\w*|video|diseno|marketing|clase\w*|curso\w*|escuela|academ\w*|mantenimiento|evento\w*|seguro\w*|inmobiliar\w*|imprenta)\b/.test(limpio)) {
    return "servicios";
  }
  if (limpio.length >= 2) {
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

function esOmisionCampoOpcional(texto) {
  const bajo = limpiarTextoGen(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.!?¡¿,:;]+$/g, "")
    .trim();
  if (!bajo) {
    return true;
  }
  return /^(omitir|saltar|ninguno|ninguna|no|sin\s+(?:direccion|calle|ubicacion|horario|telefono|whatsapp)|continuar\s+sin\s+(?:direccion|calle|horario|telefono|whatsapp)|despues|pendiente|no\s+tengo)$/i.test(
    bajo
  );
}

function extraerDetallesRealesUsuario(datos) {
  const detalles = { horario: "", ubicacion: "", precios: "" };
  if (!datos || typeof datos !== "object") {
    return detalles;
  }

  // 1) Priorizar dirección y horario capturados en sus pasos dedicados
  if (datos.horario && !esOmisionCampoOpcional(datos.horario)) {
    detalles.horario = limpiarTextoGen(datos.horario).replace(/[,;.\s]+$/, "");
  }
  if (datos.direccion && !esOmisionCampoOpcional(datos.direccion)) {
    detalles.ubicacion = limpiarTextoGen(datos.direccion).replace(/[,;.\s]+$/, "");
  }

  const fuente = limpiarTextoGen(
    [datos.oferta, datos.giroTexto].filter(Boolean).join(". ")
  );
  if (!fuente) {
    return detalles;
  }

  // 2) Si no se dieron en pasos dedicados, extraer de la oferta cuando el usuario los incluyó ahí
  if (!detalles.horario) {
    const dia = "(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)";
    const hora = "\\d{1,2}(?::\\d{2})?(?:\\s*(?:a\\.?\\s*m\\.?|p\\.?\\s*m\\.?|am|pm|hrs?))?";
    const rangoHora = `${hora}\\s*(?:a|-)\\s*${hora}(?:\\s*de\\s+la\\s+(?:ma[ñn]ana|tarde|noche))?`;
    const tramoDia = `(?:de\\s+)?${dia}(?:\\s*(?:a|y|,)\\s*${dia})*(?:\\s+de\\s+${rangoHora})?`;
    const regexHorario = new RegExp(
      `\\b(${tramoDia}(?:(?:\\s*,\\s*|\\s+y\\s+)${tramoDia})+|${tramoDia}|(?:todos\\s+los\\s+d[ií]as\\s+)?de\\s+${rangoHora}|24\\s*horas)\\b`,
      "i"
    );
    const mHorario = fuente.match(regexHorario);
    if (mHorario) {
      detalles.horario = limpiarTextoGen(mHorario[0]).replace(/[,;.\s]+$/, "");
    }
  }

  if (!detalles.ubicacion) {
    const prefUbic = "(?:av\\.|avenida|calle|blvd\\.|boulevard|calz\\.|calzada|col\\.|colonia|plaza|mercado|zona|frente\\s+a|cerca\\s+de)";
    const segUbic = "[A-Za-zÁÉÍÓÚÑáéíóúñ0-9#]+(?:\\s+[A-Za-zÁÉÍÓÚÑáéíóúñ0-9#]+){0,4}";
    const regexUbic = new RegExp(
      `\\b(${prefUbic}\\s+${segUbic}(?:\\s*,\\s*(?:col\\.|colonia|fracc\\.|fraccionamiento|esq\\.|esquina|centro|zona|no\\.|n[uú]m\\.|#)?\\s*${segUbic})*)`,
      "i"
    );
    const mUbic = fuente.match(regexUbic);
    if (mUbic) {
      let ub = limpiarTextoGen(mUbic[0]);
      if (detalles.horario) {
        const idxH = ub.toLowerCase().indexOf(detalles.horario.toLowerCase());
        if (idxH > 0) {
          ub = ub.slice(0, idxH);
        }
      }
      ub = ub
        .replace(/,?\s*(?:abrimos|atendemos|horario|de\s+\d|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b[\s\S]*$/i, "")
        .replace(/[,;.\s]+$/, "")
        .trim();
      detalles.ubicacion = ub;
    }
  }

  const mPrecio = fuente.match(
    /(?:desde\s+)?\$\s*\d[\d,.]*(?:\s*(?:mxn|pesos))?|\b\d[\d,.]*\s*(?:pesos|mxn)\b/i
  );
  if (mPrecio) {
    detalles.precios = limpiarTextoGen(mPrecio[0]).replace(/[,;.\s]+$/, "");
  }

  return detalles;
}

function limpiarOfertaSoloProductos(ofertaLimpia, detalles) {
  let texto = String(ofertaLimpia || "");
  if (detalles && detalles.horario) {
    const escH = detalles.horario.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    texto = texto.replace(
      new RegExp(`(?:[.;,]?\\s*(?:abrimos|atendemos|nuestro\\s+horario(?:\\s+es)?|horario:?)\\s*)?${escH}`, "gi"),
      ""
    );
  }
  if (detalles && detalles.ubicacion) {
    const escU = detalles.ubicacion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    texto = texto.replace(
      new RegExp(`(?:[.;,]?\\s*(?:estamos|nos\\s+ubicamos|nos\\s+encontramos|ubicados?)\\s*(?:en\\s+)?)?${escU}`, "gi"),
      ""
    );
  }
  texto = texto
    .replace(/[.;,]?\s*\b(?:estamos|nos\s+ubicamos|nos\s+encontramos|ubicados?|abrimos|atendemos|horario)\b(?:\s+en)?\s*(?=[.,;]|$)/gi, "")
    .replace(/(?:^|[.;,]\s*)(?:estamos|ubicados?|abrimos|atendemos)\s*(?:en)?\s*(?:[.,;]|$)/gi, " ")
    .replace(/\s*,\s*y\s*$/i, "")
    .replace(/[,;.\s]+$/g, "")
    .replace(/^[,;.\s]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return texto || ofertaLimpia;
}

function fraseUbicacionCompleta(ubicacion, ciudad) {
  if (!ubicacion) {
    return ciudad;
  }
  const uNorm = ubicacion.toLowerCase();
  const cNorm = String(ciudad || "").toLowerCase();
  if (cNorm && uNorm.includes(cNorm)) {
    return ubicacion;
  }
  return `${ubicacion}, ${ciudad}`;
}

const ESTRUCTURAS_ESPECIFICAS_GIRO = {
  panaderia: {
    ordenSecciones: ["presentacion", "servicios", "contacto", "preguntas"],
    titulos: {
      presentacion: "Presentación",
      servicios: "Lo que horneamos",
      beneficios: "Por qué nos eligen",
      preguntas: "Dudas sobre pedidos",
      contacto: "Encargos y mostrador"
    },
    ctaWhatsapp: "Apartar pan en {nombre}",
    notaSinWhatsapp: "Mostrador en {ubicacion}."
  },
  ferreteria: {
    ordenSecciones: ["presentacion", "servicios", "beneficios", "preguntas", "contacto"],
    titulos: {
      presentacion: "Presentación",
      servicios: "Departamentos y surtido",
      beneficios: "Ventajas en mostrador",
      preguntas: "Antes de venir",
      contacto: "Ubicación y mostrador"
    },
    ctaWhatsapp: "Consultar existencia en {nombre}",
    notaSinWhatsapp: "Venta en mostrador · {ubicacion}."
  },
  taqueria: {
    ordenSecciones: ["presentacion", "servicios", "contacto", "preguntas"],
    titulos: {
      presentacion: "Presentación",
      servicios: "De la parrilla",
      beneficios: "Por qué nos eligen",
      preguntas: "Preguntas rápidas",
      contacto: "Pedidos y local"
    },
    ctaWhatsapp: "Hacer pedido a {nombre}",
    notaSinWhatsapp: "Comedor y para llevar en {ubicacion}."
  },
  cafeteria: {
    ordenSecciones: ["presentacion", "servicios", "beneficios", "contacto", "preguntas"],
    titulos: {
      presentacion: "Presentación",
      servicios: "En barra",
      beneficios: "Lo que cuidamos",
      preguntas: "Preguntas frecuentes",
      contacto: "Dónde estamos"
    },
    ctaWhatsapp: "Pedir para recoger en {nombre}",
    notaSinWhatsapp: "Barra abierta en {ubicacion}."
  }
};

function describirProductoReal(titulo, temaEspecifico, giro, tono, tieneWa, indice) {
  const norm = normalizarTextoBusquedaGen(titulo);
  const reglas = [
    {
      rx: /\b(pintur|esmalte|vinilic|barniz|sellador|impermeabiliz|brocha|rodillo)/,
      texto: "Vinílica, esmalte y sellador. Tenemos litro, galón y cubeta."
    },
    {
      rx: /\b(taladr|rotomartill|esmeril|sierr|lijador|calador|atornillador|compresor)/,
      texto: "Equipos para arreglos de casa o uso rudo, además de brocas y puntas de repuesto."
    },
    {
      rx: /\b(tornill|pija|clavo|taquet|tuerca|arandela|birlo|fijacion)/,
      texto: "Desde una pieza suelta hasta caja cerrada, en medida estándar o milimétrica."
    },
    {
      rx: /\b(plomer|tuberi|pvc|cobre|llave\s+de\s+paso|conexion|empaque|tinaco|valvula)/,
      texto: "Codos, empaques, llaves de paso y sellador para sacar rápido cualquier fuga."
    },
    {
      rx: /\b(electric|cable|apagador|contacto|foco|pastilla|centro\s+de\s+carga|iluminacion)/,
      texto: "Cable por metro, contactos, apagadores y pastillas."
    },
    {
      rx: /\b(herramient|llave|pinza|desarmador|martillo|dado|broca|flexometro|nivel)/,
      texto: "Pinzas, llaves y desarmadores. Se venden sueltos o en estuche."
    },
    {
      rx: /\b(material|cemento|yeso|arena|grava|pegazulejo|mortero|construccion|obra)/,
      texto: "Cemento, yeso y pegazulejo para resanes o listas de obra chica."
    },
    {
      rx: /\b(concha)/,
      texto: "Vainilla y chocolate. Salen temprano."
    },
    {
      rx: /\b(pan\s+dulce|cuerno|oreja|mantecad|dona|rol|churro|empanad|polvoron|garibaldi|bisquet)/,
      texto: "Cuernitos, orejas y mantecadas en vitrina hasta que se acaban."
    },
    {
      rx: /\b(bolillo|telera|birote|baguette|pan\s+salado|hogaza|ciabatta)/,
      texto: "Para tortas o para la comida; llévalo suelto o por bolsa."
    },
    {
      rx: /\b(pastel|tres\s+leches|reposteri|pay|tarta|galleta|rosca|gelatina)/,
      texto: "Entero o en rebanada. Si es para cumpleaños o reunión, apártalo un día antes."
    },
    {
      rx: /\b(taco|pastor|asada|suadero|birria|carnita|barbacoa|cabeza|tripa|chorizo|bistec)/,
      texto: "En tortilla caliente, con su cebolla, cilantro y salsa de la casa."
    },
    {
      rx: /\b(gringa|quesadilla|volcan|mulita|torta|alambre|burrito|huarache|sope)/,
      texto: "Queso fundido al comal. Para comer aquí o bien empacado para llevar."
    },
    {
      rx: /\b(cafe|espresso|americano|capuchino|latte|filtrado|frappe|matcha|te\b|tisana)/,
      texto: "Caliente o con hielo. Molido al momento."
    },
    {
      rx: /\b(panini|sandwich|chapata|mollete|desayuno|chilaquil|bagel|crepa|waffle)/,
      texto: "A la plancha, listo en pocos minutos si pasas con prisa."
    },
    {
      rx: /\b(asesori|mostrador|cotizacion)/,
      texto: tieneWa
        ? "¿No sabes la medida exacta? Manda foto por WhatsApp y te confirmamos si la tenemos."
        : "¿No sabes la medida exacta? Trae la pieza vieja al mostrador y la buscamos juntos."
    }
  ];

  for (const regla of reglas) {
    if (regla.rx.test(norm)) {
      return regla.texto;
    }
  }

  // Respaldos con ritmo y longitud variados (sin frases paralelas ni sustantivos pegados)
  const porGiro = {
    panaderia: [
      "Sale en tandas cortas durante la mañana.",
      "Receta de casa en vitrina. Si necesitas varias piezas para una reunión, apártalas con tiempo.",
      "Por pieza suelta en mostrador."
    ],
    ferreteria: [
      "Pregunta en mostrador por medidas y marcas disponibles.",
      "Para arreglos en casa o trabajo diario. Si traes tu muestra, revisamos compatibilidad al momento.",
      "Se vende suelto o por paquete."
    ],
    taqueria: [
      "Sale caliente al momento.",
      "Puedes pedirlo para comer en mesa o empacado con limones y salsas aparte."
    ],
    cafeteria: [
      "Caliente o frío, al gusto.",
      "Se prepara al momento en barra; pide la leche que prefieras."
    ],
    tienda: [
      "Existencia directa en mostrador.",
      "Varias presentaciones según lo que vayas a ocupar."
    ],
    comida: [
      "Hecho al día. Para comer aquí o llevar.",
      "Porción individual o charola para compartir."
    ],
    servicios: [
      "Revisamos primero lo que necesitas y te damos presupuesto claro.",
      "Seguimiento directo hasta cerrar el trabajo."
    ],
    "salud y belleza": [
      "Material higienizado y cita sin prisas.",
      "Platicamos primero qué buscas para ajustar cada detalle."
    ],
    "taller u oficio": [
      "Diagnóstico antes de empezar, sin cargos sorpresa.",
      "Te decimos tiempos de entrega y refacciones con claridad."
    ]
  };
  const lista = porGiro[temaEspecifico] || porGiro[giro] || [
    "Trato directo en el local; pregunta por opciones disponibles.",
    "Te damos información clara antes de decidir."
  ];
  return lista[indice % lista.length];
}

const COPIA_ESPECIFICA_GIRO = {
  panaderia: {
    minTarjetas: 2,
    construirIntro: (v, d, tieneWa) => {
      const lugar = fraseUbicacionCompleta(d.ubicacion, v.ciudad);
      const p1 = d.ubicacion
        ? `En ${v.nombre} horneamos ${v.oferta}. Nos encuentras en ${lugar}.`
        : `${v.nombre}: ${v.oferta} en ${v.ciudad}.`;
      const p2 = d.horario
        ? `Abrimos ${d.horario}.`
        : tieneWa
          ? "Pasa al mostrador o aparta tus charolas por WhatsApp."
          : "Venta directa en mostrador; encargos con un día de aviso.";
      return `${p1} ${p2}`;
    },
    beneficios: (v, d, tieneWa) => [
      `Horneado por tandas en ${v.ciudad}, nada guardado de días atrás.`,
      tieneWa
        ? "¿Necesitas una charola o pastel? Apártalo directo por WhatsApp."
        : "Charolas y pasteles sobre pedido directo en mostrador.",
      "Lleva desde una pieza suelta."
    ],
    faqs: (v, d, tieneWa) => {
      const lugar = fraseUbicacionCompleta(d.ubicacion, v.ciudad);
      const lista = [
        {
          q: "¿Con cuánto tiempo aparto un pastel o charola?",
          a: tieneWa
            ? "Con un día de aviso por WhatsApp queda agendado para la hora que pases."
            : "Con un día de aviso en mostrador queda agendado para la hora que pases."
        }
      ];
      if (d.horario) {
        lista.push({
          q: "¿A qué hora abren?",
          a: `Abrimos ${d.horario}${d.ubicacion ? ` en ${lugar}` : ` en ${v.ciudad}`}.`
        });
      } else if (d.ubicacion) {
        lista.push({
          q: `¿Dónde queda ${v.nombre}?`,
          a: `Estamos en ${lugar}.`
        });
      } else {
        lista.push({
          q: "¿Venden por pieza suelta?",
          a: "Sí, puedes llevar desde una pieza en mostrador hasta charolas completas."
        });
      }
      return lista;
    }
  },

  ferreteria: {
    minTarjetas: 4,
    construirIntro: (v, d, tieneWa) => {
      const lugar = fraseUbicacionCompleta(d.ubicacion, v.ciudad);
      const p1 = d.ubicacion
        ? `${v.nombre} está en ${lugar} con surtido de ${v.oferta}.`
        : `En ${v.nombre} (${v.ciudad}) encuentras ${v.oferta}.`;
      const p2 = d.horario
        ? `Horario: ${d.horario}.`
        : tieneWa
          ? "¿Dudas si tenemos la pieza? Pregunta por WhatsApp antes de dar la vuelta."
          : "Atendemos reparaciones de casa y listas de obra directo en mostrador.";
      return `${p1} ${p2}`;
    },
    beneficios: (v, d, tieneWa) => [
      tieneWa
        ? "Confirmamos existencia y medida por WhatsApp antes de que vengas."
        : "Trae la pieza vieja y buscamos el reemplazo exacto contigo.",
      "Desde un tornillo suelto hasta listas completas de obra.",
      `Surtido a la mano en ${v.ciudad}, sin esperar paquetería.`
    ],
    faqs: (v, d, tieneWa) => {
      const lugar = fraseUbicacionCompleta(d.ubicacion, v.ciudad);
      const lista = [
        {
          q: tieneWa ? "¿Puedo mandar foto de la pieza o mi lista?" : "¿Puedo llevar la pieza de muestra o mi lista?",
          a: tieneWa
            ? `Claro. Manda tu lista o foto de lo que buscas en ${v.oferta} y te avisamos si hay existencia${d.precios ? ` (opciones ${d.precios})` : ""}.`
            : `Claro. Trae la muestra o tu lista de ${v.oferta} al mostrador y revisamos juntos${d.precios ? ` (opciones ${d.precios})` : ""}.`
        },
        {
          q: "¿Venden piezas sueltas o solo por caja?",
          a: "Lo que ocupes: desde una pieza suelta hasta caja cerrada."
        }
      ];
      if (d.horario) {
        lista.push({
          q: "¿Cuál es el horario?",
          a: `Atendemos ${d.horario}.`
        });
      }
      if (d.ubicacion) {
        lista.push({
          q: `¿Dónde está ${v.nombre}?`,
          a: `En ${lugar}.`
        });
      }
      return lista;
    },
    complementos: (tieneWa) => [
      {
        titulo: "Tornillería y fijación",
        descripcion: "Pijas, taquetes y clavos. Desde una pieza suelta hasta por caja."
      },
      {
        titulo: "Plomería y eléctrico",
        descripcion: "Empaques, conexiones, cable por metro y apagadores para resolver rápido."
      },
      {
        titulo: "Asesoría en mostrador",
        descripcion: tieneWa
          ? "¿No sabes la medida exacta? Manda foto por WhatsApp y te ayudamos a ubicar el repuesto."
          : "¿No sabes la medida exacta? Trae la pieza vieja y la buscamos juntos en mostrador."
      }
    ]
  },

  taqueria: {
    minTarjetas: 3,
    construirIntro: (v, d, tieneWa) => {
      const lugar = fraseUbicacionCompleta(d.ubicacion, v.ciudad);
      const p1 = `${v.nombre} en ${lugar}: ${v.oferta} recién salidos.`;
      const p2 = d.horario
        ? `Abrimos ${d.horario}.`
        : tieneWa
          ? "Come aquí o aparta tu orden por WhatsApp para no hacer fila."
          : "Comedor abierto y órdenes calientes para llevar.";
      return `${p1} ${p2}`;
    },
    beneficios: (v) => [
      "Todo sale al momento, directo de la plancha o al carbón.",
      "Salsas hechas ese mismo día.",
      `Comedor y para llevar en ${v.ciudad}.`
    ],
    faqs: (v, d, tieneWa) => {
      const lugar = fraseUbicacionCompleta(d.ubicacion, v.ciudad);
      const lista = [
        {
          q: "¿Preparan para llevar?",
          a: tieneWa
            ? `Sí. Pide tu orden de ${v.oferta} por WhatsApp y pasa directo a recoger.`
            : `Sí, empacamos tu orden de ${v.oferta} bien caliente con salsas y limones aparte.`
        },
        {
          q: d.precios ? "¿Qué precios manejan?" : "¿Arman charolas para eventos?",
          a: d.precios
            ? `Tenemos opciones ${d.precios}. Pregunta por paquetes para compartir.`
            : tieneWa
              ? `Sí, apartando con un día de aviso por WhatsApp.`
              : `Sí, apartando en el local con un día de anticipación.`
        }
      ];
      if (d.horario) {
        lista.push({
          q: "¿Qué horario tienen?",
          a: `Abrimos ${d.horario}${d.ubicacion ? ` en ${lugar}` : ` en ${v.ciudad}`}.`
        });
      } else if (d.ubicacion) {
        lista.push({
          q: `¿Dónde está ${v.nombre}?`,
          a: `Estamos en ${lugar}.`
        });
      }
      return lista;
    }
  },

  cafeteria: {
    minTarjetas: 2,
    construirIntro: (v, d, tieneWa) => {
      const lugar = fraseUbicacionCompleta(d.ubicacion, v.ciudad);
      const p1 = `${v.nombre} en ${lugar}. Grano molido al momento para ${v.oferta}.`;
      const p2 = d.horario
        ? `Barra abierta ${d.horario}.`
        : tieneWa
          ? "¿Vas con prisa? Pide tu vaso por WhatsApp y pásalo a recoger."
          : "Para tomar en barra o llevar.";
      return `${p1} ${p2}`;
    },
    beneficios: (v) => [
      "Grano molido justo antes de preparar tu taza.",
      "Opciones calientes y frías.",
      `Barra local en ${v.ciudad}.`
    ],
    faqs: (v, d) => {
      const lugar = fraseUbicacionCompleta(d.ubicacion, v.ciudad);
      const lista = [
        {
          q: "¿Manejan bebidas frías y otras leches?",
          a: "Sí, casi toda la barra sale caliente o con hielo y con la leche que prefieras."
        }
      ];
      if (d.horario) {
        lista.push({
          q: "¿Cuál es su horario?",
          a: `Abrimos ${d.horario}${d.ubicacion ? ` en ${lugar}` : ` en ${v.ciudad}`}.`
        });
      } else if (d.ubicacion) {
        lista.push({
          q: `¿Dónde están?`,
          a: `En ${lugar}.`
        });
      }
      return lista;
    }
  },

  tienda: { minTarjetas: 3 },
  comida: { minTarjetas: 3 },
  servicios: { minTarjetas: 3 },
  "salud y belleza": { minTarjetas: 3 },
  "taller u oficio": { minTarjetas: 3 }
};

function esFragmentoNoServicio(texto) {
  const bajo = limpiarTextoGen(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!bajo || bajo.length < 3) {
    return true;
  }
  if (/^(estamos|ubicados?|abrimos|atendemos|horario|nos\s+ubicamos|nos\s+encontramos|en\s+(?:av|col|calle|blvd)|y\s+(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)|de\s+\d)/i.test(bajo)) {
    return true;
  }
  return esTextoRellenoGen(bajo);
}

function extraerServiciosGen(ofertaProductos, giro, tono, variante, temaEspecifico, tieneWhatsapp) {
  const perfil = PERFILES_GIRO[giro] || PERFILES_GIRO.otro;
  const protegido = limpiarOfertaDeRelleno(ofertaProductos)
    .replace(/\b(av|col|blvd|calz|no|n[uú]m|esq|fracc)\./gi, "$1__DOT__")
    .replace(/[.]+$/, "")
    .trim();

  let partes = protegido
    .split(/[\n;,\u2022]+|\.\s+/)
    .map((parte) =>
      limpiarTextoGen(parte.replace(/__DOT__/g, "."))
        .replace(/^[-*]\s*/, "")
        .replace(/[.;,]?\s*\b(?:estamos|ubicados?|abrimos|atendemos)\b(?:\s+en)?\s*$/i, "")
        .trim()
    )
    .filter((parte) => parte.length >= 2 && !esFragmentoNoServicio(parte));

  if (partes.length === 1 && /\s+y\s+/i.test(partes[0])) {
    const idxY = partes[0].search(/\s+y\s+/i);
    if (idxY > 0) {
      const izq = limpiarTextoGen(partes[0].slice(0, idxY));
      const der = limpiarTextoGen(partes[0].slice(idxY).replace(/^\s+y\s+/i, ""));
      if (
        izq.length >= 4 &&
        der.length >= 4 &&
        !esFragmentoNoServicio(izq) &&
        !esFragmentoNoServicio(der) &&
        !/\b(?:para|de|con|en)\s+\S+$/i.test(izq)
      ) {
        partes = [izq, der];
      }
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

  const especifico = COPIA_ESPECIFICA_GIRO[temaEspecifico] || COPIA_ESPECIFICA_GIRO[giro] || null;
  const desplazamiento = Math.abs(Number(variante) || 0);

  const servicios = unicos.map((item, indice) => ({
    titulo: item,
    descripcion: describirProductoReal(
      item,
      temaEspecifico,
      giro,
      tono,
      Boolean(tieneWhatsapp),
      indice + desplazamiento
    )
  }));

  const minTarjetas =
    especifico && Number.isInteger(especifico.minTarjetas) ? especifico.minTarjetas : 3;

  if (servicios.length < minTarjetas && especifico && typeof especifico.complementos === "function") {
    const compEsp = especifico.complementos(Boolean(tieneWhatsapp)) || [];
    const textoActualNorm = normalizarTextoBusquedaGen(servicios.map((s) => s.titulo).join(" "));
    for (const comp of compEsp) {
      if (servicios.length >= minTarjetas) {
        break;
      }
      if (!comp || !comp.titulo) {
        continue;
      }
      const primeraPal = normalizarTextoBusquedaGen(comp.titulo).split(" ")[0] || "";
      const yaExiste =
        vistos.has(comp.titulo.toLowerCase()) ||
        (primeraPal.length >= 5 && textoActualNorm.includes(primeraPal.slice(0, 6)));
      if (!yaExiste) {
        vistos.add(comp.titulo.toLowerCase());
        servicios.push({
          titulo: comp.titulo,
          descripcion: comp.descripcion || ""
        });
      }
    }
  }

  if (servicios.length < minTarjetas) {
    for (const comp of perfil.complementos) {
      if (servicios.length >= minTarjetas) {
        break;
      }
      let descComp = comp[tono] || comp.profesional;
      if (!tieneWhatsapp) {
        descComp = descComp
          .replace(/\bpor\s+WhatsApp\b/gi, "en el local")
          .replace(/\bm[aá]ndanos\s+(?:un\s+)?mensaje\b/gi, "pasa al local")
          .replace(/\bescr[ií]benos\b/gi, "pregunta en el negocio");
      }
      servicios.push({
        titulo: comp.titulo,
        descripcion: descComp
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

function construirTituloGen(nombre, ciudad, ofertaProductos, giro, tono, variante) {
  const limpio = limpiarTextoGen(ofertaProductos || "").replace(/\.\s*$/, "");
  const primeraParte = limpiarTextoGen(limpio.split(/[\n;,.]+/)[0] || "");
  const ofertaCorta =
    primeraParte.length >= 4 &&
    primeraParte.length <= 36 &&
    !esFragmentoNoServicio(primeraParte)
      ? primeraParte
      : "";
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

  if (v === 1) {
    return `${nombre} en ${ciudad}`;
  }
  if (tono === "formal") {
    return `${nombre}, atención en ${ciudad}`;
  }
  return `${nombre} en ${ciudad}`;
}

const CLAVES_GIRO_GENERALES = [
  "comida",
  "tienda",
  "servicios",
  "salud y belleza",
  "taller u oficio",
  "otro"
];

function coincideTerminoGen(textoNormalizado, termino) {
  if (!textoNormalizado || !termino) {
    return false;
  }
  if (textoNormalizado === termino) {
    return true;
  }
  if (termino.includes(" ")) {
    return textoNormalizado.includes(termino);
  }
  const tokens = textoNormalizado.split(" ");
  return tokens.some((tok) => {
    if (tok === termino) {
      return true;
    }
    if (termino.length >= 4 && tok.startsWith(termino)) {
      return true;
    }
    if (tok.length >= 4 && termino.startsWith(tok) && tok.length >= termino.length - 2) {
      return true;
    }
    return false;
  });
}

function calcularSemillaTextoGen(texto) {
  let semilla = 0;
  for (let i = 0; i < texto.length; i += 1) {
    semilla = (semilla * 31 + texto.charCodeAt(i)) % 997;
  }
  return semilla;
}

function resolverTemaPortada(datosOGiro) {
  const info =
    typeof datosOGiro === "string"
      ? { giro: datosOGiro, giroTexto: datosOGiro }
      : datosOGiro && typeof datosOGiro === "object"
        ? datosOGiro
        : {};

  const giroEscrito = normalizarTextoBusquedaGen(info.giroTexto || info.giro || "");
  const giroBase = normalizarTextoBusquedaGen(info.giro || "");
  const textoNegocio = normalizarTextoBusquedaGen(
    `${info.nombre || ""} ${info.oferta || ""}`
  );
  const textoCompleto = [giroEscrito, giroBase, textoNegocio].filter(Boolean).join(" ");

  const clavesEspecificas = Object.keys(PORTADAS_POR_GIRO).filter(
    (k) => !CLAVES_GIRO_GENERALES.includes(k)
  );

  // 1) Coincidencia directa en el giro escrito (clave exacta o sinónimo)
  if (giroEscrito && !CLAVES_GIRO_GENERALES.includes(giroEscrito)) {
    if (PORTADAS_POR_GIRO[giroEscrito]) {
      return giroEscrito;
    }
    for (const clave of clavesEspecificas) {
      const entrada = PORTADAS_POR_GIRO[clave];
      if ((entrada.sinonimos || []).includes(giroEscrito)) {
        return clave;
      }
    }
  }

  // 2) Puntuación abierta por sinónimos y palabras clave en giro escrito, nombre y oferta
  let mejorClave = "";
  let mejorPuntos = 0;
  for (const clave of clavesEspecificas) {
    const entrada = PORTADAS_POR_GIRO[clave];
    let puntos = 0;
    (entrada.sinonimos || []).forEach((sin) => {
      if (giroEscrito && coincideTerminoGen(giroEscrito, sin)) {
        puntos += giroEscrito === sin ? 24 : 12;
      } else if (textoNegocio && coincideTerminoGen(textoNegocio, sin)) {
        puntos += 6;
      }
    });
    (entrada.palabras || []).forEach((pal) => {
      if (giroEscrito && coincideTerminoGen(giroEscrito, pal)) {
        puntos += 5;
      }
      if (textoNegocio && coincideTerminoGen(textoNegocio, pal)) {
        puntos += 3;
      }
    });
    if (puntos > mejorPuntos) {
      mejorPuntos = puntos;
      mejorClave = clave;
    }
  }

  if (mejorClave && mejorPuntos > 0) {
    return mejorClave;
  }

  // 3) Si el giro no está en el mapa inicial ni hubo coincidencia específica,
  //    inferir la familia general según lo que describió el negocio
  const familiaDesdeTexto = normalizarGiro(textoCompleto);
  if (familiaDesdeTexto && PORTADAS_POR_GIRO[familiaDesdeTexto]) {
    return familiaDesdeTexto;
  }
  const familiaDesdeGiro = normalizarGiro(giroEscrito || giroBase);
  if (familiaDesdeGiro && PORTADAS_POR_GIRO[familiaDesdeGiro]) {
    return familiaDesdeGiro;
  }
  return "otro";
}

function obtenerOpcionesPortada(datosOGiro) {
  const clave = resolverTemaPortada(datosOGiro);
  const tema = PORTADAS_POR_GIRO[clave] || PORTADAS_POR_GIRO.otro;
  return (tema.fotos || []).map((f, idx) => ({
    url: f.url,
    etiqueta: f.etiqueta,
    giroClave: clave,
    giroEtiqueta: tema.etiqueta,
    indice: idx
  }));
}

function seleccionarPortadaNegocio(datos, variante, indiceForzado) {
  const info = datos && typeof datos === "object" ? datos : {};
  const claveTema = resolverTemaPortada(info);
  const tema = PORTADAS_POR_GIRO[claveTema] || PORTADAS_POR_GIRO.otro;
  const opciones = tema.fotos || [];
  const nombre = formatearNombrePropio(info.nombre, "nombre");
  const v = Math.abs(Number(variante) || 0);

  let idx = 0;
  if (Number.isInteger(indiceForzado)) {
    idx = ((indiceForzado % opciones.length) + opciones.length) % opciones.length;
  } else {
    const semillaTexto = normalizarTextoBusquedaGen(
      `${info.nombre || ""} ${info.giroTexto || info.giro || ""} ${info.oferta || ""}`
    );
    const baseIdx =
      CLAVES_GIRO_GENERALES.includes(claveTema) && semillaTexto
        ? calcularSemillaTextoGen(semillaTexto) % opciones.length
        : 0;
    idx = (baseIdx + v) % opciones.length;
  }

  const elegida = opciones[idx] || opciones[0];
  return {
    url: elegida.url,
    alt: nombre ? `${elegida.etiqueta} de ${nombre}` : elegida.etiqueta,
    giro: claveTema,
    giroEtiqueta: tema.etiqueta,
    indice: idx,
    total: opciones.length,
    etiqueta: elegida.etiqueta,
    origen: "catalogo"
  };
}

function obtenerSiguientePortada(datos, indiceActual, urlActual) {
  const info = datos && typeof datos === "object" ? datos : {};
  const claveTema = resolverTemaPortada(info);
  const tema = PORTADAS_POR_GIRO[claveTema] || PORTADAS_POR_GIRO.otro;
  const opciones = tema.fotos || [];
  let actual = Number.isInteger(indiceActual) ? indiceActual : -1;
  if (typeof urlActual === "string" && urlActual) {
    const porUrl = opciones.findIndex((op) => op.url === urlActual);
    if (porUrl !== -1) {
      actual = porUrl;
    }
  }
  const siguiente = actual >= 0 ? (actual + 1) % opciones.length : 0;
  return seleccionarPortadaNegocio(info, 0, siguiente);
}

function limpiarMencionesWhatsappSiVacio(texto, tieneWhatsapp) {
  let out = String(texto || "");
  if (tieneWhatsapp || !out) {
    return out;
  }
  out = out
    .replace(/\bav[ií]sanos\s+por\s+WhatsApp\b/gi, "pregunta en el local")
    .replace(/\bconfirmar\s+por\s+WhatsApp\b/gi, "confirmar en mostrador")
    .replace(/\bpor\s+WhatsApp\b/gi, "en el local")
    .replace(/\ben\s+WhatsApp\b/gi, "en el local")
    .replace(/\bdirecto\s+a\s+WhatsApp\b/gi, "directo en el local")
    .replace(/\bm[aá]ndanos\s+(?:un\s+)?(?:WhatsApp|mensaje)\b/gi, "pasa al local")
    .replace(/\benv[ií]anos\s+(?:un\s+)?(?:WhatsApp|mensaje)\b/gi, "pasa al local")
    .replace(/\bescr[ií]benos\s+(?:por\s+WhatsApp|antes\s+de\s+pasar|para\s+confirmar)\b/gi, "pregunta directo en mostrador")
    .replace(/\bescr[ií]benos\b/gi, "visítanos en el local")
    .replace(/\bWhatsApp\b/gi, "mostrador")
    .replace(/\s{2,}/g, " ")
    .trim();
  return out;
}

const STICKERS_POR_GIRO = {
  panaderia: {
    texto: "Recién horneado",
    icono: "horno",
    clase: "panaderia",
    forma: "seal",
    pos: "tr",
    tono: "claro"
  },
  ferreteria: {
    texto: "Pieza y mayoreo",
    icono: "llave",
    clase: "ferreteria",
    forma: "tag",
    pos: "bl",
    tono: "verde"
  },
  taqueria: {
    texto: "Al carbón",
    icono: "flama",
    clase: "taqueria",
    forma: "ribbon",
    pos: "br",
    tono: "verde"
  },
  cafeteria: {
    texto: "Grano al día",
    icono: "taza",
    clase: "cafeteria",
    forma: "ticket",
    pos: "tr",
    tono: "claro"
  },
  comida: {
    texto: "Sazón del día",
    icono: "flama",
    clase: "comida",
    forma: "ribbon",
    pos: "bl",
    tono: "verde"
  },
  tienda: {
    texto: "En mostrador",
    icono: "etiqueta",
    clase: "tienda",
    forma: "tag",
    pos: "br",
    tono: "verde"
  },
  "taller u oficio": {
    texto: "Trabajo directo",
    icono: "llave",
    clase: "taller",
    forma: "shield",
    pos: "tl",
    tono: "verde"
  },
  "salud y belleza": {
    texto: "Con cita previa",
    icono: "chispa",
    clase: "salud",
    forma: "burst",
    pos: "tr",
    tono: "claro"
  },
  servicios: {
    texto: "Trato directo",
    icono: "pin",
    clase: "servicios",
    forma: "ticket",
    pos: "br",
    tono: "claro"
  },
  otro: {
    texto: "Atención local",
    icono: "pin",
    clase: "otro",
    forma: "shield",
    pos: "bl",
    tono: "claro"
  }
};

function crearStickerElemento(stickerInfo) {
  if (!stickerInfo || !stickerInfo.texto || typeof document === "undefined") {
    return null;
  }
  const ns = "http://www.w3.org/2000/svg";
  const forma = stickerInfo.forma || "tag";
  const pos = stickerInfo.pos || "br";
  const tono = stickerInfo.tono === "verde" ? "verde" : "claro";

  const wrap = document.createElement("span");
  wrap.className = `biz-sticker biz-sticker-${stickerInfo.clase || "otro"} sticker-diecut sticker-pos-${pos} sticker-var-${forma}`;
  wrap.setAttribute("aria-hidden", "true");

  const cuerpo = document.createElement("span");
  cuerpo.className = `sticker-cutout sticker-shape-${forma} sticker-tone-${tono}`;

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.1");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.classList.add("biz-sticker-icon");

  const paths = {
    horno: ["M4 13a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3Z", "M8 10v2", "M12 9v3", "M16 10v2"],
    llave: ["M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2 2.3-2.3Z"],
    flama: ["M12 3c2.5 3.2 5 5.4 5 9a5 5 0 1 1-10 0c0-2.1 1-4.1 2.2-5.6.3 1.5 1.1 2.3 2.1 2.6-.3-2.1-.1-4.1.7-6Z"],
    taza: ["M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z", "M16 10h2a2.5 2.5 0 0 1 0 5h-2", "M8 5v1", "M12 4v2"],
    etiqueta: ["M3 10V4h6l10 10-6 6L3 10Z", "M7.5 7.5h.01"],
    chispa: ["M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z"],
    pin: ["M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z", "M12 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"]
  };
  (paths[stickerInfo.icono] || paths.pin).forEach((d) => {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  });

  const label = document.createElement("span");
  label.className = "sticker-label";
  label.textContent = stickerInfo.texto;
  cuerpo.appendChild(svg);
  cuerpo.appendChild(label);
  wrap.appendChild(cuerpo);
  return wrap;
}

function obtenerEstructuraNegocio(datos, detallesOpt) {
  const info = datos && typeof datos === "object" ? datos : {};
  const nombre = formatearNombrePropio(info.nombre, "nombre") || "tu negocio";
  const ciudad = formatearNombrePropio(info.ciudad, "ciudad") || "tu ciudad";
  const detalles = detallesOpt || extraerDetallesRealesUsuario(info);
  const temaEspecifico = resolverTemaPortada(info);

  let tipo = temaEspecifico && ESTRUCTURAS_ESPECIFICAS_GIRO[temaEspecifico] ? temaEspecifico : "";
  let base = tipo ? ESTRUCTURAS_ESPECIFICAS_GIRO[tipo] : null;

  if (!base) {
    tipo = PERFILES_GIRO[info.giro] ? info.giro : "";
    if (!tipo || tipo === "otro") {
      const inferido = normalizarGiro(
        `${info.giroTexto || ""} ${info.giro || ""} ${info.nombre || ""} ${info.oferta || ""}`
      );
      if (inferido && ESTRUCTURAS_POR_TIPO_NEGOCIO[inferido]) {
        tipo = inferido;
      }
    }
    base = ESTRUCTURAS_POR_TIPO_NEGOCIO[tipo] || ESTRUCTURAS_POR_TIPO_NEGOCIO.otro;
  }

  const lugar = fraseUbicacionCompleta(detalles.ubicacion, ciudad);
  const baseNota = base.notaSinWhatsapp
    ? base.notaSinWhatsapp.replace(/\{ubicacion\}/g, lugar).replace(/\{nombre\}/g, nombre)
    : `Atención en ${lugar}.`;
  const notaContactoSinWhatsapp = detalles.horario
    ? `${baseNota.replace(/\.+$/, "")} · ${detalles.horario}.`
    : baseNota;
  const stickerInfo =
    STICKERS_POR_GIRO[tipo] ||
    STICKERS_POR_GIRO[temaEspecifico] ||
    STICKERS_POR_GIRO[info.giro] ||
    STICKERS_POR_GIRO.otro;

  return {
    tipo: tipo || "otro",
    claseVisual: stickerInfo.clase || "otro",
    sticker: { ...stickerInfo },
    ordenSecciones: base.ordenSecciones.slice(),
    titulos: { ...base.titulos },
    ctaWhatsapp: base.ctaWhatsapp.replace(/\{nombre\}/g, nombre),
    notaContactoSinWhatsapp
  };
}

function esArchivoImagenValido(archivo) {
  if (!archivo || typeof archivo !== "object") {
    return false;
  }
  const tipo = String(archivo.type || "").toLowerCase();
  if (tipo.startsWith("image/")) {
    return true;
  }
  const nombre = String(archivo.name || "").toLowerCase();
  return !tipo && /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(nombre);
}

function comprimirImagenArchivoLocal(archivo, maxAncho) {
  return new Promise((resolve, reject) => {
    if (!esArchivoImagenValido(archivo)) {
      reject(new Error("Solo se permiten archivos de imagen."));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
    lector.onload = () => {
      const dataUrl = String(lector.result || "");
      if (!dataUrl.startsWith("data:image/")) {
        reject(new Error("El archivo no es una imagen válida."));
        return;
      }
      if (typeof Image !== "function" || typeof document === "undefined") {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          const limite = Number(maxAncho) > 0 ? Number(maxAncho) : 720;
          const escala = img.width > limite ? limite / img.width : 1;
          const w = Math.max(1, Math.round(img.width * escala));
          const h = Math.max(1, Math.round(img.height * escala));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const tipoSalida = archivo.type === "image/png" ? "image/png" : "image/jpeg";
          const resultado =
            tipoSalida === "image/jpeg"
              ? canvas.toDataURL("image/jpeg", 0.78)
              : canvas.toDataURL("image/png");
          resolve(resultado);
        } catch (error) {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    lector.readAsDataURL(archivo);
  });
}

function inferirEtiquetaGiroEspecifico(datos) {
  if (!datos || typeof datos !== "object") {
    return "";
  }
  const actual = limpiarTextoGen(datos.giroTexto || "");
  const actualNorm = normalizarTextoBusquedaGen(actual);
  const esGenerico = !actualNorm || CLAVES_GIRO_GENERALES.includes(actualNorm);
  if (!esGenerico) {
    return capitalizarGen(actual);
  }
  const tema = resolverTemaPortada(datos);
  if (tema && !CLAVES_GIRO_GENERALES.includes(tema) && PORTADAS_POR_GIRO[tema]) {
    return PORTADAS_POR_GIRO[tema].etiqueta || capitalizarGen(tema);
  }
  if (actual) {
    return capitalizarGen(actual);
  }
  return GIROS_ETIQUETAS[datos.giro] || "";
}

function generarBorradorNegocio(datos, variante) {
  const v = Math.abs(Number(variante) || 0);
  const nombre = formatearNombrePropio(datos.nombre, "nombre") || "Mi negocio";
  const giroTexto = quitarGuionesLargosGen(inferirEtiquetaGiroEspecifico(datos) || datos.giroTexto || "");
  const giroBase = PERFILES_GIRO[datos.giro] ? datos.giro : normalizarGiro(giroTexto || datos.giro) || "otro";
  const giro = PERFILES_GIRO[giroBase] ? giroBase : "otro";
  const ciudad = formatearNombrePropio(datos.ciudad, "ciudad") || "tu ciudad";
  const oferta = limpiarOfertaDeRelleno(datos.oferta) || "nuestros productos y servicios";
  const tono = TONOS_ETIQUETAS[datos.tono] ? datos.tono : "cercano";
  const whatsapp = limpiarDigitosGen(datos.whatsapp);
  const tieneWhatsapp = Boolean(whatsapp);

  const perfil = PERFILES_GIRO[giro];
  const ofertaLimpia = oferta.replace(/[.]+$/, "");
  const datosPortada = {
    nombre,
    ciudad,
    giro,
    giroTexto,
    oferta: ofertaLimpia,
    direccion: datos.direccion || "",
    horario: datos.horario || ""
  };
  const temaEspecifico = resolverTemaPortada(datosPortada);
  const copiaEsp = COPIA_ESPECIFICA_GIRO[temaEspecifico] || null;
  const detallesReales = extraerDetallesRealesUsuario(datos);
  const ofertaProductos = limpiarOfertaSoloProductos(ofertaLimpia, detallesReales);

  const variables = {
    nombre,
    ciudad,
    oferta: ofertaProductos.charAt(0).toLowerCase() + ofertaProductos.slice(1)
  };

  const titulo = quitarGuionesLargosGen(construirTituloGen(nombre, ciudad, ofertaProductos, giro, tono, v));

  let presentacion = "";
  if (copiaEsp && typeof copiaEsp.construirIntro === "function") {
    presentacion = quitarGuionesLargosGen(copiaEsp.construirIntro(variables, detallesReales, tieneWhatsapp));
  } else {
    const listaIntros =
      copiaEsp && copiaEsp.intro && (copiaEsp.intro[tono] || copiaEsp.intro.cercano)
        ? copiaEsp.intro[tono] || copiaEsp.intro.cercano
        : perfil.introduccion[tono] || perfil.introduccion.cercano;
    const plantillaIntro = listaIntros[v % listaIntros.length];
    presentacion = limpiarMencionesWhatsappSiVacio(
      quitarGuionesLargosGen(aplicarPlantillaGen(plantillaIntro, variables)),
      tieneWhatsapp
    );
    const lugar = fraseUbicacionCompleta(detallesReales.ubicacion, ciudad);
    if (detallesReales.ubicacion && !presentacion.toLowerCase().includes(detallesReales.ubicacion.toLowerCase())) {
      presentacion = `${presentacion} Estamos en ${lugar}.`;
    }
    if (detallesReales.horario && !presentacion.toLowerCase().includes(detallesReales.horario.toLowerCase())) {
      presentacion = `${presentacion} Abrimos ${detallesReales.horario}.`;
    }
  }

  const servicios = extraerServiciosGen(ofertaProductos, giro, tono, v, temaEspecifico, tieneWhatsapp);

  let beneficiosBase;
  if (copiaEsp && typeof copiaEsp.beneficios === "function") {
    beneficiosBase = copiaEsp.beneficios(variables, detallesReales, tieneWhatsapp).map((texto) =>
      quitarGuionesLargosGen(texto)
    );
  } else {
    const beneficiosFuente =
      copiaEsp && Array.isArray(copiaEsp.beneficios) ? copiaEsp.beneficios : perfil.beneficios[tono];
    beneficiosBase = beneficiosFuente.map((texto) =>
      limpiarMencionesWhatsappSiVacio(
        quitarGuionesLargosGen(aplicarPlantillaGen(texto, variables)),
        tieneWhatsapp
      )
    );
  }
  const beneficios =
    v % 2 === 1 && beneficiosBase.length > 1
      ? beneficiosBase.slice(1).concat(beneficiosBase[0])
      : beneficiosBase;

  let preguntasFrecuentes;
  if (copiaEsp && typeof copiaEsp.faqs === "function") {
    preguntasFrecuentes = copiaEsp.faqs(variables, detallesReales, tieneWhatsapp).map((item) => ({
      pregunta: quitarGuionesLargosGen(item.q),
      respuesta: quitarGuionesLargosGen(item.a)
    }));
  } else {
    const lugar = fraseUbicacionCompleta(detallesReales.ubicacion, ciudad);
    preguntasFrecuentes = perfil.faqs[tono]
      .map((item) => {
        const preg = limpiarMencionesWhatsappSiVacio(
          quitarGuionesLargosGen(aplicarPlantillaGen(item.q, variables)),
          tieneWhatsapp
        );
        let resp = limpiarMencionesWhatsappSiVacio(
          quitarGuionesLargosGen(aplicarPlantillaGen(item.a, variables)),
          tieneWhatsapp
        );
        const esFaqHorario = /horario|hora|abren|d[ií]as/i.test(preg);
        const esFaqUbic = /ubicaci[oó]n|d[oó]nde|direcci[oó]n|zona/i.test(preg);
        if (esFaqHorario) {
          if (!detallesReales.horario) {
            return null;
          }
          resp = `Atendemos ${detallesReales.horario}${detallesReales.ubicacion ? ` en ${lugar}` : ` en ${ciudad}`}.`;
        } else if (esFaqUbic) {
          if (!detallesReales.ubicacion) {
            return null;
          }
          resp = `Estamos en ${lugar}.`;
        } else if (detallesReales.precios && /precio|costo|cotiz/i.test(preg + " " + resp)) {
          resp = `Manejamos opciones ${detallesReales.precios} en ${variables.oferta}.`;
        }
        return { pregunta: preg, respuesta: resp };
      })
      .filter(Boolean);
  }

  const mensajeWhatsapp = construirMensajeWhatsappNegocioGen(nombre, tono);
  const portada = seleccionarPortadaNegocio(datosPortada, v);
  const estructura = obtenerEstructuraNegocio(datosPortada, detallesReales);

  return {
    titulo,
    presentacion,
    servicios,
    beneficios,
    preguntasFrecuentes,
    mensajeWhatsapp,
    whatsapp,
    portada,
    estructura,
    variante: v
  };
}

/* Intenta generar el borrador en el servidor (POST /api/generate).
   Devuelve el borrador en el mismo esquema que generarBorrador, o null
   si el servidor no responde, no está configurado o el texto no es válido.
   En ese caso el llamador usa el generador local como respaldo.
   La clave nunca sale del servidor y nunca llega a este archivo. */
async function generarBorradorConServicio(datos, variante) {
  try {
    if (typeof fetch !== "function") {
      return null;
    }
    const nombreFormateado = formatearNombrePropio(datos.nombre, "nombre");
    const ciudadFormateada = formatearNombrePropio(datos.ciudad, "ciudad");
    const ofertaLimpia = limpiarOfertaDeRelleno(datos.oferta);
    const whatsappLimpio = limpiarDigitosGen(datos.whatsapp);
    const tieneWhatsapp = Boolean(whatsappLimpio);
    const giroEspecifico = inferirEtiquetaGiroEspecifico(datos);
    const datosLimpios = {
      ...datos,
      nombre: nombreFormateado || limpiarTextoGen(datos.nombre),
      giroTexto: giroEspecifico || datos.giroTexto || "",
      ciudad: ciudadFormateada || limpiarTextoGen(datos.ciudad),
      oferta: ofertaLimpia || limpiarTextoGen(datos.oferta),
      direccion: esOmisionCampoOpcional(datos.direccion) ? "" : limpiarTextoGen(datos.direccion),
      horario: esOmisionCampoOpcional(datos.horario) ? "" : limpiarTextoGen(datos.horario),
      whatsapp: whatsappLimpio
    };
    const detallesReales = extraerDetallesRealesUsuario(datosLimpios);

    const ofertaConContexto = [
      datosLimpios.oferta,
      detallesReales.ubicacion && !datosLimpios.oferta.toLowerCase().includes(detallesReales.ubicacion.toLowerCase())
        ? `Ubicación: ${detallesReales.ubicacion}`
        : "",
      detallesReales.horario && !datosLimpios.oferta.toLowerCase().includes(detallesReales.horario.toLowerCase())
        ? `Horario: ${detallesReales.horario}`
        : ""
    ]
      .filter(Boolean)
      .join(". ");

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 15000);
    let respuesta;
    try {
      respuesta = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: datosLimpios.nombre || "",
          giro: datosLimpios.giroTexto || datosLimpios.giro || "",
          ciudad: datosLimpios.ciudad || "",
          oferta: ofertaConContexto || "",
          tono: datosLimpios.tono || "cercano",
          whatsapp: datosLimpios.whatsapp || "",
          variante: variante || 0
        }),
        signal: controlador.signal
      });
    } finally {
      clearTimeout(temporizador);
    }
    if (!respuesta || !respuesta.ok) {
      return null;
    }
    const payload = await respuesta.json();
    const b = payload && payload.borrador;
    if (!b || typeof b.titulo !== "string" || !b.titulo.trim()) {
      return null;
    }
    if (typeof b.presentacion !== "string" || !b.presentacion.trim()) {
      return null;
    }
    if (!Array.isArray(b.servicios) || b.servicios.length === 0) {
      return null;
    }
    if (!Array.isArray(b.beneficios) || b.beneficios.length === 0) {
      return null;
    }
    if (!Array.isArray(b.preguntasFrecuentes) || b.preguntasFrecuentes.length === 0) {
      return null;
    }
    const servicios = b.servicios
      .slice(0, 6)
      .map((s) => {
        if (typeof s === "string") {
          const tit = quitarGuionesLargosGen(s);
          return tit && !esFragmentoNoServicio(tit) ? { titulo: tit, descripcion: "" } : null;
        }
        if (s && typeof s === "object") {
          const tit = quitarGuionesLargosGen(s.titulo);
          if (!tit || esFragmentoNoServicio(tit)) {
            return null;
          }
          return {
            titulo: tit,
            descripcion: limpiarMencionesWhatsappSiVacio(quitarGuionesLargosGen(s.descripcion), tieneWhatsapp)
          };
        }
        return null;
      })
      .filter((s) => s && s.titulo);
    if (servicios.length === 0) {
      return null;
    }
    const v = Math.abs(Number(variante) || 0);
    const tituloLimpio = quitarGuionesLargosGen(b.titulo).replace(
      /,\s*(?:comida|tienda|servicios|otro|salud y belleza|taller u oficio)\s*$/i,
      ""
    );
    return {
      titulo: tituloLimpio || `${datosLimpios.nombre} en ${datosLimpios.ciudad}`,
      presentacion: limpiarMencionesWhatsappSiVacio(quitarGuionesLargosGen(b.presentacion), tieneWhatsapp),
      servicios,
      beneficios: b.beneficios
        .filter((x) => typeof x === "string" && x.trim())
        .slice(0, 6)
        .map((x) => limpiarMencionesWhatsappSiVacio(quitarGuionesLargosGen(x), tieneWhatsapp)),
      preguntasFrecuentes: b.preguntasFrecuentes
        .slice(0, 6)
        .map((f) => {
          if (!f || typeof f !== "object") {
            return null;
          }
          const pregunta = limpiarMencionesWhatsappSiVacio(quitarGuionesLargosGen(f.pregunta), tieneWhatsapp);
          const respuestaTexto = limpiarMencionesWhatsappSiVacio(quitarGuionesLargosGen(f.respuesta), tieneWhatsapp);
          return pregunta && respuestaTexto ? { pregunta, respuesta: respuestaTexto } : null;
        })
        .filter(Boolean),
      mensajeWhatsapp: construirMensajeWhatsappNegocioGen(
        datosLimpios.nombre,
        TONOS_ETIQUETAS[datosLimpios.tono] ? datosLimpios.tono : "cercano"
      ),
      whatsapp: whatsappLimpio,
      portada: seleccionarPortadaNegocio(datosLimpios, v),
      estructura: obtenerEstructuraNegocio(datosLimpios, detallesReales),
      variante: v
    };
  } catch (error) {
    return null;
  }
}

async function generarBorradorConDetalle(datos, variante) {
  const desdeServidor = await generarBorradorConServicio(datos, variante);
  if (desdeServidor) {
    return {
      borrador: desdeServidor,
      origen: "servidor"
    };
  }
  return {
    borrador: generarBorradorNegocio(datos, variante),
    origen: "local"
  };
}

function contienePlantillaLegadaBorrador(registro) {
  if (!registro || !registro.datos || !registro.borrador) {
    return false;
  }
  const b = registro.borrador;
  const wa = limpiarDigitosGen(registro.datos.whatsapp);
  const textoPlan = [
    b.titulo || "",
    b.presentacion || "",
    ...(Array.isArray(b.servicios) ? b.servicios.map((s) => `${s.titulo || ""} ${s.descripcion || ""}`) : []),
    ...(Array.isArray(b.beneficios) ? b.beneficios : []),
    ...(Array.isArray(b.preguntasFrecuentes)
      ? b.preguntasFrecuentes.map((f) => `${f.pregunta || ""} ${f.respuesta || ""}`)
      : [])
  ].join("\n");

  const patronesLegados = [
    /disponible al d[ií]a\.\s*si quieres apartar/i,
    /si quieres preguntar si hay existencia antes de darte la vuelta/i,
    /m[aá]ndanos un whatsapp y te respondemos en corto/i,
    /m[aá]ndanos mensaje y te pasamos la ubicaci[oó]n exacta/i,
    /pr[oó]ximamente enlace de whatsapp/i,
    /estamos,\s*col\./i,
    /horario:\s*[^.]+\.\s*ubicaci[oó]n:/i,
    /distintas medidas y calibres en\s+(?!tornill|clavo|pija|taquet|fijaci)/i,
    /horneado en tandas frescas para llevar por pieza o por charola en/i,
    /venta por pieza suelta, juego completo o lista de material en\s+(?!tornill|clavo|pija|taquet)/i,
    /horneamos\b.*\btodos los d[ií]as/i,
    /pregunta en mostrador por d[ií]as festivos/i,
    /atendemos de manera local en/i,
    /piezas variadas de vitrina elaboradas cada jornada para acompa[ñn]ar el caf[eé]/i,
    /de vainilla y chocolate con costra crujiente,\s*salidas del horno temprano/i,
    /corteza dorada y miga suave para tortas o para llevar a la mesa/i
  ];
  if (patronesLegados.some((rx) => rx.test(textoPlan))) {
    return true;
  }
  if (/,\s*(?:comida|tienda|servicios|otro|salud y belleza|taller u oficio)\s*$/i.test(String(b.titulo || ""))) {
    return true;
  }
  if (
    Array.isArray(b.servicios) &&
    b.servicios.some(
      (s) =>
        s &&
        typeof s.titulo === "string" &&
        (/\.\s*estamos\s*$/i.test(s.titulo) || /^estamos\b/i.test(s.titulo.trim()))
    )
  ) {
    return true;
  }
  if (!wa && /\b(?:whatsapp|m[aá]ndanos\s+(?:un\s+)?mensaje|escr[ií]benos|av[ií]sanos)\b/i.test(textoPlan)) {
    return true;
  }
  return false;
}

function sanearBorradorLegado(registro) {
  if (!registro || !registro.datos || !registro.borrador) {
    return false;
  }
  let cambio = false;

  // Actualizar etiquetas genéricas viejas ("Comida", "Tienda") al giro real detectado ("Panadería", "Ferretería")
  const giroEspecifico = inferirEtiquetaGiroEspecifico(registro.datos);
  const giroActualNorm = normalizarTextoBusquedaGen(registro.datos.giroTexto || "");
  if (
    giroEspecifico &&
    (!giroActualNorm || CLAVES_GIRO_GENERALES.includes(giroActualNorm)) &&
    giroEspecifico !== registro.datos.giroTexto
  ) {
    registro.datos.giroTexto = giroEspecifico;
    cambio = true;
  }

  const detallesReales = extraerDetallesRealesUsuario(registro.datos);
  if (contienePlantillaLegadaBorrador(registro)) {
    const varianteActual = Number.isInteger(registro.borrador.variante) ? registro.borrador.variante : 0;
    const portadaPrevia = registro.borrador.portada;
    const nuevo = generarBorradorNegocio(registro.datos, varianteActual);
    if (portadaPrevia && portadaPrevia.url) {
      nuevo.portada = portadaPrevia;
    }
    registro.borrador = nuevo;
    if (registro.diseno && typeof registro.diseno === "object") {
      const ordenAnterior = Array.isArray(registro.diseno.ordenSecciones)
        ? registro.diseno.ordenSecciones.join(",")
        : "";
      const esOrdenGenerico =
        !ordenAnterior ||
        ordenAnterior === "presentacion,servicios,beneficios,preguntas,contacto" ||
        ordenAnterior === "presentacion,servicios,beneficios,contacto,preguntas";
      if (esOrdenGenerico && nuevo.estructura && Array.isArray(nuevo.estructura.ordenSecciones)) {
        registro.diseno.ordenSecciones = nuevo.estructura.ordenSecciones.slice();
      }
    }
    if (registro.seo && typeof registro.seo === "object") {
      if (
        typeof registro.seo.titulo === "string" &&
        /,\s*(?:comida|tienda|servicios|otro|salud y belleza|taller u oficio)\b/i.test(registro.seo.titulo)
      ) {
        registro.seo.titulo = nuevo.titulo;
      }
      if (
        typeof registro.seo.descripcion === "string" &&
        (/disponible al d[ií]a/i.test(registro.seo.descripcion) || /estamos,\s*col\./i.test(registro.seo.descripcion))
      ) {
        registro.seo.descripcion = nuevo.presentacion.slice(0, 158);
      }
    }
    cambio = true;
  } else if (
    !registro.borrador.estructura ||
    typeof registro.borrador.estructura.notaContactoSinWhatsapp !== "string" ||
    !registro.borrador.estructura.notaContactoSinWhatsapp ||
    !registro.borrador.estructura.sticker
  ) {
    registro.borrador.estructura = obtenerEstructuraNegocio(registro.datos, detallesReales);
    cambio = true;
  }

  return cambio;
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

function distanciaDamerauGen(a, b) {
  const s1 = String(a || "");
  const s2 = String(b || "");
  const m = s1.length;
  const n = s2.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const costo = s1[i - 1] === s2[j - 1] ? 0 : 1;
      let val = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + costo);
      }
      dp[i][j] = val;
    }
  }
  return dp[m][n];
}

const ALIAS_FALTAS_CHAT = {
  sintryccuines: "instrucciones",
  sintrucciones: "instrucciones",
  istrucciones: "instrucciones",
  istruciones: "instrucciones",
  instrucsiones: "instrucciones",
  intrucciones: "instrucciones",
  log: "logo",
  loog: "logo",
  logoo: "logo",
  logotipo: "logo",
  canvia: "cambia",
  canbia: "cambia",
  camvia: "cambia",
  canviar: "cambiar",
  canbiar: "cambiar",
  kita: "quita",
  kitha: "quita",
  qita: "quita",
  kitar: "quitar",
  borar: "borrar",
  borra: "borra",
  wats: "whatsapp",
  watsap: "whatsapp",
  wasap: "whatsapp",
  wasapp: "whatsapp",
  whats: "whatsapp",
  whatsap: "whatsapp",
  wsp: "whatsapp",
  guats: "whatsapp",
  guatsap: "whatsapp",
  agrga: "agrega",
  agerga: "agrega",
  agregaa: "agrega",
  agreg: "agrega",
  añad: "agrega",
  anade: "agrega",
  sumale: "agrega",
  ponle: "pon",
  ponl: "pon",
  presios: "precios",
  presio: "precio",
  prezios: "precios",
  prezio: "precio",
  as: "haz",
  has: "haz",
  aser: "hacer",
  orario: "horario",
  horaro: "horario",
  orarios: "horarios",
  direcsion: "direccion",
  direcion: "direccion",
  direccon: "direccion",
  caye: "calle",
  uvicacion: "ubicacion",
  ubicason: "ubicacion",
  fot: "foto",
  fotos: "foto",
  imajen: "imagen",
  portda: "portada",
  plantiy: "plantilla",
  plantila: "plantilla",
  diseno: "diseno",
  diseo: "diseno",
  numro: "numero",
  telefon: "telefono",
  tel: "telefono",
  cel: "telefono",
  grnde: "grande",
  grand: "grande",
  visble: "visible",
  tno: "tono",
  profezional: "profesional",
  profecional: "profesional",
  sercano: "cercano",
  fomal: "formal",
  siudad: "ciudad",
  nonbre: "nombre",
  nombr: "nombre",
  ayud: "ayuda",
  ayudame: "ayuda",
  publicr: "publicar",
  publika: "publicar",
  grasias: "gracias",
  gracia: "gracias",
  ola: "hola"
};

const VOCABULARIO_CLAVE_CHAT = [
  "instrucciones",
  "ayuda",
  "logo",
  "whatsapp",
  "telefono",
  "numero",
  "cambia",
  "cambiar",
  "quita",
  "quitar",
  "borra",
  "borrar",
  "elimina",
  "eliminar",
  "agrega",
  "agregar",
  "incluye",
  "pon",
  "haz",
  "tono",
  "cercano",
  "profesional",
  "formal",
  "horario",
  "direccion",
  "calle",
  "ubicacion",
  "ciudad",
  "nombre",
  "foto",
  "portada",
  "imagen",
  "plantilla",
  "clasica",
  "editorial",
  "directa",
  "precios",
  "precio",
  "grande",
  "visible",
  "publicar",
  "enlace",
  "hola",
  "gracias"
];

function corregirTokenChatFuzzy(token) {
  const t = String(token || "").replace(/(.)\1{2,}/g, "$1$1");
  if (!t) return "";
  if (ALIAS_FALTAS_CHAT[t]) {
    return ALIAS_FALTAS_CHAT[t];
  }
  if (VOCABULARIO_CLAVE_CHAT.includes(t)) {
    return t;
  }
  const tSimple = t.replace(/(.)\1+/g, "$1");
  if (ALIAS_FALTAS_CHAT[tSimple]) {
    return ALIAS_FALTAS_CHAT[tSimple];
  }
  if (t.length < 4) {
    return t;
  }
  let mejor = "";
  let mejorDist = 99;
  const maxDist = t.length >= 8 ? 3 : t.length >= 5 ? 2 : 1;
  for (const cand of VOCABULARIO_CLAVE_CHAT) {
    if (Math.abs(cand.length - t.length) > maxDist) {
      continue;
    }
    const d = distanciaDamerauGen(t, cand);
    if (d <= maxDist && d < mejorDist) {
      mejorDist = d;
      mejor = cand;
    }
  }
  return mejor || t;
}

function normalizarMensajeChatFuzzy(texto) {
  const original = limpiarTextoGen(texto);
  const sinAcentos = original
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const tieneSignoPregunta = /[¿?]/.test(original);
  const limpioPuntuacion = sinAcentos
    .replace(/[¿?¡!.,;:()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokensRaw = limpioPuntuacion ? limpioPuntuacion.split(" ") : [];
  const tokens = tokensRaw.map((tok) => corregirTokenChatFuzzy(tok));
  return {
    original,
    tieneSignoPregunta,
    tokensRaw,
    tokens,
    normalizado: tokens.join(" ")
  };
}

function clasificarIntencionChat(texto, contexto) {
  const norm = normalizarMensajeChatFuzzy(texto);
  const frase = norm.normalizado;
  const tokens = norm.tokens;
  const has = (pal) => tokens.includes(pal);
  const any = (lista) => lista.some((p) => tokens.includes(p));

  if (!frase) {
    return { intencion: "vacio", norm };
  }

  // 1) Saludos o cierres breves (nunca tocan el borrador)
  if (
    tokens.length <= 4 &&
    any(["hola", "buenas", "buenos", "gracias", "ok", "listo", "perfecto", "genial", "va", "sale"]) &&
    !any(["cambia", "cambiar", "quita", "quitar", "borra", "elimina", "agrega", "agregar", "pon", "haz", "logo", "whatsapp", "horario", "direccion", "tono", "precios"])
  ) {
    return { intencion: "saludo", norm };
  }

  // 2) Solicitud de instrucciones o ayuda
  if (any(["instrucciones", "ayuda"]) || /\b(como\s+(?:funciona|edito|cambio|subo|publico|uso|hago)|que\s+hago)\b/.test(frase)) {
    return { intencion: "pregunta", tema: "instrucciones", norm };
  }

  // 3) Preguntas sobre el estado del borrador (logo, foto, horario, direccion, whatsapp, publicar)
  const parecePregunta =
    norm.tieneSignoPregunta ||
    /^(?:y\s+mi|donde|como|cuando|cual|cuanto|por\s+que|porque|tiene|puedo|se\s+puede|falta|falta\s+mi)\b/.test(frase);

  if (parecePregunta && !any(["agrega", "agregar", "quita", "quitar", "borra", "borrar", "elimina", "cambia", "cambiar"])) {
    if (has("logo")) return { intencion: "pregunta", tema: "logo", norm };
    if (any(["foto", "portada", "imagen"])) return { intencion: "pregunta", tema: "portada", norm };
    if (any(["whatsapp", "telefono", "numero"])) return { intencion: "pregunta", tema: "whatsapp", norm };
    if (has("horario")) return { intencion: "pregunta", tema: "horario", norm };
    if (any(["direccion", "calle", "ubicacion"])) return { intencion: "pregunta", tema: "direccion", norm };
    if (any(["publicar", "enlace"])) return { intencion: "pregunta", tema: "publicar", norm };
    if (any(["precio", "precios"])) return { intencion: "pregunta", tema: "precios", norm };
    if (has("tono")) return { intencion: "pregunta", tema: "tono", norm };
    if (has("plantilla")) return { intencion: "pregunta", tema: "plantilla", norm };
    return { intencion: "pregunta", tema: "general", norm };
  }

  // 4) Quitar / borrar elementos específicos
  if (any(["quita", "quitar", "borra", "borrar", "elimina", "eliminar", "saca"]) || /^sin\s+/.test(frase)) {
    if (any(["whatsapp", "telefono", "numero"])) {
      return { intencion: "quitar", objetivo: "whatsapp", norm };
    }
    if (has("logo")) {
      return { intencion: "quitar", objetivo: "logo", norm };
    }
    if (any(["foto", "portada", "imagen"])) {
      return { intencion: "quitar", objetivo: "portada", norm };
    }
    if (has("horario")) {
      return { intencion: "quitar", objetivo: "horario", norm };
    }
    if (any(["direccion", "calle", "ubicacion"])) {
      return { intencion: "quitar", objetivo: "direccion", norm };
    }
    const restoQuitar = norm.original
      .replace(/^(?:quita|quitar|kita|kitar|borra|borrar|elimina|eliminar|saca|sin)\s+(?:el|la|los|las|mi|de)?\s*/i, "")
      .trim();
    if (restoQuitar.length >= 2) {
      return { intencion: "quitar", objetivo: "servicio", valor: restoQuitar, norm };
    }
    return { intencion: "ambiguo", sugerencia: "quitar el WhatsApp, la portada o un producto", norm };
  }

  // 5) Cambiar tono, plantilla, horario, dirección, precios, ciudad, nombre, WhatsApp
  const tonoDetectado = any(["cercano"]) ? "cercano" : any(["profesional"]) ? "profesional" : any(["formal"]) ? "formal" : "";
  if (has("tono") || (tonoDetectado && (any(["cambia", "cambiar", "pon", "haz"]) || tokens.length <= 3))) {
    return { intencion: "cambiar", objetivo: "tono", valor: tonoDetectado, norm };
  }

  const plantillaDetectada = has("clasica") ? "clasica" : has("editorial") ? "editorial" : has("directa") ? "directa" : "";
  if (has("plantilla") || (plantillaDetectada && (any(["cambia", "cambiar", "pon", "usa"]) || tokens.length <= 3))) {
    return { intencion: "cambiar", objetivo: "plantilla", valor: plantillaDetectada, norm };
  }

  if (any(["precio", "precios"]) && !/\$\s*\d|\b\d+\s*(?:pesos|mxn)\b/i.test(norm.original)) {
    return { intencion: "cambiar", objetivo: "precios_sin_monto", norm };
  }

  if (has("horario")) {
    if (any(["grande", "visible", "arriba", "destaca", "mas"]) && !/\d/.test(norm.original)) {
      return { intencion: "cambiar", objetivo: "horario_destacado", norm };
    }
    const mHor = norm.original.match(/(?:horario(?:\s+a|\s+es|\s*:)?|abrimos|atendemos)\s+(.+)$/i);
    const valHor = mHor ? limpiarTextoGen(mHor[1]) : "";
    if (valHor && /\d/.test(valHor)) {
      return { intencion: "cambiar", objetivo: "horario", valor: valHor, norm };
    }
    return { intencion: "cambiar", objetivo: "horario_pedir", norm };
  }

  if (any(["direccion", "calle", "ubicacion"])) {
    const mDir = norm.original.match(/(?:direcci[oó]n|calle|ubicaci[oó]n|estamos\s+en)(?:\s+a|\s+es|\s*:)?\s+(.+)$/i);
    const valDir = mDir ? limpiarTextoGen(mDir[1]) : "";
    if (valDir.length >= 4 && !/^(?:mas|grande|visible)$/i.test(valDir)) {
      return { intencion: "cambiar", objetivo: "direccion", valor: valDir, norm };
    }
    return { intencion: "cambiar", objetivo: "direccion_pedir", norm };
  }

  if (any(["whatsapp", "telefono", "numero"])) {
    const digitos = limpiarDigitosGen(norm.original);
    if (digitos.length >= 10 && digitos.length <= 15) {
      return { intencion: "cambiar", objetivo: "whatsapp", valor: digitos, norm };
    }
    return { intencion: "pregunta", tema: "whatsapp", norm };
  }

  if (has("logo")) {
    return { intencion: "pregunta", tema: "logo", norm };
  }

  if (any(["foto", "portada", "imagen"]) && any(["cambia", "cambiar", "otra", "pon", "nueva", "sube", "subir"])) {
    return { intencion: "cambiar", objetivo: "portada", norm };
  }

  if (has("ciudad")) {
    const mCiu = norm.original.match(/ciudad(?:\s+a|\s+es|\s*:)?\s+(.+)$/i);
    if (mCiu && limpiarTextoGen(mCiu[1]).length >= 2) {
      return { intencion: "cambiar", objetivo: "ciudad", valor: formatearNombrePropio(mCiu[1], "ciudad"), norm };
    }
  }

  if (has("nombre")) {
    const mNom = norm.original.match(/nombre(?:\s+a|\s+es|\s*:)?\s+(.+)$/i);
    if (mNom && limpiarTextoGen(mNom[1]).length >= 2) {
      return { intencion: "cambiar", objetivo: "nombre", valor: formatearNombrePropio(mNom[1], "nombre"), norm };
    }
  }

  // 6) Agregar producto, servicio o precio concreto
  if (any(["agrega", "agregar", "incluye", "pon"])) {
    const rawDespues = norm.original
      .replace(/^(?:agrega|agrga|agerga|agregar|añade|anade|incluye|ponle|pon|suma|sumale)\s+(?:tambien|también|mas|más|un|una|unos|unas|el|la|los|las)?\s*/i, "")
      .trim();
    if (rawDespues.length >= 2 && !esOmisionCampoOpcional(rawDespues)) {
      const itemLimpio = capitalizarGen(rawDespues.replace(/[.!?]+$/, "").trim());
      return { intencion: "agregar", objetivo: "servicio", valor: itemLimpio, norm };
    }
    return { intencion: "ambiguo", sugerencia: "agregar un producto o servicio a tu lista", norm };
  }

  // 7) Si no coincide con ninguna intención clara, NUNCA pegar el texto al borrador
  let sugerencia = "cambiar el tono, agregar un producto o ajustar el horario";
  if (tokens.some((t) => distanciaDamerauGen(t, "tono") <= 2)) {
    sugerencia = "cambiar el tono de tu página";
  } else if (tokens.some((t) => distanciaDamerauGen(t, "horario") <= 2)) {
    sugerencia = "actualizar tu horario";
  } else if (tokens.some((t) => distanciaDamerauGen(t, "logo") <= 1)) {
    sugerencia = "subir o cambiar tu logo";
  } else if (tokens.some((t) => distanciaDamerauGen(t, "whatsapp") <= 3)) {
    sugerencia = "cambiar o quitar tu WhatsApp";
  }
  return { intencion: "ambiguo", sugerencia, norm };
}

window.dmdGenerador = {
  DOMINIO_PUBLICACION_DMD,
  GIROS_ETIQUETAS,
  TONOS_ETIQUETAS,
  PORTADAS_POR_GIRO,
  ESTRUCTURAS_POR_TIPO_NEGOCIO,
  limpiarTexto: limpiarTextoGen,
  limpiarDigitos: limpiarDigitosGen,
  quitarGuionesLargos: quitarGuionesLargosGen,
  esTextoRelleno: esTextoRellenoGen,
  esOmisionWhatsapp,
  esOmisionCampoOpcional,
  limpiarOfertaDeRelleno,
  formatearNombrePropio,
  normalizarSubdominio: normalizarSubdominioGen,
  validarSubdominio,
  normalizarGiro,
  inferirEtiquetaGiroEspecifico,
  normalizarTono,
  resolverTemaPortada,
  obtenerOpcionesPortada,
  seleccionarPortada: seleccionarPortadaNegocio,
  obtenerSiguientePortada,
  obtenerEstructuraNegocio,
  crearStickerElemento,
  sanearBorradorLegado,
  normalizarMensajeChatFuzzy,
  clasificarIntencionChat,
  esArchivoImagenValido,
  comprimirImagenArchivo: comprimirImagenArchivoLocal,
  generarBorrador: generarBorradorNegocio,
  generarBorradorConServicio,
  generarBorradorConDetalle,
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
