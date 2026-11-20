"use strict";

/* ==========================================================================
   dmd - Panel privado de operación (solo frontend con estados vacíos honestos)
   - Protegido por sesión real de dmdCuenta (nunca muestra datos sin sesión).
   - Nunca inventa usuarios, pagos, suscripciones ni estadísticas falsas.
   ========================================================================== */

(function inicializarPanelAdmin() {
  const API_ADMIN_BASE = "https://crear.dmdmx.dev/api/admin";

  function crearCelda(texto) {
    const td = document.createElement("td");
    td.textContent = texto || "Sin dato";
    return td;
  }

  function renderizarTabla(tbodyId, vacioId, filas, construirCeldas, mensajeVacio) {
    const tbody = document.getElementById(tbodyId);
    const vacio = document.getElementById(vacioId);
    if (!tbody || !vacio) {
      return;
    }
    tbody.textContent = "";

    if (!Array.isArray(filas) || filas.length === 0) {
      vacio.textContent = mensajeVacio;
      vacio.hidden = false;
      return;
    }

    vacio.hidden = true;
    filas.forEach((item) => {
      const tr = document.createElement("tr");
      construirCeldas(item).forEach((valor) => {
        tr.appendChild(crearCelda(valor));
      });
      tbody.appendChild(tr);
    });
  }

  async function consultarResumenReal() {
    const controlador = typeof AbortController === "function" ? new AbortController() : null;
    const temporizador = controlador ? window.setTimeout(() => controlador.abort(), 8000) : null;
    try {
      const resp = await window.fetch(`${API_ADMIN_BASE}/overview`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        signal: controlador ? controlador.signal : undefined
      });
      if (resp.status === 401 || resp.status === 403) {
        return { ok: false, denegado: true, sinConexion: false, data: null };
      }
      if (!resp.ok) {
        return { ok: false, denegado: false, sinConexion: resp.status >= 500 || resp.status === 404, data: null };
      }
      const data = await resp.json().catch(() => null);
      return { ok: Boolean(data), denegado: false, sinConexion: false, data };
    } catch (error) {
      return { ok: false, denegado: false, sinConexion: true, data: null };
    } finally {
      if (temporizador) {
        window.clearTimeout(temporizador);
      }
    }
  }

  function montar() {
    const cargandoEl = document.getElementById("admin-cargando");
    const bloqueadoEl = document.getElementById("admin-bloqueado");
    const bloqueadoBadge = document.getElementById("admin-bloqueado-badge");
    const bloqueadoTitulo = document.getElementById("titulo-admin-bloqueado");
    const bloqueadoMsg = document.getElementById("admin-bloqueado-msg");
    const bloqueadoEstado = document.getElementById("admin-bloqueado-estado");
    const btnReintentar = document.getElementById("btn-admin-reintentar");

    const contenidoEl = document.getElementById("admin-contenido");
    const usuarioNombreEl = document.getElementById("admin-usuario-nombre");
    const usuarioCorreoEl = document.getElementById("admin-usuario-correo");
    const estadoDatosEl = document.getElementById("admin-estado-datos");
    const btnActualizar = document.getElementById("btn-admin-actualizar");
    const btnCerrarSesion = document.getElementById("btn-admin-cerrar-sesion");

    const kpiUsuarios = document.getElementById("kpi-usuarios");
    const kpiSuscripciones = document.getElementById("kpi-suscripciones");
    const kpiPagos = document.getElementById("kpi-pagos");
    const kpiCancelaciones = document.getElementById("kpi-cancelaciones");

    const tabBtns = Array.from(document.querySelectorAll("[data-admin-tab]"));
    const paneles = {
      usuarios: document.getElementById("admin-panel-usuarios"),
      suscripciones: document.getElementById("admin-panel-suscripciones"),
      pagos: document.getElementById("admin-panel-pagos"),
      cancelaciones: document.getElementById("admin-panel-cancelaciones")
    };

    function cambiarTab(clave) {
      tabBtns.forEach((btn) => {
        const activo = btn.dataset.adminTab === clave;
        btn.classList.toggle("edtab-active", activo);
        btn.setAttribute("aria-selected", activo ? "true" : "false");
      });
      Object.keys(paneles).forEach((k) => {
        if (paneles[k]) {
          paneles[k].hidden = k !== clave;
        }
      });
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => cambiarTab(btn.dataset.adminTab));
    });

    function mostrarEstadoVacioDatos(mensajeBanner) {
      if (estadoDatosEl) {
        estadoDatosEl.textContent = mensajeBanner;
      }
      if (kpiUsuarios) kpiUsuarios.textContent = "Sin datos";
      if (kpiSuscripciones) kpiSuscripciones.textContent = "Sin datos";
      if (kpiPagos) kpiPagos.textContent = "Sin datos";
      if (kpiCancelaciones) kpiCancelaciones.textContent = "Sin datos";

      renderizarTabla("tbody-admin-usuarios", "vacio-admin-usuarios", [], () => [], "Sin datos todavía. El servicio de administración no devolvió registros.");
      renderizarTabla("tbody-admin-suscripciones", "vacio-admin-suscripciones", [], () => [], "Sin datos todavía. Las suscripciones reales aparecerán cuando el servicio esté disponible.");
      renderizarTabla("tbody-admin-pagos", "vacio-admin-pagos", [], () => [], "Sin datos todavía. No se muestran pagos ni cifras inventadas.");
      renderizarTabla("tbody-admin-cancelaciones", "vacio-admin-cancelaciones", [], () => [], "Sin datos todavía. Las cancelaciones reales aparecerán aquí.");
    }

    async function cargarDatosOperacion() {
      if (estadoDatosEl) {
        estadoDatosEl.textContent = "Consultando registros reales...";
      }
      const res = await consultarResumenReal();

      if (res.denegado) {
        if (contenidoEl) contenidoEl.hidden = true;
        if (bloqueadoEl) bloqueadoEl.hidden = false;
        if (bloqueadoBadge) bloqueadoBadge.textContent = "Sin permiso";
        if (bloqueadoTitulo) bloqueadoTitulo.textContent = "Esta cuenta no tiene acceso de administración";
        if (bloqueadoMsg) {
          bloqueadoMsg.textContent = "Solo la cuenta del propietario puede consultar este panel.";
        }
        return;
      }

      if (!res.ok || !res.data) {
        mostrarEstadoVacioDatos(
          "Servicio de administración no disponible todavía. Esta vista solo muestra datos reales y nunca inventa usuarios ni pagos."
        );
        return;
      }

      const d = res.data;
      const usuarios = Array.isArray(d.users) ? d.users : Array.isArray(d.usuarios) ? d.usuarios : [];
      const suscripciones = Array.isArray(d.subscriptions) ? d.subscriptions : Array.isArray(d.suscripciones) ? d.suscripciones : [];
      const pagos = Array.isArray(d.payments) ? d.payments : Array.isArray(d.pagos) ? d.pagos : [];
      const cancelaciones = Array.isArray(d.cancellations) ? d.cancellations : Array.isArray(d.cancelaciones) ? d.cancelaciones : [];

      if (kpiUsuarios) kpiUsuarios.textContent = String(usuarios.length);
      if (kpiSuscripciones) kpiSuscripciones.textContent = String(suscripciones.length);
      if (kpiPagos) kpiPagos.textContent = String(pagos.length);
      if (kpiCancelaciones) kpiCancelaciones.textContent = String(cancelaciones.length);
      if (estadoDatosEl) estadoDatosEl.textContent = "Datos sincronizados con el servidor.";

      renderizarTabla(
        "tbody-admin-usuarios",
        "vacio-admin-usuarios",
        usuarios,
        (u) => [u.name || u.nombre, u.email || u.correo, u.created_at || u.fecha, u.status || u.estado || "Activo"],
        "Sin usuarios registrados todavía."
      );
      renderizarTabla(
        "tbody-admin-suscripciones",
        "vacio-admin-suscripciones",
        suscripciones,
        (s) => [s.email || s.correo, s.plan, s.amount ? `$${s.amount} MXN` : "", s.status || s.estado, s.created_at || s.fecha],
        "Sin suscripciones registradas todavía."
      );
      renderizarTabla(
        "tbody-admin-pagos",
        "vacio-admin-pagos",
        pagos,
        (p) => [p.id || p.reference, p.email || p.correo, p.plan, p.amount ? `$${p.amount} MXN` : "", p.created_at || p.fecha],
        "Sin pagos registrados todavía."
      );
      renderizarTabla(
        "tbody-admin-cancelaciones",
        "vacio-admin-cancelaciones",
        cancelaciones,
        (c) => [c.email || c.correo, c.plan, c.cancelled_at || c.fecha, c.reason || c.motivo || "Sin motivo"],
        "Sin cancelaciones registradas todavía."
      );
    }

    async function sincronizarAcceso() {
      const verificada = window.dmdCuenta && typeof window.dmdCuenta.estaVerificada === "function"
        ? window.dmdCuenta.estaVerificada()
        : true;
      const sesion = window.dmdCuenta && typeof window.dmdCuenta.obtenerSesionActual === "function"
        ? window.dmdCuenta.obtenerSesionActual()
        : null;
      const errorSrv = window.dmdCuenta && typeof window.dmdCuenta.obtenerUltimoErrorServicio === "function"
        ? window.dmdCuenta.obtenerUltimoErrorServicio()
        : "";

      if (!verificada) {
        if (cargandoEl) cargandoEl.hidden = false;
        if (bloqueadoEl) bloqueadoEl.hidden = true;
        if (contenidoEl) contenidoEl.hidden = true;
        return;
      }

      if (cargandoEl) cargandoEl.hidden = true;

      if (!sesion) {
        if (contenidoEl) contenidoEl.hidden = true;
        if (bloqueadoEl) bloqueadoEl.hidden = false;
        if (errorSrv) {
          if (bloqueadoBadge) bloqueadoBadge.textContent = "Servicio no disponible";
          if (bloqueadoTitulo) bloqueadoTitulo.textContent = "No se puede verificar el acceso ahora";
          if (bloqueadoMsg) {
            bloqueadoMsg.textContent =
              "El servicio de cuentas está fuera de línea en este momento. Por seguridad, el panel permanece bloqueado hasta confirmar una sesión válida.";
          }
        } else {
          if (bloqueadoBadge) bloqueadoBadge.textContent = "Acceso restringido";
          if (bloqueadoTitulo) bloqueadoTitulo.textContent = "Se requiere sesión del propietario";
          if (bloqueadoMsg) {
            bloqueadoMsg.textContent =
              "Inicia sesión con tu cuenta autorizada para consultar usuarios, suscripciones, pagos y cancelaciones.";
          }
        }
        return;
      }

      if (bloqueadoEl) bloqueadoEl.hidden = true;
      if (contenidoEl) contenidoEl.hidden = false;
      if (usuarioNombreEl) usuarioNombreEl.textContent = sesion.nombre;
      if (usuarioCorreoEl) usuarioCorreoEl.textContent = sesion.correo ? ` · ${sesion.correo}` : "";
      await cargarDatosOperacion();
    }

    if (btnReintentar) {
      btnReintentar.addEventListener("click", async () => {
        if (!window.dmdCuenta || typeof window.dmdCuenta.verificarSesion !== "function") return;
        btnReintentar.disabled = true;
        btnReintentar.textContent = "Comprobando...";
        if (bloqueadoEstado) bloqueadoEstado.textContent = "";
        const res = await window.dmdCuenta.verificarSesion();
        btnReintentar.disabled = false;
        btnReintentar.textContent = "Comprobar de nuevo";
        if (res && res.sinConexion && bloqueadoEstado) {
          bloqueadoEstado.textContent = "El servicio de cuentas sigue fuera de línea por el momento.";
        }
        sincronizarAcceso();
      });
    }

    if (btnActualizar) {
      btnActualizar.addEventListener("click", cargarDatosOperacion);
    }

    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener("click", async () => {
        if (!window.dmdCuenta || typeof window.dmdCuenta.cerrarSesion !== "function") return;
        btnCerrarSesion.disabled = true;
        await window.dmdCuenta.cerrarSesion();
        btnCerrarSesion.disabled = false;
        sincronizarAcceso();
      });
    }

    if (window.dmdCuenta && typeof window.dmdCuenta.alCambiarSesion === "function") {
      window.dmdCuenta.alCambiarSesion(sincronizarAcceso);
    }
    sincronizarAcceso();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montar);
  } else {
    montar();
  }
})();
