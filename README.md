# 🎨 Arte Digital Data

Bienvenido a **Arte Digital Data**, una plataforma integral diseñada como una red social para artistas digitales. Este proyecto permite la creación, gestión y compartición de obras artísticas, eventos, recursos y comunicación en tiempo real.

---

## 🚀 Características Principales

*   **Sistema de Usuarios**: Registro, inicio de sesión y gestión de perfiles personalizados con avatares.
*   **Gestión de Contenido**: Creación de publicaciones (posts), recursos artísticos y eventos.
*   **Comunicación en Tiempo Real**: Chat integrado mediante WebSockets (Socket.io) para salas de chat dinámicas.
*   **Buscador Inteligente**: Localización global de usuarios, eventos, recursos y publicaciones.
*   **Sistema de Administración**: Panel de control para gestionar usuarios y roles del sistema.
*   **Infraestructura Robusta**: MongoDB para datos y JWT para seguridad. Upload de imágenes a disco local.
*   **Diseño Premium**: Interfaz moderna con estética Cyberpunk/Neon, totalmente responsiva.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
*   [Git](https://git-scm.com/)
*   MongoDB solo es necesario si vas a correr el backend localmente.

---

## ▶️ Modo 1: Solo Frontend (recomendado para desarrollo UI)

Esta es la forma más rápida. **No necesitás MongoDB, Node instalado globalmente ni `.env`.** Los datos se cargan desde el servidor VPS de producción.

### Pasos

1. Clona el repositorio:
   ```bash
   git clone https://github.com/jpupper/artedigitaldata.git
   cd artedigitaldata
   ```
2. Ejecuta el script:
   ```
   run-frontend.bat
   ```
3. Abrí [http://localhost:3000/](http://localhost:3000/) en tu navegador.

> La primera vez que se ejecute, `npx serve` descarga el paquete automáticamente. No requiere instalación previa de nada.

### Cómo funciona

`run-frontend.bat` ejecuta `npx serve public -p 3000`, que sirve la carpeta `public/` como sitio estático en el puerto 3000. El frontend detecta automáticamente que está corriendo en localhost y apunta todas las llamadas a la API al VPS de producción (`https://vps-4455523-x.dattaweb.com`), por lo que ves datos reales sin levantar ningún servidor local.

---

## 🛠️ Modo 2: Full Stack Local (frontend + backend propio)

Usá este modo si querés modificar el backend o trabajar con una base de datos propia.

### Requisitos adicionales
*   [MongoDB](https://www.mongodb.com/try/download/community) (local o en la nube via Atlas)

### Configuración del Entorno (.env)

1.  Copiá el archivo `.env.example` como `.env`:
    ```bash
    copy .env.example .env
    ```
2.  Completá los valores obligatorios:

    | Variable | Descripción |
    |----------|-------------|
    | `MONGODB_URI` | URL de conexión a tu MongoDB |
    | `JWT_SECRET` | Clave secreta larga y aleatoria |
    | `FSC_AUTH_API` | URL del servicio de autenticación centralizado |
    | `PORT` | Puerto del servidor (default: 2494) |

3.  Variables opcionales (solo para deploy):

    | Variable | Uso |
    |----------|-----|
    | `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_PASS` | Deploy por SSH al VPS |
    | `FTP_HOST`, `FTP_USER`, `FTP_PASS` | Sincronización de archivos por FTP |
    | `GITHUB_TOKEN`, `GITHUB_REPO` | Deploy desde GitHub |
    | `MERCADOPAGO_ACCESS_TOKEN` | Integración de pagos (tickets de eventos) |
    | `MONGODB_AUTH_URI` | DB centralizada de usuarios (multi-app) |

### Instalación y arranque

```bash
install.bat   # instala dependencias npm
run.bat       # inicia el servidor con recarga automática
```

El servidor local estará en: [http://localhost:2494/artedigitaldata/](http://localhost:2494/artedigitaldata/)

---

## 🚢 Despliegue (Deploy)

El proyecto cuenta con scripts avanzados para automatizar el despliegue al servidor VPS y al almacenamiento FTP.

*   **Configuración SSH**: Ejecuta `deploy_scripts\setup_ssh_key.bat` la primera vez para configurar el acceso seguro a tu VPS.
*   **Deploy Completo**: Ejecuta `deploy_scripts\run_deploy.bat` para:
    1.  Subir el código al VPS mediante SSH.
    2.  Actualizar el backend y reiniciar el servicio (npm install + compilación TypeScript + PM2 restart).
    3.  Sincronizar los archivos del frontend por FTP de forma inteligente (solo sube lo modificado).

---

## 📁 Estructura del Proyecto

*   `/src`: Lógica del servidor (Rutas, Modelos, Middlewares) escrita en TypeScript.
*   `/public`: El corazón visual del proyecto (HTML, CSS con estética Cyber-Neon, JS frontend).
*   `/public/img`: Imágenes estáticas del sitio (logos, íconos). Debe estar dentro de `public/` para que `npx serve` las sirva correctamente.
*   `/deploy_scripts`: Herramientas de automatización para subida a producción.
*   `server.ts`: Punto de entrada de la aplicación.

---

## ⚠️ Notas Técnicas para Desarrolladores

### URLs sin extensión `.html`

El servidor de desarrollo (`npx serve`) activa **clean URLs** por defecto: sirve `recurso.html` cuando pedís `/recurso`, pero si navegás a `/recurso.html` hace una redirección y puede perder los query parameters (`?id=...`).

Por eso **todos los links internos del proyecto usan URLs sin extensión**:

```js
// Correcto
window.location.href = `recurso?id=${item._id}`;
href="profile?user=username"

// Incorrecto — rompe en desarrollo local
window.location.href = `recurso.html?id=${item._id}`;
```

Esto aplica a todos los archivos HTML y JS del frontend. Si agregás nuevos links entre páginas, seguí este patrón.

### Imágenes estáticas

Las imágenes del sitio (logos, placeholders, etc.) deben estar en `public/img/`. Como `npx serve` sirve solo la carpeta `public/`, archivos fuera de ella no son accesibles desde el navegador en modo frontend.

### CONFIG.BASE — cuándo usarlo

`CONFIG.BASE` devuelve `''` en localhost y `/artedigitaldata` en producción. **No lo uses para links entre páginas** (usá rutas relativas simples). Solo es necesario para construir URLs absolutas al servidor (API, Socket).

---

*Desarrollado para la comunidad de arte digital.* 🚀
