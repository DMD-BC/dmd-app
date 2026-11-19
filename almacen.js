"use strict";

/* ==========================================================================
   dmd - Almacenamiento local en navegador (producción)
   Fuente principal y respaldos en orden consistente con las mismas 7 claves:
   1) localStorage (fuente principal)
   2) sessionStorage
   3) window.name
   4) IndexedDB
   5) Cache Storage API
   Nunca guarda datos de tarjeta ni información de pago.
   ========================================================================== */

(function inicializarAlmacenDmd() {
  const CLAVES_PERMITIDAS = [
    "dmd_cuentas_v1",
    "dmd_sesion_v1",
    "dmd_conversaciones_v1",
    "dmd_conversacion_activa_v1",
    "dmd_borradores_v1",
    "dmd_borrador_activo_v1",
    "dmd_paginas_publicadas_v1"
  ];

  function obtenerLocalStorage() {
    try {
      return window.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function obtenerSessionStorage() {
    try {
      return window.sessionStorage || null;
    } catch (error) {
      return null;
    }
  }

  // Seguridad: nunca guardar datos de tarjeta ni métodos de pago en el navegador.
  try {
    const ls = obtenerLocalStorage();
    if (ls) {
      ls.removeItem("dmd_metodos_pago_v1");
    }
    const ss = obtenerSessionStorage();
    if (ss) {
      ss.removeItem("dmd_metodos_pago_v1");
    }
  } catch (error) {
    // Ignorar si el almacenamiento del navegador está restringido.
  }

  const CLAVE_META_TS = "dmd_estado_actualizado_en_v1";
  const PREFIJO_WINDOW_NAME = "DMD_ESTADO_V1:";
  const IDB_NOMBRE = "dmd_almacen_local_v1";
  const IDB_TIENDA = "estado";
  const IDB_CLAVE = "snapshot";
  const CACHE_NOMBRE = "dmd_almacen_cache_v1";
  const CACHE_CLAVE_URL = "/_dmd_cache_estado_v1";

  const escuchasHidratacion = [];
  let escrituraLocalRealizada = false;
  let hidratacionCompleta = false;
  let hidratadoConDatosNuevos = false;
  let colaRespaldoAsync = Promise.resolve(true);

  function clonar(valor) {
    if (valor === undefined || valor === null) {
      return valor;
    }
    try {
      return JSON.parse(JSON.stringify(valor));
    } catch (error) {
      return valor;
    }
  }

  function filtrarDatos(objeto) {
    const limpio = {};
    if (!objeto || typeof objeto !== "object") {
      return limpio;
    }
    CLAVES_PERMITIDAS.forEach((clave) => {
      if (Object.prototype.hasOwnProperty.call(objeto, clave)) {
        limpio[clave] = objeto[clave];
      }
    });
    return limpio;
  }

  function tieneContenidoReal(datos) {
    if (!datos || typeof datos !== "object") {
      return false;
    }
    if (datos.dmd_sesion_v1) {
      return true;
    }
    if (Array.isArray(datos.dmd_cuentas_v1) && datos.dmd_cuentas_v1.length > 0) {
      return true;
    }
    if (Array.isArray(datos.dmd_borradores_v1) && datos.dmd_borradores_v1.length > 0) {
      return true;
    }
    if (
      Array.isArray(datos.dmd_paginas_publicadas_v1) &&
      datos.dmd_paginas_publicadas_v1.length > 0
    ) {
      return true;
    }
    if (Array.isArray(datos.dmd_conversaciones_v1)) {
      return datos.dmd_conversaciones_v1.some((conv) => {
        if (!conv || typeof conv !== "object") {
          return false;
        }
        if (conv.borradorId) {
          return true;
        }
        return (
          Array.isArray(conv.mensajes) &&
          conv.mensajes.some((m) => m && m.rol === "usuario")
        );
      });
    }
    return false;
  }

  function parsearMetaTs(tsCrudo) {
    if (!tsCrudo || typeof tsCrudo !== "string") {
      return { ts: 0, vacioIntencional: false };
    }
    const partes = tsCrudo.split(":");
    const ts = Number(partes[0]);
    return {
      ts: Number.isFinite(ts) && ts > 0 ? ts : 0,
      vacioIntencional: partes[1] === "v"
    };
  }

  function leerDesdeWebStorage(storage) {
    try {
      if (!storage) {
        return null;
      }
      const datos = {};
      let encontroAlgo = false;

      CLAVES_PERMITIDAS.forEach((clave) => {
        const crudo = storage.getItem(clave);
        if (crudo !== null) {
          encontroAlgo = true;
          try {
            datos[clave] = JSON.parse(crudo);
          } catch (error) {
            datos[clave] = null;
          }
        }
      });

      const meta = parsearMetaTs(storage.getItem(CLAVE_META_TS));
      if (!encontroAlgo && meta.ts <= 0) {
        return null;
      }

      return {
        _actualizadoEn: meta.ts > 0 ? meta.ts : 1,
        _vacioIntencional: meta.vacioIntencional,
        datos
      };
    } catch (error) {
      return null;
    }
  }

  function escribirEnWebStorage(storage, snapshot) {
    try {
      if (!storage) {
        return false;
      }
      CLAVES_PERMITIDAS.forEach((clave) => {
        const valor = snapshot.datos[clave];
        if (valor === undefined || valor === null) {
          storage.removeItem(clave);
        } else {
          storage.setItem(clave, JSON.stringify(valor));
        }
      });
      const marcaTs = snapshot._vacioIntencional
        ? `${snapshot._actualizadoEn}:v`
        : String(snapshot._actualizadoEn);
      storage.setItem(CLAVE_META_TS, marcaTs);
      return true;
    } catch (error) {
      return false;
    }
  }

  function leerDesdeWindowName() {
    try {
      const nombre = typeof window.name === "string" ? window.name : "";
      if (!nombre.startsWith(PREFIJO_WINDOW_NAME)) {
        return null;
      }
      const parsed = JSON.parse(nombre.slice(PREFIJO_WINDOW_NAME.length));
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      const ts = Number(parsed._actualizadoEn);
      return {
        _actualizadoEn: Number.isFinite(ts) && ts > 0 ? ts : 1,
        _vacioIntencional: Boolean(parsed._vacioIntencional),
        datos: filtrarDatos(parsed.datos)
      };
    } catch (error) {
      return null;
    }
  }

  function escribirEnWindowName(snapshot) {
    try {
      window.name = PREFIJO_WINDOW_NAME + JSON.stringify(snapshot);
      return true;
    } catch (error) {
      return false;
    }
  }

  function abrirIndexedDB() {
    return new Promise((resolve) => {
      try {
        if (!window.indexedDB) {
          resolve(null);
          return;
        }
        const req = window.indexedDB.open(IDB_NOMBRE, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_TIENDA)) {
            db.createObjectStore(IDB_TIENDA);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (error) {
        resolve(null);
      }
    });
  }

  async function leerDesdeIndexedDB() {
    const db = await abrirIndexedDB();
    if (!db) {
      return null;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_TIENDA, "readonly");
        const req = tx.objectStore(IDB_TIENDA).get(IDB_CLAVE);
        req.onsuccess = () => {
          const val = req.result;
          db.close();
          if (!val || typeof val !== "object") {
            resolve(null);
            return;
          }
          const ts = Number(val._actualizadoEn);
          resolve({
            _actualizadoEn: Number.isFinite(ts) && ts > 0 ? ts : 0,
            _vacioIntencional: Boolean(val._vacioIntencional),
            datos: filtrarDatos(val.datos)
          });
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch (error) {
        try {
          db.close();
        } catch (cerrarError) {
          // Ignorar error al cerrar
        }
        resolve(null);
      }
    });
  }

  async function escribirEnIndexedDB(snapshot) {
    const db = await abrirIndexedDB();
    if (!db) {
      return false;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_TIENDA, "readwrite");
        tx.objectStore(IDB_TIENDA).put(clonar(snapshot), IDB_CLAVE);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          resolve(false);
        };
      } catch (error) {
        try {
          db.close();
        } catch (cerrarError) {
          // Ignorar error al cerrar
        }
        resolve(false);
      }
    });
  }

  async function leerDesdeCacheApi() {
    try {
      if (!window.caches || typeof window.caches.open !== "function") {
        return null;
      }
      const cache = await window.caches.open(CACHE_NOMBRE);
      const resp = await cache.match(CACHE_CLAVE_URL);
      if (!resp) {
        return null;
      }
      const parsed = await resp.json();
      if (!parsed || typeof parsed !== "object") {
        return null;
      }
      const ts = Number(parsed._actualizadoEn);
      return {
        _actualizadoEn: Number.isFinite(ts) && ts > 0 ? ts : 0,
        _vacioIntencional: Boolean(parsed._vacioIntencional),
        datos: filtrarDatos(parsed.datos)
      };
    } catch (error) {
      return null;
    }
  }

  async function escribirEnCacheApi(snapshot) {
    try {
      if (!window.caches || typeof window.caches.open !== "function") {
        return false;
      }
      const cache = await window.caches.open(CACHE_NOMBRE);
      const resp = new Response(JSON.stringify(snapshot), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
      await cache.put(CACHE_CLAVE_URL, resp);
      return true;
    } catch (error) {
      return false;
    }
  }

  function elegirMasReciente(candidatos) {
    let mejor = { _actualizadoEn: 0, _vacioIntencional: false, datos: {} };
    candidatos.forEach((cand) => {
      if (!cand || typeof cand._actualizadoEn !== "number") {
        return;
      }
      const datosLimpios = filtrarDatos(cand.datos);
      const candReal = tieneContenidoReal(datosLimpios);
      const candVacioInt = Boolean(cand._vacioIntencional);
      const candSignificativo = candReal || candVacioInt;

      const mejorReal = tieneContenidoReal(mejor.datos);
      const mejorSignificativo = mejorReal || Boolean(mejor._vacioIntencional);

      if (candSignificativo && !mejorSignificativo) {
        mejor = {
          _actualizadoEn: Math.max(cand._actualizadoEn, 1),
          _vacioIntencional: candVacioInt && !candReal,
          datos: datosLimpios
        };
      } else if (
        candSignificativo === mejorSignificativo &&
        cand._actualizadoEn > mejor._actualizadoEn
      ) {
        mejor = {
          _actualizadoEn: cand._actualizadoEn,
          _vacioIntencional: candVacioInt && !candReal,
          datos: datosLimpios
        };
      }
    });
    return mejor;
  }

  function escribirEnTodasLasCapas(snapshot) {
    const copia = clonar(snapshot);
    // Orden fijo de escritura en las 5 capas del navegador con las mismas 7 claves:
    // 1) localStorage, 2) sessionStorage, 3) window.name, 4) IndexedDB, 5) Cache Storage
    escribirEnWebStorage(obtenerLocalStorage(), copia);
    escribirEnWebStorage(obtenerSessionStorage(), copia);
    escribirEnWindowName(copia);
    colaRespaldoAsync = colaRespaldoAsync
      .catch(() => false)
      .then(() => Promise.all([escribirEnIndexedDB(copia), escribirEnCacheApi(copia)]))
      .then(() => true)
      .catch(() => false);
  }

  // Lectura síncrona inicial en orden: localStorage -> sessionStorage -> window.name
  let estadoActual = elegirMasReciente([
    leerDesdeWebStorage(obtenerLocalStorage()),
    leerDesdeWebStorage(obtenerSessionStorage()),
    leerDesdeWindowName()
  ]);

  if (
    estadoActual._actualizadoEn > 0 &&
    (tieneContenidoReal(estadoActual.datos) || estadoActual._vacioIntencional)
  ) {
    escribirEnWebStorage(obtenerLocalStorage(), estadoActual);
    escribirEnWebStorage(obtenerSessionStorage(), estadoActual);
    escribirEnWindowName(estadoActual);
  }

  function notificarHidratacion() {
    escuchasHidratacion.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        // Evitar que un fallo detenga otros módulos
      }
    });
  }

  // Hidratación completa respetando el orden de las 5 capas del navegador
  const promesaHidratacion = (async function hidratarAsincrono() {
    const [desdeIdb, desdeCache] = await Promise.all([
      leerDesdeIndexedDB(),
      leerDesdeCacheApi()
    ]);

    const mejorRespaldo = elegirMasReciente([
      leerDesdeWebStorage(obtenerLocalStorage()),
      leerDesdeWebStorage(obtenerSessionStorage()),
      leerDesdeWindowName(),
      desdeIdb,
      desdeCache
    ]);

    const actualSignificativo =
      tieneContenidoReal(estadoActual.datos) || Boolean(estadoActual._vacioIntencional);
    const respaldoSignificativo =
      tieneContenidoReal(mejorRespaldo.datos) || Boolean(mejorRespaldo._vacioIntencional);

    const respaldoSupera =
      (respaldoSignificativo && !actualSignificativo) ||
      (respaldoSignificativo === actualSignificativo &&
        mejorRespaldo._actualizadoEn > estadoActual._actualizadoEn);

    if (!escrituraLocalRealizada && respaldoSupera) {
      estadoActual = clonar(mejorRespaldo);
      escribirEnTodasLasCapas(estadoActual);
      hidratadoConDatosNuevos = true;
      hidratacionCompleta = true;
      notificarHidratacion();
      return;
    }

    hidratacionCompleta = true;
    if (actualSignificativo && estadoActual._actualizadoEn > 0) {
      escribirEnTodasLasCapas(estadoActual);
    }
  })();

  function respaldarAlSalir() {
    if (
      estadoActual._actualizadoEn > 0 &&
      (tieneContenidoReal(estadoActual.datos) || estadoActual._vacioIntencional)
    ) {
      escribirEnTodasLasCapas(estadoActual);
    }
  }

  window.addEventListener("pagehide", respaldarAlSalir);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      respaldarAlSalir();
    }
  });

  window.dmdAlmacen = {
    leer(clave, valorPorDefecto) {
      if (!CLAVES_PERMITIDAS.includes(clave)) {
        return valorPorDefecto;
      }
      if (!Object.prototype.hasOwnProperty.call(estadoActual.datos, clave)) {
        return valorPorDefecto;
      }
      const valor = estadoActual.datos[clave];
      return valor === undefined || valor === null ? valorPorDefecto : clonar(valor);
    },

    guardar(clave, valor, opciones) {
      if (!CLAVES_PERMITIDAS.includes(clave)) {
        return false;
      }
      escrituraLocalRealizada = true;
      estadoActual._actualizadoEn = Math.max(Date.now(), estadoActual._actualizadoEn + 1);
      if (valor === undefined || valor === null) {
        delete estadoActual.datos[clave];
      } else {
        estadoActual.datos[clave] = clonar(valor);
      }
      const permitirVacio = Boolean(opciones && opciones.permitirVacio);
      estadoActual._vacioIntencional = permitirVacio && !tieneContenidoReal(estadoActual.datos);
      escribirEnTodasLasCapas(estadoActual);
      return true;
    },

    guardarLote(mapa, opciones) {
      if (!mapa || typeof mapa !== "object") {
        return false;
      }
      let huboCambio = false;
      Object.keys(mapa).forEach((clave) => {
        if (!CLAVES_PERMITIDAS.includes(clave)) {
          return;
        }
        huboCambio = true;
        const valor = mapa[clave];
        if (valor === undefined || valor === null) {
          delete estadoActual.datos[clave];
        } else {
          estadoActual.datos[clave] = clonar(valor);
        }
      });
      if (!huboCambio) {
        return false;
      }
      escrituraLocalRealizada = true;
      estadoActual._actualizadoEn = Math.max(Date.now(), estadoActual._actualizadoEn + 1);
      const permitirVacio = Boolean(opciones && opciones.permitirVacio);
      estadoActual._vacioIntencional = permitirVacio && !tieneContenidoReal(estadoActual.datos);
      escribirEnTodasLasCapas(estadoActual);
      return true;
    },

    alHidratar(fn) {
      if (typeof fn !== "function") {
        return;
      }
      escuchasHidratacion.push(fn);
      if (hidratacionCompleta && hidratadoConDatosNuevos) {
        try {
          fn();
        } catch (error) {
          // Ignorar
        }
      }
    },

    estaHidratado() {
      return hidratacionCompleta;
    },

    esperarHidratacion() {
      return promesaHidratacion;
    },

    esperarSincronizacion() {
      return colaRespaldoAsync;
    }
  };
})();
