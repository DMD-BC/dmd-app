"use strict";
/* ==========================================================================
dmd - Autenticacion real via SSO de DMD (https://login.dmdmx.dev/api/auth/)
GET /api/auth/me
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
La sesion proviene unicamente del servidor, con cookie en .dmdmx.dev,
credentials include, sin cuentas locales ni en localStorage.
========================================================================== */
const API_AUTH_BASE = "https://login.dmdmx.dev/api/auth";
const URL_LOGIN_GOOGLE_SSO = "https://login.dmdmx.dev/";
const SOPORTA_FORGOT_PASSWORD = true;
function construirUrlGoogleSso() {
try {
const url = new URL(URL_LOGIN_GOOGLE_SSO);
url.searchParams.set("return_to", window.location.href);
return url.toString();
} catch (error) {
return URL_LOGIN_GOOGLE_SSO;
}
}
function esperar(ms) {
return new Promise((resolve) => window.setTimeout(resolve, ms));
}
function limpiarTextoCuenta(valor) {
return String(valor || "").replace(/\s+/g, " ").trim();
}
function normalizarCorreo(correo) {
return String(correo || "").trim().toLowerCase();
}
function esCorreoValido(correo) {
return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo);
}
(function limpiarResiduosAuthLocal() {
try {
if (window.localStorage) {
window.localStorage.removeItem("dmd_cuentas_v1");
window.localStorage.removeItem("dmd_sesion_v1");
}
if (window.sessionStorage) {
window.sessionStorage.removeItem("dmd_cuentas_v1");
window.sessionStorage.removeItem("dmd_sesion_v1");
}
} catch (error) {}
})();
function extraerCuotaTexto(data, usuario) {
const candidatos = [data && data.quota, data && data.cuota, usuario && usuario.quota, usuario && usuario.cuota];
for (let i = 0; i < candidatos.length; i += 1) {
const c = candidatos[i];
if (typeof c === "number" && Number.isFinite(c)) return { valor: c, texto: String(c) };
if (typeof c === "string" && c.trim() !== "") return { valor: c.trim(), texto: c.trim() };
if (c && typeof c === "object") {
const restante = c.remaining !== undefined ? c.remaining : c.disponible !== undefined ? c.disponible : null;
const limite = c.limit !== undefined ? c.limit : c.limite !== undefined ? c.limite : c.total !== undefined ? c.total : null;
const usado = c.used !== undefined ? c.used : c.usado !== undefined ? c.usado : null;
if (restante !== null && limite !== null) return { valor: c, texto: `${restante} de ${limite}` };
if (usado !== null && limite !== null) return { valor: c, texto: `${usado} / ${limite}` };
if (limite !== null) return { valor: c, texto: String(limite) };
if (restante !== null) return { valor: c, texto: String(restante) };
}
}
return { valor: null, texto: "" };
}
function normalizarUsuarioServidor(data) {
if (!data || typeof data !== "object") return null;
if (data.authenticated === false || data.loggedIn === false) return null;
const u = data.user && typeof data.user === "object" ? data.user : data.usuario && typeof data.usuario === "object" ? data.usuario : data;
const correo = normalizarCorreo(u.email || u.correo || "");
const idCrudo = u.id !== undefined && u.id !== null ? u.id : u._id !== undefined && u._id !== null ? u._id : u.userId !== undefined && u.userId !== null ? u.userId : u.sub || correo;
if (!idCrudo && !correo) return null;
const nombreBase = limpiarTextoCuenta(u.name || u.nombre || u.fullName || u.displayName || "");
const nombre = nombreBase || (correo ? correo.split("@")[0] : "Usuario");
const cuotaInfo = extraerCuotaTexto(data, u);
return { id: String(idCrudo), nombre, correo, cuota: cuotaInfo.valor, cuotaTexto: cuotaInfo.texto, db: data.db === true };
}
async function solicitarAuth(ruta, opciones) {
const metodo = (opciones && opciones.method) || "GET";
const fetchOpts = { method: metodo, credentials: "include", headers: { Accept: "application/json" } };
if (opciones && opciones.body !== undefined) {
fetchOpts.headers["Content-Type"] = "application/json";
fetchOpts.body = JSON.stringify(opciones.body);
}
let resp;
const controlador = typeof AbortController === "function" ? new AbortController() : null;
const temporizador = controlador ? window.setTimeout(() => controlador.abort(), 8000) : null;
if (controlador) fetchOpts.signal = controlador.signal;
try {
resp = await window.fetch(`${API_AUTH_BASE}${ruta}`, fetchOpts);
} catch (error) {
const esTimeout = Boolean(error && error.name === "AbortError");
return { ok: false, status: 0, sinConexion: true, timeout: esTimeout, data: null, mensaje: esTimeout ? "El servicio de cuentas tardó demasiado en responder. Intenta de nuevo." : "El servicio de cuentas no está disponible en este momento." };
} finally {
if (temporizador) window.clearTimeout(temporizador);
}
let data = null;
try { const texto = await resp.text(); data = texto ? JSON.parse(texto) : null; } catch (error) { data = null; }
if (!resp.ok) {
const mensajeServidor = (data && (data.error || data.message || data.mensaje)) || "";
const esErrorServidor = resp.status >= 500;
return { ok: false, status: resp.status, sinConexion: esErrorServidor, timeout: false, noAutenticado: resp.status === 401 || resp.status === 403, data, mensaje: mensajeServidor || (esErrorServidor ? "El servicio de inicio de sesión no está disponible en este momento." : "No se pudo completar la solicitud.") };
}
return { ok: true, status: resp.status, sinConexion: false, timeout: false, noAutenticado: false, data, mensaje: "" };
}
(function inicializarModuloCuenta() {
let sesionActual = null;
let verificacionInicialCompleta = false;
let ultimoErrorServicio = "";
let ultimoErrorFueTimeout = false;
const escuchasCambio = [];
function clonarSesion(sesion) { return sesion ? { ...sesion } : null; }
function notificarCambioSesion(motivo) {
const copia = clonarSesion(sesionActual);
escuchasCambio.forEach((fn) => { try { fn(copia, motivo || "cambio"); } catch (error) {} });
}
async function verificarSesionDesdeServidor(motivo) {
let res = await solicitarAuth("/me", { method: "GET" });
if (res.sinConexion && res.timeout) {
await esperar(800);
res = await solicitarAuth("/me", { method: "GET" });
}
if (res.sinConexion) {
ultimoErrorServicio = res.mensaje;
ultimoErrorFueTimeout = Boolean(res.timeout);
if (!res.timeout) sesionActual = null;
verificacionInicialCompleta = true;
notificarCambioSesion(motivo || "error");
return { ok: false, sinConexion: true, timeout: Boolean(res.timeout), sesion: clonarSesion(sesionActual), mensaje: res.mensaje };
}
ultimoErrorServicio = "";
ultimoErrorFueTimeout = false;
if (!res.ok) {
sesionActual = null;
verificacionInicialCompleta = true;
notificarCambioSesion(motivo || "me");
return { ok: true, sinConexion: false, timeout: false, sesion: null, mensaje: "" };
}
const usuario = normalizarUsuarioServidor(res.data);
sesionActual = usuario;
verificacionInicialCompleta = true;
notificarCambioSesion(motivo || "me");
return { ok: true, sinConexion: false, timeout: false, sesion: clonarSesion(sesionActual), mensaje: "" };
}
const promesaVerificacionInicial = verificarSesionDesdeServidor("me");
const dmdCuenta = {
apiAuthBase: API_AUTH_BASE,
urlGoogleSso: URL_LOGIN_GOOGLE_SSO,
soportaForgotPassword: SOPORTA_FORGOT_PASSWORD,
construirUrlGoogleSso,
obtenerSesionActual() { return clonarSesion(sesionActual); },
obtenerClavePropietario() { return sesionActual ? sesionActual.id : "invitado"; },
estaVerificada() { return verificacionInicialCompleta; },
obtenerUltimoErrorServicio() { return ultimoErrorServicio; },
obtenerUltimoErrorFueTimeout() { return ultimoErrorFueTimeout; },
esperarSesion() { return promesaVerificacionInicial.then(() => clonarSesion(sesionActual)); },
verificarSesion() { return verificarSesionDesdeServidor("me"); },
alCambiarSesion(callback) { if (typeof callback === "function") escuchasCambio.push(callback); },
async crearCuenta({ nombre, correo, password }) {
const nombreLimpio = limpiarTextoCuenta(nombre);
const correoLimpio = normalizarCorreo(correo);
const clave = String(password || "");
const res = await solicitarAuth("/register", { method: "POST", body: { name: nombreLimpio, email: correoLimpio, password: clave } });
if (!res.ok) return { ok: false, sinConexion: Boolean(res.sinConexion), campo: res.status === 409 ? "correo" : "", mensaje: res.status === 409 && !res.data ? "Ese correo ya tiene cuenta. Inicia sesión." : res.mensaje };
const verif = await verificarSesionDesdeServidor("registro");
if (verif.sesion) return { ok: true, sesion: verif.sesion };
const usuarioDirecto = normalizarUsuarioServidor(res.data);
if (usuarioDirecto) { sesionActual = usuarioDirecto; ultimoErrorServicio = ""; ultimoErrorFueTimeout = false; notificarCambioSesion("registro"); return { ok: true, sesion: clonarSesion(sesionActual) }; }
return { ok: false, sinConexion: Boolean(verif.sinConexion), mensaje: verif.mensaje || "La cuenta se registró, pero no se pudo confirmar la sesión con el servidor. Inicia sesión." };
},
async iniciarSesion({ correo, password }) {
const correoLimpio = normalizarCorreo(correo);
const clave = String(password || "");
const res = await solicitarAuth("/login", { method: "POST", body: { email: correoLimpio, password: clave } });
if (!res.ok) return { ok: false, sinConexion: Boolean(res.sinConexion), mensaje: res.noAutenticado && !(res.data && (res.data.error || res.data.message || res.data.mensaje)) ? "Correo o contraseña incorrectos." : res.mensaje };
const verif = await verificarSesionDesdeServidor("login");
if (verif.sesion) return { ok: true, sesion: verif.sesion };
const usuarioDirecto = normalizarUsuarioServidor(res.data);
if (usuarioDirecto) { sesionActual = usuarioDirecto; ultimoErrorServicio = ""; ultimoErrorFueTimeout = false; notificarCambioSesion("login"); return { ok: true, sesion: clonarSesion(sesionActual) }; }
return { ok: false, sinConexion: Boolean(verif.sinConexion), mensaje: verif.mensaje || "No se pudo confirmar la sesión con el servidor. Verifica que las cookies estén habilitadas." };
},
async cerrarSesion() {
const res = await solicitarAuth("/logout", { method: "POST" });
if (!res.ok && !res.noAutenticado) return { ok: false, sinConexion: Boolean(res.sinConexion), mensaje: res.mensaje };
sesionActual = null;
ultimoErrorServicio = "";
ultimoErrorFueTimeout = false;
notificarCambioSesion("logout");
return { ok: true };
},
async iniciarAccesoGoogle() {
const res = await solicitarAuth("/me", { method: "GET" });
if (res.sinConexion) {
ultimoErrorServicio = res.mensaje;
ultimoErrorFueTimeout = Boolean(res.timeout);
notificarCambioSesion("error");
return { ok: false, sinConexion: true, mensaje: "El acceso con Google no está disponible mientras el servicio de cuentas esté fuera de línea. Puedes crear y guardar tus borradores sin iniciar sesión." };
}
if (res.ok) {
const usuario = normalizarUsuarioServidor(res.data);
if (usuario) { sesionActual = usuario; ultimoErrorServicio = ""; ultimoErrorFueTimeout = false; notificarCambioSesion("me"); return { ok: true, yaAutenticado: true, sesion: clonarSesion(usuario) }; }
}
window.location.assign(construirUrlGoogleSso());
return { ok: true, redirigiendo: true };
},
async solicitarRecuperacionPassword(correo) {
const correoLimpio = normalizarCorreo(correo);
if (!esCorreoValido(correoLimpio)) return { ok: false, campo: "correo", mensaje: "Escribe un correo válido." };
const res = await solicitarAuth("/forgot-password", { method: "POST", body: { email: correoLimpio } });
if (res.sinConexion) {
ultimoErrorServicio = res.mensaje;
ultimoErrorFueTimeout = Boolean(res.timeout);
notificarCambioSesion("error");
return { ok: false, sinConexion: true, mensaje: res.mensaje || "El servicio de cuentas no está disponible en este momento." };
}
if (!res.ok) return { ok: false, sinConexion: false, mensaje: res.mensaje || "No se pudo enviar las instrucciones a ese correo." };
const msgServidor = res.data && typeof res.data === "object" ? (res.data.message || res.data.mensaje || "") : "";
return { ok: true, mensaje: msgServidor || "Revisa tu correo. Si esa dirección está registrada, te enviamos un enlace para restablecer tu contraseña." };
},
async enviarCodigoOtp(correo) {
const correoLimpio = normalizarCorreo(correo);
if (!esCorreoValido(correoLimpio)) return { ok: false, campo: "correo", mensaje: "Escribe un correo válido." };
const res = await solicitarAuth("/otp", { method: "POST", body: { action: "send", email: correoLimpio } });
if (res.sinConexion) {
ultimoErrorServicio = res.mensaje;
ultimoErrorFueTimeout = Boolean(res.timeout);
notificarCambioSesion("error");
return { ok: false, sinConexion: true, mensaje: res.mensaje || "El servicio de cuentas no está disponible en este momento." };
}
if (!res.ok || (res.data && res.data.ok === false)) return { ok: false, sinConexion: false, mensaje: res.mensaje || "No se pudo enviar el código. Inténtalo de nuevo." };
const msgServidor = res.data && typeof res.data === "object" ? (res.data.message || res.data.mensaje || "") : "";
return { ok: true, mensaje: msgServidor || "Si tu correo está registrado, te llegará un código de 6 dígitos." };
},
async verificarCodigoOtp(correo, codigo) {
const correoLimpio = normalizarCorreo(correo);
const codigoLimpio = String(codigo || "").replace(/\D+/g, "").trim();
if (!esCorreoValido(correoLimpio)) return { ok: false, campo: "correo", mensaje: "Escribe un correo válido." };
if (!/^\d{6}$/.test(codigoLimpio)) return { ok: false, campo: "codigo", mensaje: "Escribe el código numérico de 6 dígitos." };
const res = await solicitarAuth("/otp", { method: "POST", body: { action: "verify", email: correoLimpio, code: codigoLimpio } });
if (res.sinConexion) {
ultimoErrorServicio = res.mensaje;
ultimoErrorFueTimeout = Boolean(res.timeout);
notificarCambioSesion("error");
return { ok: false, sinConexion: true, mensaje: res.mensaje || "El servicio de cuentas no está disponible en este momento." };
}
if (!res.ok || (res.data && res.data.ok === false)) return { ok: false, sinConexion: false, mensaje: res.mensaje || "Código incorrecto o expirado. Pide uno nuevo." };
const verif = await verificarSesionDesdeServidor("otp");
if (verif.sesion) return { ok: true, sesion: verif.sesion };
const usuarioDirecto = normalizarUsuarioServidor(res.data);
if (usuarioDirecto) { sesionActual = usuarioDirecto; ultimoErrorServicio = ""; ultimoErrorFueTimeout = false; notificarCambioSesion("otp"); return { ok: true, sesion: clonarSesion(sesionActual) }; }
return { ok: false, sinConexion: Boolean(verif.sinConexion), mensaje: verif.mensaje || "No se pudo confirmar la sesión con el servidor." };
}
};
window.dmdCuenta = dmdCuenta;
const ICONO_OJO = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONO_OJO_TACHADO = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><line x1="3" y1="3" x2="21" y2="21"/><path d="M10.6 5.1A9.77 9.77 0 0 1 12 5c7 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.3"/><path d="M6.6 6.6A16.9 16.9 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/></svg>';
function montarInterfazCuenta() {
const seccion = document.getElementById("seccion-cuenta");
if (!seccion) return;
const cargandoEl = document.getElementById("cuenta-cargando");
const errorServicioBox = document.getElementById("cuenta-error-servicio");
const errorServicioMsg = document.getElementById("cuenta-error-servicio-msg");
const errorServicioHint = document.getElementById("cuenta-error-servicio-hint");
const btnReintentarAuth = document.getElementById("btn-reintentar-auth");
const vistaInvitado = document.getElementById("cuenta-invitado");
const vistaRecuperar = document.getElementById("vista-recuperar-password");
const vistaActiva = document.getElementById("cuenta-activa");
let vistaRecuperarActiva = false;
const estadoCuenta = document.getElementById("estado-cuenta");
const tabLogin = document.getElementById("tab-login");
const tabRegistro = document.getElementById("tab-registro");
const formLogin = document.getElementById("form-login");
const formRegistro = document.getElementById("form-registro");
const loginCorreo = document.getElementById("login-correo");
const loginPassword = document.getElementById("login-password");
const loginErrorGeneral = document.getElementById("error-login-general");
const loginErrorCorreo = document.getElementById("error-login-correo");
const loginErrorPassword = document.getElementById("error-login-password");
const btnIniciarSesion = document.getElementById("btn-iniciar-sesion");
const regNombre = document.getElementById("reg-nombre");
const regCorreo = document.getElementById("reg-correo");
const regPassword = document.getElementById("reg-password");
const pistaRegPassword = document.getElementById("pista-reg-password");
const regErrorGeneral = document.getElementById("error-reg-general");
const regErrorNombre = document.getElementById("error-reg-nombre");
const regErrorCorreo = document.getElementById("error-reg-correo");
const regErrorPassword = document.getElementById("error-reg-password");
const btnCrearCuenta = document.getElementById("btn-crear-cuenta");
const sesionNombreEl = document.getElementById("sesion-nombre");
const sesionCorreoEl = document.getElementById("sesion-correo");
const sesionCuotaEl = document.getElementById("sesion-cuota");
const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
let enviando = false;
let planEnUrl = "";
function fijarError(input, nodoError, mensaje) {
if (nodoError) nodoError.textContent = mensaje || "";
if (input) {
if (mensaje) { input.classList.add("is-invalid"); input.setAttribute("aria-invalid", "true"); }
else { input.classList.remove("is-invalid"); input.removeAttribute("aria-invalid"); }
}
}
function limpiarErroresAuth() {
fijarError(loginCorreo, loginErrorCorreo, "");
fijarError(loginPassword, loginErrorPassword, "");
loginErrorGeneral.textContent = ""; loginErrorGeneral.hidden = true;
fijarError(regNombre, regErrorNombre, "");
fijarError(regCorreo, regErrorCorreo, "");
fijarError(regPassword, regErrorPassword, "");
regErrorGeneral.textContent = ""; regErrorGeneral.hidden = true;
}
function cambiarPestana(modo) {
limpiarErroresAuth();
const esRegistro = modo === "registro";
tabLogin.setAttribute("aria-selected", esRegistro ? "false" : "true");
tabRegistro.setAttribute("aria-selected", esRegistro ? "true" : "false");
tabLogin.classList.toggle("auth-tab-active", !esRegistro);
tabRegistro.classList.toggle("auth-tab-active", esRegistro);
formLogin.hidden = esRegistro;
formRegistro.hidden = !esRegistro;
}
function actualizarPistaPasswordRegistro() {
if (!pistaRegPassword || !regPassword) return;
const len = regPassword.value.length;
if (len === 0) pistaRegPassword.textContent = "Usa al menos 6 caracteres.";
else if (len < 6) pistaRegPassword.textContent = `Faltan ${6 - len} caracteres para el mínimo de 6.`;
else pistaRegPassword.textContent = "Longitud válida (6 caracteres o más).";
}
function actualizarEstadoDisponibleFormularios(servicioCaido) {
const btnEnviarRec = document.getElementById("btn-enviar-recuperacion");
const btnRecReenviar = document.getElementById("btn-rec-reenviar");
const btnRecOtpEnviar = document.getElementById("btn-rec-otp-enviar");
const btnRecOtpVerificar = document.getElementById("btn-rec-otp-verificar");
const btnRecOtpReenviar = document.getElementById("btn-rec-otp-reenviar");
const btnRecGoogleEl = document.getElementById("btn-rec-google");
const estadoRecEl = document.getElementById("estado-rec-password");
const btnGoogleEl = document.getElementById("btn-login-google-sso");
const estadoGoogleEl = document.getElementById("estado-google-sso");
if (vistaInvitado) vistaInvitado.classList.toggle("auth-forms-offline", Boolean(servicioCaido));
[btnIniciarSesion, btnCrearCuenta, btnEnviarRec, btnRecReenviar, btnRecOtpEnviar, btnRecOtpVerificar, btnRecOtpReenviar, btnRecGoogleEl, btnGoogleEl].forEach((el) => { if (el) el.disabled = Boolean(servicioCaido); });
if (btnIniciarSesion && !enviando) btnIniciarSesion.textContent = "Iniciar sesión";
if (btnCrearCuenta && !enviando) btnCrearCuenta.textContent = "Crear cuenta";
if (estadoGoogleEl) estadoGoogleEl.textContent = servicioCaido ? "No disponible temporalmente mientras el servicio de cuentas está fuera de línea." : "Acceso rápido con tu cuenta de Google a través del servicio de cuentas de dmd.";
if (estadoRecEl && servicioCaido) { estadoRecEl.textContent = "La recuperación de contraseña no está disponible mientras el servicio de cuentas esté fuera de línea."; estadoRecEl.hidden = false; }
else if (estadoRecEl && !servicioCaido && /fuera de línea/i.test(estadoRecEl.textContent || "")) { estadoRecEl.textContent = ""; estadoRecEl.hidden = true; }
}
function actualizarVistaCuenta() {
const verificada = dmdCuenta.estaVerificada();
const sesion = dmdCuenta.obtenerSesionActual();
const errorSrv = dmdCuenta.obtenerUltimoErrorServicio();
const servicioCaido = Boolean(verificada && !sesion && errorSrv);
if (cargandoEl) cargandoEl.hidden = verificada;
if (errorServicioBox && errorServicioMsg) {
if (servicioCaido) {
errorServicioMsg.textContent = errorSrv;
if (errorServicioHint && dmdCuenta.obtenerUltimoErrorFueTimeout()) errorServicioHint.textContent = "El servicio de cuentas tardó demasiado en responder. Es posible que sea un problema temporal de conexión; puedes intentarlo de nuevo.";
errorServicioBox.hidden = false;
} else { errorServicioMsg.textContent = ""; errorServicioBox.hidden = true; }
}
if (!verificada) { vistaInvitado.hidden = true; vistaActiva.hidden = true; if (vistaRecuperar) vistaRecuperar.hidden = true; return; }
if (sesion) {
vistaRecuperarActiva = false;
vistaInvitado.hidden = true; vistaActiva.hidden = false; if (vistaRecuperar) vistaRecuperar.hidden = true;
actualizarEstadoDisponibleFormularios(false);
sesionNombreEl.textContent = sesion.nombre;
sesionCorreoEl.textContent = sesion.correo;
if (sesionCuotaEl) {
if (sesion.cuotaTexto) { sesionCuotaEl.textContent = `Cuota disponible: ${sesion.cuotaTexto}`; sesionCuotaEl.hidden = false; }
else { sesionCuotaEl.textContent = ""; sesionCuotaEl.hidden = true; }
}
} else {
const mostrarRec = Boolean(vistaRecuperar && vistaRecuperarActiva);
vistaInvitado.hidden = mostrarRec;
if (vistaRecuperar) vistaRecuperar.hidden = !mostrarRec;
vistaActiva.hidden = true;
actualizarEstadoDisponibleFormularios(servicioCaido);
}
}
async function manejarRegistro(evento) {
if (evento) { evento.preventDefault(); evento.stopPropagation(); }
if (enviando) return;
if (dmdCuenta.obtenerUltimoErrorServicio()) { regErrorGeneral.textContent = "El servicio de cuentas no está disponible ahora. Puedes seguir creando borradores en la app sin registrarte."; regErrorGeneral.hidden = false; return; }
limpiarErroresAuth(); estadoCuenta.textContent = "";
const nombre = limpiarTextoCuenta(regNombre.value);
const correo = normalizarCorreo(regCorreo.value);
const password = regPassword.value;
let primero = null;
if (nombre.length < 2) { fijarError(regNombre, regErrorNombre, "Escribe tu nombre."); primero = primero || regNombre; }
if (!esCorreoValido(correo)) { fijarError(regCorreo, regErrorCorreo, "Escribe un correo válido."); primero = primero || regCorreo; }
if (password.length < 6) { fijarError(regPassword, regErrorPassword, "La contraseña debe tener al menos 6 caracteres."); primero = primero || regPassword; }
if (primero) { primero.focus(); return; }
enviando = true; btnCrearCuenta.disabled = true; btnCrearCuenta.textContent = "Creando cuenta...";
try {
const resultado = await dmdCuenta.crearCuenta({ nombre, correo, password });
if (!resultado.ok) {
if (resultado.campo === "correo") { fijarError(regCorreo, regErrorCorreo, resultado.mensaje); regCorreo.focus(); }
else { regErrorGeneral.textContent = resultado.mensaje; regErrorGeneral.hidden = false; }
return;
}
formRegistro.reset(); actualizarPistaPasswordRegistro();
estadoCuenta.textContent = `Sesión iniciada: ${resultado.sesion.nombre}.`;
actualizarVistaCuenta();
} finally {
enviando = false;
btnCrearCuenta.disabled = Boolean(dmdCuenta.obtenerUltimoErrorServicio());
btnCrearCuenta.textContent = "Crear cuenta";
}
}
async function manejarLogin(evento) {
if (evento) { evento.preventDefault(); evento.stopPropagation(); }
if (enviando) return;
if (dmdCuenta.obtenerUltimoErrorServicio()) { loginErrorGeneral.textContent = "El servicio de cuentas no está disponible ahora. Puedes seguir creando borradores en la app sin iniciar sesión."; loginErrorGeneral.hidden = false; return; }
limpiarErroresAuth(); estadoCuenta.textContent = "";
const correo = normalizarCorreo(loginCorreo.value);
const password = loginPassword.value;
let primero = null;
if (!esCorreoValido(correo)) { fijarError(loginCorreo, loginErrorCorreo, "Escribe tu correo."); primero = primero || loginCorreo; }
if (password.length === 0) { fijarError(loginPassword, loginErrorPassword, "Escribe tu contraseña."); primero = primero || loginPassword; }
if (primero) { primero.focus(); return; }
enviando = true; btnIniciarSesion.disabled = true; btnIniciarSesion.textContent = "Iniciando sesión...";
try {
const resultado = await dmdCuenta.iniciarSesion({ correo, password });
if (!resultado.ok) { loginErrorGeneral.textContent = resultado.mensaje; loginErrorGeneral.hidden = false; loginPassword.focus(); return; }
formLogin.reset();
estadoCuenta.textContent = `Hola, ${resultado.sesion.nombre}.`;
actualizarVistaCuenta();
} finally {
enviando = false;
btnIniciarSesion.disabled = Boolean(dmdCuenta.obtenerUltimoErrorServicio());
btnIniciarSesion.textContent = "Iniciar sesión";
}
}
tabLogin.addEventListener("click", () => cambiarPestana("login"));
tabRegistro.addEventListener("click", () => cambiarPestana("registro"));
[tabLogin, tabRegistro].forEach((tab, indice) => {
tab.addEventListener("keydown", (e) => {
const tabs = [tabLogin, tabRegistro];
let siguiente = null;
if (e.key === "ArrowRight") siguiente = tabs[(indice + 1) % tabs.length];
else if (e.key === "ArrowLeft") siguiente = tabs[(indice + tabs.length - 1) % tabs.length];
else if (e.key === "Home") siguiente = tabs[0];
else if (e.key === "End") siguiente = tabs[tabs.length - 1];
if (!siguiente) return;
e.preventDefault();
cambiarPestana(siguiente === tabRegistro ? "registro" : "login");
siguiente.focus();
});
});
formRegistro.addEventListener("submit", manejarRegistro);
formLogin.addEventListener("submit", manejarLogin);
regNombre.addEventListener("input", () => fijarError(regNombre, regErrorNombre, ""));
regCorreo.addEventListener("input", () => fijarError(regCorreo, regErrorCorreo, ""));
regPassword.addEventListener("input", () => { fijarError(regPassword, regErrorPassword, ""); actualizarPistaPasswordRegistro(); });
loginCorreo.addEventListener("input", () => fijarError(loginCorreo, loginErrorCorreo, ""));
loginPassword.addEventListener("input", () => fijarError(loginPassword, loginErrorPassword, ""));
btnCerrarSesion.addEventListener("click", async () => {
if (enviando) return;
enviando = true; btnCerrarSesion.disabled = true; btnCerrarSesion.textContent = "Cerrando..."; estadoCuenta.textContent = "";
try {
const res = await dmdCuenta.cerrarSesion();
if (!res.ok) { estadoCuenta.textContent = res.mensaje; return; }
estadoCuenta.textContent = "Sesión cerrada.";
cambiarPestana("login"); actualizarVistaCuenta();
} finally { enviando = false; btnCerrarSesion.disabled = false; btnCerrarSesion.textContent = "Cerrar sesión"; }
});
if (btnReintentarAuth) {
btnReintentarAuth.addEventListener("click", async () => {
btnReintentarAuth.disabled = true; btnReintentarAuth.textContent = "Comprobando..."; estadoCuenta.textContent = "";
const res = await dmdCuenta.verificarSesion();
btnReintentarAuth.disabled = false; btnReintentarAuth.textContent = "Comprobar de nuevo";
if (res && res.sinConexion) {
if (errorServicioHint) errorServicioHint.textContent = "El servicio de cuentas sigue sin responder por ahora. No hace falta insistir; puedes crear y guardar tus borradores sin iniciar sesión.";
estadoCuenta.textContent = "El servicio de cuentas sigue fuera de línea por el momento.";
} else if (res && res.sesion) estadoCuenta.textContent = `Sesión verificada: ${res.sesion.nombre}.`;
else estadoCuenta.textContent = "Servicio de cuentas disponible. Ya puedes iniciar sesión.";
actualizarVistaCuenta();
});
}
const btnGoogleSso = document.getElementById("btn-login-google-sso");
const estadoGoogleSso = document.getElementById("estado-google-sso");
if (btnGoogleSso) {
btnGoogleSso.addEventListener("click", async () => {
if (enviando) return;
enviando = true; btnGoogleSso.disabled = true;
if (estadoGoogleSso) estadoGoogleSso.textContent = "Comprobando acceso con Google...";
try {
const res = await dmdCuenta.iniciarAccesoGoogle();
if (!res.ok && estadoGoogleSso) estadoGoogleSso.textContent = res.mensaje;
else if (res.yaAutenticado) actualizarVistaCuenta();
else if (res.redirigiendo && estadoGoogleSso) estadoGoogleSso.textContent = "Abriendo acceso seguro de tu cuenta dmd...";
} finally { enviando = false; btnGoogleSso.disabled = Boolean(dmdCuenta.obtenerUltimoErrorServicio()); }
});
}
const togglesPassword = Array.from(document.querySelectorAll("[data-toggle-password]"));
togglesPassword.forEach((btnToggle) => {
const targetId = btnToggle.getAttribute("data-toggle-password");
const campo = targetId ? document.getElementById(targetId) : null;
if (!campo) return;
btnToggle.addEventListener("click", () => {
const visible = campo.type === "text";
campo.type = visible ? "password" : "text";
btnToggle.innerHTML = visible ? ICONO_OJO : ICONO_OJO_TACHADO;
btnToggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
btnToggle.setAttribute("aria-pressed", visible ? "false" : "true");
campo.focus();
});
});
const btnAbrirRecuperar = document.getElementById("btn-abrir-recuperar");
const btnCerrarRecuperar = document.getElementById("btn-cerrar-recuperar");
const recSubtitulo = document.getElementById("rec-subtitulo");
const recMetodoEnlace = document.getElementById("rec-metodo-enlace");
const recMetodoOtp = document.getElementById("rec-metodo-otp");
const btnRecCambiarMetodo = document.getElementById("btn-rec-cambiar-metodo");
const formRecuperar = document.getElementById("form-recuperar-password");
const recCorreo = document.getElementById("rec-correo");
const errorRecGeneral = document.getElementById("error-rec-general");
const errorRecCorreo = document.getElementById("error-rec-correo");
const estadoRecPassword = document.getElementById("estado-rec-password");
const recReenviarWrap = document.getElementById("rec-reenviar-wrap");
const btnRecReenviar = document.getElementById("btn-rec-reenviar");
const btnEnviarRecuperacion = document.getElementById("btn-enviar-recuperacion");
const errorRecOtpGeneral = document.getElementById("error-rec-otp-general");
const estadoRecOtp = document.getElementById("estado-rec-otp");
const formRecOtpEnviar = document.getElementById("form-rec-otp-enviar");
const recOtpCorreo = document.getElementById("rec-otp-correo");
const errorRecOtpCorreo = document.getElementById("error-rec-otp-correo");
const btnRecOtpEnviar = document.getElementById("btn-rec-otp-enviar");
const formRecOtpVerificar = document.getElementById("form-rec-otp-verificar");
const recOtpCodigo = document.getElementById("rec-otp-codigo");
const errorRecOtpCodigo = document.getElementById("error-rec-otp-codigo");
const btnRecOtpVerificar = document.getElementById("btn-rec-otp-verificar");
const btnRecOtpReenviar = document.getElementById("btn-rec-otp-reenviar");
const btnRecGoogle = document.getElementById("btn-rec-google");
const estadoRecGoogle = document.getElementById("estado-rec-google");
const btnRecCrearCuenta = document.getElementById("btn-rec-crear-cuenta");
let metodoRecuperacion = "enlace";
let recOtpCorreoActivo = "";
function limpiarMensajesRecuperacion() {
fijarError(recCorreo, errorRecCorreo, "");
fijarError(recOtpCorreo, errorRecOtpCorreo, "");
fijarError(recOtpCodigo, errorRecOtpCodigo, "");
if (errorRecGeneral) { errorRecGeneral.textContent = ""; errorRecGeneral.hidden = true; }
if (estadoRecPassword) { estadoRecPassword.textContent = ""; estadoRecPassword.hidden = true; }
if (recReenviarWrap) recReenviarWrap.hidden = true;
if (errorRecOtpGeneral) { errorRecOtpGeneral.textContent = ""; errorRecOtpGeneral.hidden = true; }
if (estadoRecOtp) { estadoRecOtp.textContent = ""; estadoRecOtp.hidden = true; }
if (formRecOtpEnviar) formRecOtpEnviar.hidden = false;
if (formRecOtpVerificar) formRecOtpVerificar.hidden = true;
if (recOtpCodigo) recOtpCodigo.value = "";
recOtpCorreoActivo = "";
}
function fijarMetodoRecuperacion(nuevoMetodo, enfocar) {
metodoRecuperacion = nuevoMetodo === "otp" ? "otp" : "enlace";
const esOtp = metodoRecuperacion === "otp";
if (recMetodoEnlace) recMetodoEnlace.hidden = esOtp;
if (recMetodoOtp) recMetodoOtp.hidden = !esOtp;
if (recSubtitulo) {
recSubtitulo.textContent = esOtp
? "Te enviaremos un código de 6 dígitos a tu correo para entrar sin tu contraseña."
: "Te enviaremos un enlace a tu correo para restablecer tu contraseña.";
}
if (btnRecCambiarMetodo) {
btnRecCambiarMetodo.textContent = esOtp
? "Probar de otra manera: enviar enlace por correo"
: "Probar de otra manera: recibir un código de 6 dígitos por correo";
}
if (esOtp && recOtpCorreo && recCorreo && recCorreo.value.trim() && !recOtpCorreo.value.trim()) {
recOtpCorreo.value = recCorreo.value.trim();
} else if (!esOtp && recCorreo && recOtpCorreo && recOtpCorreo.value.trim() && !recCorreo.value.trim()) {
recCorreo.value = recOtpCorreo.value.trim();
}
if (enfocar && vistaRecuperar && !vistaRecuperar.hidden) {
if (esOtp && recOtpCorreo) recOtpCorreo.focus();
else if (!esOtp && recCorreo) recCorreo.focus();
}
}
function abrirVistaRecuperacion(correoInicial) {
if (!vistaRecuperar) return;
vistaRecuperarActiva = true;
limpiarMensajesRecuperacion();
const valorPrevio = limpiarTextoCuenta(correoInicial || (loginCorreo && loginCorreo.value) || "");
if (valorPrevio) {
if (recCorreo) recCorreo.value = valorPrevio;
if (recOtpCorreo) recOtpCorreo.value = valorPrevio;
}
fijarMetodoRecuperacion("enlace", false);
actualizarVistaCuenta();
if (recCorreo && !vistaRecuperar.hidden) recCorreo.focus();
}
function cerrarVistaRecuperacion() {
vistaRecuperarActiva = false;
limpiarMensajesRecuperacion();
actualizarVistaCuenta();
if (loginCorreo && !vistaInvitado.hidden) loginCorreo.focus();
}
async function enviarEnlaceRecuperacion(esReenvio) {
if (enviando || !recCorreo) return;
const correo = normalizarCorreo(recCorreo.value);
fijarError(recCorreo, errorRecCorreo, "");
if (errorRecGeneral) { errorRecGeneral.textContent = ""; errorRecGeneral.hidden = true; }
if (!esReenvio && estadoRecPassword) { estadoRecPassword.textContent = ""; estadoRecPassword.hidden = true; }
if (!esCorreoValido(correo)) { fijarError(recCorreo, errorRecCorreo, "Escribe un correo válido para recuperar tu acceso."); recCorreo.focus(); return; }
enviando = true;
const btnActivo = esReenvio ? btnRecReenviar : btnEnviarRecuperacion;
const textoReposo = esReenvio ? "Reenviar correo" : "Enviar enlace por correo";
if (btnActivo) { btnActivo.disabled = true; btnActivo.textContent = "Enviando..."; }
try {
const res = await dmdCuenta.solicitarRecuperacionPassword(correo);
if (res.ok) {
if (estadoRecPassword) {
estadoRecPassword.textContent = esReenvio
? `Reenviamos las instrucciones a ${correo}. Revisa tu bandeja de entrada o correo no deseado.`
: res.mensaje;
estadoRecPassword.hidden = false;
}
if (recReenviarWrap) recReenviarWrap.hidden = false;
} else {
if (errorRecGeneral) { errorRecGeneral.textContent = res.mensaje; errorRecGeneral.hidden = false; }
else if (estadoRecPassword) { estadoRecPassword.textContent = res.mensaje; estadoRecPassword.hidden = false; }
}
} finally {
enviando = false;
if (btnActivo) { btnActivo.disabled = Boolean(dmdCuenta.obtenerUltimoErrorServicio()); btnActivo.textContent = textoReposo; }
}
}
async function manejarEnvioOtpRecuperacion(esReenvio) {
if (enviando || !recOtpCorreo) return;
const correo = normalizarCorreo(esReenvio ? (recOtpCorreoActivo || recOtpCorreo.value) : recOtpCorreo.value);
fijarError(recOtpCorreo, errorRecOtpCorreo, "");
if (errorRecOtpGeneral) { errorRecOtpGeneral.textContent = ""; errorRecOtpGeneral.hidden = true; }
if (!esReenvio && estadoRecOtp) { estadoRecOtp.textContent = ""; estadoRecOtp.hidden = true; }
if (!esCorreoValido(correo)) { fijarError(recOtpCorreo, errorRecOtpCorreo, "Escribe un correo válido."); recOtpCorreo.focus(); return; }
enviando = true;
const btnActivo = esReenvio ? btnRecOtpReenviar : btnRecOtpEnviar;
const textoReposo = esReenvio ? "Reenviar código" : "Enviar código de 6 dígitos";
if (btnActivo) { btnActivo.disabled = true; btnActivo.textContent = "Enviando..."; }
try {
const res = await dmdCuenta.enviarCodigoOtp(correo);
if (res.ok) {
recOtpCorreoActivo = correo;
if (estadoRecOtp) {
estadoRecOtp.textContent = esReenvio
? `Enviamos un nuevo código de 6 dígitos a ${correo}. Revisa tu correo.`
: res.mensaje;
estadoRecOtp.hidden = false;
}
if (formRecOtpEnviar) formRecOtpEnviar.hidden = true;
if (formRecOtpVerificar) formRecOtpVerificar.hidden = false;
if (recOtpCodigo) { recOtpCodigo.value = ""; recOtpCodigo.focus(); }
} else {
if (errorRecOtpGeneral) { errorRecOtpGeneral.textContent = res.mensaje; errorRecOtpGeneral.hidden = false; }
}
} finally {
enviando = false;
if (btnActivo) { btnActivo.disabled = Boolean(dmdCuenta.obtenerUltimoErrorServicio()); btnActivo.textContent = textoReposo; }
}
}
async function manejarVerificarOtpRecuperacion(evento) {
if (evento) { evento.preventDefault(); evento.stopPropagation(); }
if (enviando || !recOtpCodigo) return;
const correo = normalizarCorreo(recOtpCorreoActivo || (recOtpCorreo && recOtpCorreo.value) || "");
const codigo = String(recOtpCodigo.value || "").replace(/\D+/g, "").trim();
fijarError(recOtpCodigo, errorRecOtpCodigo, "");
if (errorRecOtpGeneral) { errorRecOtpGeneral.textContent = ""; errorRecOtpGeneral.hidden = true; }
if (!/^\d{6}$/.test(codigo)) { fijarError(recOtpCodigo, errorRecOtpCodigo, "Escribe el código numérico de 6 dígitos."); recOtpCodigo.focus(); return; }
enviando = true;
if (btnRecOtpVerificar) { btnRecOtpVerificar.disabled = true; btnRecOtpVerificar.textContent = "Verificando..."; }
try {
const res = await dmdCuenta.verificarCodigoOtp(correo, codigo);
if (!res.ok) {
if (errorRecOtpGeneral) { errorRecOtpGeneral.textContent = res.mensaje; errorRecOtpGeneral.hidden = false; }
recOtpCodigo.focus();
return;
}
estadoCuenta.textContent = `Sesión iniciada: ${res.sesion.nombre}.`;
vistaRecuperarActiva = false;
actualizarVistaCuenta();
} finally {
enviando = false;
if (btnRecOtpVerificar) { btnRecOtpVerificar.disabled = Boolean(dmdCuenta.obtenerUltimoErrorServicio()); btnRecOtpVerificar.textContent = "Verificar y entrar"; }
}
}
if (btnAbrirRecuperar && vistaRecuperar) {
btnAbrirRecuperar.addEventListener("click", () => abrirVistaRecuperacion());
}
if (btnCerrarRecuperar && vistaRecuperar) {
btnCerrarRecuperar.addEventListener("click", cerrarVistaRecuperacion);
}
if (btnRecCambiarMetodo) {
btnRecCambiarMetodo.addEventListener("click", () => {
fijarMetodoRecuperacion(metodoRecuperacion === "enlace" ? "otp" : "enlace", true);
});
}
if (formRecuperar) {
formRecuperar.addEventListener("submit", (e) => { e.preventDefault(); e.stopPropagation(); enviarEnlaceRecuperacion(false); });
} else if (btnEnviarRecuperacion) {
btnEnviarRecuperacion.addEventListener("click", () => enviarEnlaceRecuperacion(false));
}
if (btnRecReenviar) {
btnRecReenviar.addEventListener("click", () => enviarEnlaceRecuperacion(true));
}
if (recCorreo) {
recCorreo.addEventListener("input", () => {
fijarError(recCorreo, errorRecCorreo, "");
if (errorRecGeneral) { errorRecGeneral.textContent = ""; errorRecGeneral.hidden = true; }
});
}
if (formRecOtpEnviar) {
formRecOtpEnviar.addEventListener("submit", (e) => { e.preventDefault(); e.stopPropagation(); manejarEnvioOtpRecuperacion(false); });
}
if (btnRecOtpReenviar) {
btnRecOtpReenviar.addEventListener("click", () => manejarEnvioOtpRecuperacion(true));
}
if (formRecOtpVerificar) {
formRecOtpVerificar.addEventListener("submit", manejarVerificarOtpRecuperacion);
}
if (recOtpCorreo) {
recOtpCorreo.addEventListener("input", () => {
fijarError(recOtpCorreo, errorRecOtpCorreo, "");
if (errorRecOtpGeneral) { errorRecOtpGeneral.textContent = ""; errorRecOtpGeneral.hidden = true; }
});
}
if (recOtpCodigo) {
recOtpCodigo.addEventListener("input", () => {
fijarError(recOtpCodigo, errorRecOtpCodigo, "");
if (errorRecOtpGeneral) { errorRecOtpGeneral.textContent = ""; errorRecOtpGeneral.hidden = true; }
});
}
if (btnRecGoogle) {
btnRecGoogle.addEventListener("click", async () => {
if (enviando) return;
enviando = true; btnRecGoogle.disabled = true;
if (estadoRecGoogle) estadoRecGoogle.textContent = "Comprobando acceso con Google...";
try {
const res = await dmdCuenta.iniciarAccesoGoogle();
if (!res.ok && estadoRecGoogle) estadoRecGoogle.textContent = res.mensaje;
else if (res.yaAutenticado) { vistaRecuperarActiva = false; actualizarVistaCuenta(); }
else if (res.redirigiendo && estadoRecGoogle) estadoRecGoogle.textContent = "Abriendo acceso seguro de tu cuenta dmd...";
} finally { enviando = false; btnRecGoogle.disabled = Boolean(dmdCuenta.obtenerUltimoErrorServicio()); }
});
}
if (btnRecCrearCuenta) {
btnRecCrearCuenta.addEventListener("click", () => {
vistaRecuperarActiva = false;
limpiarMensajesRecuperacion();
cambiarPestana("registro");
actualizarVistaCuenta();
if (regNombre && !vistaInvitado.hidden) regNombre.focus();
});
}
const secMiSub = document.getElementById("seccion-mi-suscripcion");
const miSubBadge = document.getElementById("mi-sub-badge");
const miSubPlan = document.getElementById("mi-sub-plan");
const miSubEstadoTxt = document.getElementById("mi-sub-estado-texto");
const miSubFechaWrap = document.getElementById("mi-sub-fecha-wrap");
const miSubFecha = document.getElementById("mi-sub-fecha");
const miSubDetalle = document.getElementById("mi-sub-detalle");
const btnMiSubCambiar = document.getElementById("btn-mi-sub-cambiar");
const btnMiSubCancelar = document.getElementById("btn-mi-sub-cancelar");
const btnMiSubReintentar = document.getElementById("btn-mi-sub-reintentar");
const miSubConfirmBox = document.getElementById("mi-sub-confirmar-cancelar");
const btnMiSubConfSi = document.getElementById("btn-mi-sub-confirmar-si");
const btnMiSubConfNo = document.getElementById("btn-mi-sub-confirmar-no");
const miSubAviso = document.getElementById("mi-sub-aviso");
const API_MP_CUENTA = "https://crear.dmdmx.dev/api/mp";
const NOMBRES_PLAN_MP = { pro: { nombre: "Plan Básico", precio: 79 }, pyme: { nombre: "Plan Emprendedor", precio: 189 }, elite: { nombre: "Plan Negocio", precio: 299 } };
const ESTADOS_SUB_MP = { authorized: "Activa", active: "Activa", pending: "Pendiente", paused: "Pausada", cancelled: "Cancelada", canceled: "Cancelada" };
let subConsultadaParaId = "";
function aplicarPlanAEnlacesPago(plan) {
if (!plan) return;
const hrefPlanes = `pago.html?plan=${encodeURIComponent(plan)}`;
document.querySelectorAll('a[href^="pago.html"]').forEach((enlace) => { enlace.href = hrefPlanes; });
const btnIrPlanes = document.getElementById("btn-ir-planes");
if (btnIrPlanes) btnIrPlanes.textContent = "Continuar con tu plan";
if (btnMiSubCambiar) btnMiSubCambiar.textContent = "Continuar con tu plan";
}
function renderizarMiSuscripcionEstado({ badge, muted, plan, estado, fecha, detalle, puedeCancelar, mostrarReintentar, textoCambiar }) {
if (!secMiSub) return;
if (miSubBadge) { miSubBadge.textContent = badge; miSubBadge.classList.toggle("status-pill-muted", Boolean(muted)); }
if (miSubPlan) miSubPlan.textContent = plan;
if (miSubEstadoTxt) miSubEstadoTxt.textContent = estado;
if (miSubFechaWrap && miSubFecha) {
if (fecha) { miSubFecha.textContent = fecha; miSubFechaWrap.hidden = false; }
else { miSubFecha.textContent = ""; miSubFechaWrap.hidden = true; }
}
if (miSubDetalle) miSubDetalle.textContent = detalle || "";
if (btnMiSubCancelar) btnMiSubCancelar.hidden = !puedeCancelar;
if (btnMiSubReintentar) btnMiSubReintentar.hidden = !mostrarReintentar;
if (btnMiSubCambiar) btnMiSubCambiar.textContent = planEnUrl ? "Continuar con tu plan" : (textoCambiar || "Ver planes");
if (miSubConfirmBox && !puedeCancelar) miSubConfirmBox.hidden = true;
}
async function consultarSuscripcionCuenta(forzar) {
if (!secMiSub) return;
const verificada = dmdCuenta.estaVerificada();
const sesion = dmdCuenta.obtenerSesionActual();
const errorSrv = dmdCuenta.obtenerUltimoErrorServicio();
if (!verificada) { renderizarMiSuscripcionEstado({ badge: "Consultando...", muted: true, plan: "Verificando...", estado: "Verificando...", fecha: "", detalle: "Comprobando tu sesión y el estado de tu suscripción.", puedeCancelar: false, mostrarReintentar: false, textoCambiar: "Ver planes" }); return; }
if (!sesion && errorSrv) { subConsultadaParaId = ""; renderizarMiSuscripcionEstado({ badge: "No disponible", muted: true, plan: "No disponible ahora", estado: "Servicio de cuentas fuera de línea", fecha: "", detalle: "No podemos consultar tu suscripción mientras el servicio de cuentas no responda. Aquí no se muestra ningún plan inventado.", puedeCancelar: false, mostrarReintentar: true, textoCambiar: "Ver planes" }); return; }
if (!sesion) { subConsultadaParaId = ""; renderizarMiSuscripcionEstado({ badge: "Sin sesión", muted: true, plan: "Inicia sesión para consultar", estado: "Sesión no iniciada", fecha: "", detalle: "Al iniciar sesión podrás ver tu plan activo, cambiar de plan o cancelar tu suscripción de Mercado Pago.", puedeCancelar: false, mostrarReintentar: false, textoCambiar: "Ver planes" }); return; }
if (!forzar && subConsultadaParaId === sesion.id) return;
subConsultadaParaId = sesion.id;
renderizarMiSuscripcionEstado({ badge: "Consultando...", muted: true, plan: "Consultando...", estado: "Conectando con Mercado Pago...", fecha: "", detalle: "", puedeCancelar: false, mostrarReintentar: false, textoCambiar: "Cambiar plan" });
const controlador = typeof AbortController === "function" ? new AbortController() : null;
const timer = controlador ? window.setTimeout(() => controlador.abort(), 9000) : null;
try {
const resp = await window.fetch(`${API_MP_CUENTA}/subscription`, { method: "GET", credentials: "include", headers: { Accept: "application/json" }, signal: controlador ? controlador.signal : undefined });
if (resp.status === 401 || resp.status === 403) {
const verif = await dmdCuenta.verificarSesion();
subConsultadaParaId = "";
if (!verif.sesion) renderizarMiSuscripcionEstado({ badge: "Sin sesión", muted: true, plan: "Inicia sesión para consultar", estado: "Sesión no iniciada", fecha: "", detalle: "Tu sesión expiró o no está activa. Inicia sesión de nuevo para consultar tu suscripción.", puedeCancelar: false, mostrarReintentar: false, textoCambiar: "Ver planes" });
else renderizarMiSuscripcionEstado({ badge: "No disponible", muted: true, plan: "No se pudo consultar", estado: "Servicio de suscripciones no disponible", fecha: "", detalle: "No pudimos leer tu suscripción en este intento. Intenta comprobar de nuevo más tarde.", puedeCancelar: false, mostrarReintentar: true, textoCambiar: "Ver planes" });
return;
}
if (resp.status === 404) { renderizarMiSuscripcionEstado({ badge: "Sin plan", muted: true, plan: "Sin suscripción activa", estado: "Sin plan contratado", fecha: "", detalle: "Todavía no tienes un plan mensual activo en esta cuenta. Puedes elegir uno en la vista de planes.", puedeCancelar: false, mostrarReintentar: false, textoCambiar: "Elegir un plan" }); return; }
let data = null;
try { const txt = await resp.text(); data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
if (!resp.ok || !data) { renderizarMiSuscripcionEstado({ badge: "No disponible", muted: true, plan: "No se pudo consultar", estado: "Servicio de suscripciones no disponible", fecha: "", detalle: "No pudimos leer tu suscripción en este intento. Intenta comprobar de nuevo más tarde.", puedeCancelar: false, mostrarReintentar: true, textoCambiar: "Ver planes" }); return; }
const sub = (data.subscription && typeof data.subscription === "object") ? data.subscription : (data.suscripcion && typeof data.suscripcion === "object") ? data.suscripcion : data;
const planId = String(sub.plan || sub.plan_id || sub.planId || "").trim().toLowerCase();
const statusRaw = String(sub.status || sub.estado || "").trim().toLowerCase();
if (!planId && !statusRaw) { renderizarMiSuscripcionEstado({ badge: "Sin plan", muted: true, plan: "Sin suscripción activa", estado: "Sin plan contratado", fecha: "", detalle: "Esta cuenta no tiene una suscripción activa en Mercado Pago.", puedeCancelar: false, mostrarReintentar: false, textoCambiar: "Elegir un plan" }); return; }
const def = NOMBRES_PLAN_MP[planId];
const nombrePlan = def ? `${def.nombre} ($${def.precio} MXN al mes)` : planId || "Plan dmd";
const estadoLabel = ESTADOS_SUB_MP[statusRaw] || statusRaw || "Sin estado";
const cancelada = statusRaw === "cancelled" || statusRaw === "canceled";
const pendiente = statusRaw === "pending";
const pausada = statusRaw === "paused";
const fechaCruda = String(sub.created_at || sub.createdAt || sub.date_created || "").trim();
const fechaLimpia = /^\d{4}-\d{2}-\d{2}/.test(fechaCruda) ? fechaCruda.slice(0, 10) : fechaCruda;
let detalle = "Suscripción vinculada a tu cuenta con cobro en Mercado Pago.";
let puedeCancelar = !cancelada;
let textoCambiar = "Cambiar plan";
let muted = cancelada;
if (cancelada) { detalle = "Tu suscripción figura como cancelada. Si deseas reactivarla, elige un plan en Mercado Pago."; puedeCancelar = false; textoCambiar = "Elegir un plan"; muted = true; }
else if (pendiente) { detalle = "Tu pago está pendiente de confirmación en Mercado Pago. En cuanto se acredite, tu plan quedará activo."; puedeCancelar = false; textoCambiar = "Ver planes"; muted = true; }
else if (pausada) { detalle = "Tu suscripción está pausada temporalmente en Mercado Pago."; puedeCancelar = false; textoCambiar = "Ver planes"; muted = true; }
renderizarMiSuscripcionEstado({ badge: estadoLabel, muted, plan: nombrePlan, estado: estadoLabel, fecha: fechaLimpia, detalle, puedeCancelar, mostrarReintentar: false, textoCambiar });
} catch (err) {
renderizarMiSuscripcionEstado({ badge: "No disponible", muted: true, plan: "No disponible ahora", estado: "Sin conexión con suscripciones", fecha: "", detalle: "El servicio de suscripciones no respondió en este momento. No se muestra ningún plan inventado.", puedeCancelar: false, mostrarReintentar: true, textoCambiar: "Ver planes" });
} finally { if (timer) window.clearTimeout(timer); }
}
if (btnMiSubCancelar && miSubConfirmBox) { btnMiSubCancelar.addEventListener("click", () => { miSubConfirmBox.hidden = false; if (btnMiSubConfSi) btnMiSubConfSi.focus(); }); }
if (btnMiSubConfNo && miSubConfirmBox) { btnMiSubConfNo.addEventListener("click", () => { miSubConfirmBox.hidden = true; if (btnMiSubCancelar) btnMiSubCancelar.focus(); }); }
if (btnMiSubConfSi) {
btnMiSubConfSi.addEventListener("click", async () => {
if (enviando) return;
enviando = true; btnMiSubConfSi.disabled = true; btnMiSubConfSi.textContent = "Cancelando...";
if (miSubAviso) miSubAviso.textContent = "Enviando cancelación a Mercado Pago...";
try {
const resp = await window.fetch(`${API_MP_CUENTA}/cancel`, { method: "POST", credentials: "include", headers: { Accept: "application/json" } });
if (resp.status === 401 || resp.status === 403) {
const verif = await dmdCuenta.verificarSesion();
if (miSubAviso) miSubAviso.textContent = verif.sesion ? "No se pudo cancelar la suscripción en este momento. Intenta de nuevo." : "Tu sesión expiró. Inicia sesión de nuevo para cancelar tu suscripción.";
actualizarVistaCuenta();
} else if (!resp.ok) {
if (miSubAviso) miSubAviso.textContent = "No se pudo cancelar la suscripción en este momento.";
} else {
if (miSubConfirmBox) miSubConfirmBox.hidden = true;
if (miSubAviso) miSubAviso.textContent = "Suscripción cancelada.";
await consultarSuscripcionCuenta(true);
}
} catch (err) {
if (miSubAviso) miSubAviso.textContent = "El servicio de suscripciones no respondió. Intenta más tarde.";
} finally { enviando = false; btnMiSubConfSi.disabled = false; btnMiSubConfSi.textContent = "Sí, cancelar"; }
});
}
if (btnMiSubReintentar) {
btnMiSubReintentar.addEventListener("click", async () => {
btnMiSubReintentar.disabled = true; btnMiSubReintentar.textContent = "Comprobando...";
if (miSubAviso) miSubAviso.textContent = "";
const res = await dmdCuenta.verificarSesion();
await consultarSuscripcionCuenta(true);
btnMiSubReintentar.disabled = false; btnMiSubReintentar.textContent = "Comprobar de nuevo";
if (res && res.sinConexion && miSubAviso) miSubAviso.textContent = "El servicio de cuentas sigue fuera de línea por el momento.";
});
}
try {
const params = new URLSearchParams(window.location.search);
const modoParam = params.get("modo");
if (modoParam === "registro") cambiarPestana("registro");
else if (modoParam === "recuperar") abrirVistaRecuperacion(params.get("correo") || "");
const planParam = params.get("plan");
if (planParam && /^[A-Za-z0-9-]+$/.test(planParam)) { planEnUrl = planParam; aplicarPlanAEnlacesPago(planParam); }
} catch (error) {}
dmdCuenta.alCambiarSesion(() => { actualizarVistaCuenta(); consultarSuscripcionCuenta(false); });
actualizarVistaCuenta();
consultarSuscripcionCuenta(false);
actualizarPistaPasswordRegistro();
}
if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", montarInterfazCuenta); } else { montarInterfazCuenta(); }
})();
