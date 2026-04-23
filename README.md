# 🎨 Arte Digital Data

Bienvenido a **Arte Digital Data**, una plataforma integral diseñada como una red social para artistas digitales. Este proyecto permite la creación, gestión y compartición de obras artísticas, eventos, recursos y comunicación en tiempo real.

---

## 🚀 Características Principales

*   **Sistema de Usuarios**: Registro, inicio de sesión y gestión de perfiles personalizados con avatares.
*   **Gestión de Contenido**: Creación de publicaciones (posts), recursos artísticos y eventos.
*   **Comunicación en Tiempo Real**: Chat integrado mediante WebSockets (Socket.io) para salas de chat dinámicas.
*   **Buscador Inteligente**: Localización global de usuarios, eventos, recursos y publicaciones.
*   **Sistema de Administración**: Panel de control para gestionar usuarios y roles del sistema.
*   **Infraestructura Robusta**: Integración con **Cloudinary** para imágenes, **MongoDB** para datos y **JWT** para seguridad.
*   **Diseño Premium**: Interfaz moderna con estética Cyberpunk/Neon, totalmente responsiva.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
*   [Git](https://git-scm.com/)
*   MongoDB solo es necesario si vas a correr el backend localmente.

---

## 🚀 Modo 1: Solo Frontend (conectado al backend remoto)

Esta es la forma más rápida. No necesitás MongoDB ni `.env`. Los datos se cargan desde el servidor VPS de producción.

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

> La primera vez que se ejecute, `npx serve` descarga el paquete automáticamente. No requiere instalación previa.

---

## 🛠️ Modo 2: Full Stack Local (frontend + backend propio)

Usá este modo si querés modificar el backend o trabajar con una base de datos propia.

### Requisitos adicionales
*   [MongoDB](https://www.mongodb.com/try/download/community) (local o en la nube via Atlas)
*   Cuenta en [Cloudinary](https://cloudinary.com/) para subida de imágenes

### Configuración del Entorno (.env)

1.  Copiá el archivo `.env.example` como `.env`:
    ```bash
    copy .env.example .env
    ```
2.  Completá los valores obligatorios:
    *   `MONGODB_URI` — URL de conexión a tu MongoDB
    *   `JWT_SECRET` — clave secreta larga y aleatoria
    *   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — credenciales de Cloudinary
    *   El resto (`VPS_*`, `FTP_*`, `GITHUB_TOKEN`) son opcionales y solo se usan para deploy

### Instalación y arranque

```bash
install.bat   # instala dependencias npm
run.bat       # inicia el servidor con recarga automática
```

El servidor local estará en: [http://localhost:2495/artedigitaldata/](http://localhost:2495/artedigitaldata/)

---

## 🚢 Despliegue (Deploy)

El proyecto cuenta con scripts avanzados para automatizar el despliegue al servidor VPS y al almacenamiento FTP.

*   **Configuración SSH**: Ejecuta `deploy_scripts\setup_ssh_key.bat` la primera vez para configurar el acceso seguro a tu VPS.
*   **Deploy Completo**: Ejecuta `deploy_scripts\run_deploy.bat` para:
    1.  Subir el código al VPS mediante SSH.
    2.  Actualizar el backend y reiniciar el servicio.
    3.  Sincronizar los archivos del frontend por FTP de forma inteligente (solo sube lo modificado).

---

## 📁 Estructura del Proyecto

*   `/src`: Lógica del servidor (Rutas, Modelos, Middlewares) escrita en TypeScript.
*   `/public`: El corazón visual del proyecto (HTML, CSS con estética Cyber-Neon, JS frontend).
*   `/deploy_scripts`: Herramientas de automatización para subida a producción.
*   `server.ts`: Punto de entrada de la aplicación.


---
*Desarrollado para la comunidad de arte digital.* 🚀
