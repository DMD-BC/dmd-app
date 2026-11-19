# dmd-app

Aplicación dmd: crea páginas web con chat, con persistencia solo en el navegador.

Se publica en https://dmd.dmdmx.dev

## Qué es

- Inicio en `index.html`, aplicación en `app.html`, vista pública en `ver.html`.
- El chat genera un borrador de página web y permite guardarlo, reabrirlo, publicarlo y borrarlo.
- La persistencia es solo en el navegador (localStorage, sessionStorage, IndexedDB y Cache Storage). No depende de ningún servidor local.

## Login y pago reales

- Login: https://login.dmdmx.dev/api/auth/ (sesión SSO en `.dmdmx.dev`). No hay cuentas locales.
- Pago: https://crear.dmdmx.dev/api/mp/ con Mercado Pago. Planes: Pro $79 MXN al mes, PyME $189 MXN al mes y Élite $299 MXN al mes. La app nunca pide ni guarda datos de tarjeta.

## Pendiente

- En `DMD-BC/dmd-paginas-web-ia` (`api/mp.js`), el regreso tras autorizar en Mercado Pago está fijo a `https://crear.dmdmx.dev/app.html?sub=ok`; falta aceptar el regreso a `https://dmd.dmdmx.dev`.
- En Google Cloud Console falta autorizar el origen `https://login.dmdmx.dev` para iniciar sesión con Google desde ese portal.

El repositorio `DMD-BC/dmd` es el sitio principal de DMD y no se toca.
