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
*   [Node.js](https://nodejs.org/) (Versión 16 o superior recomendada)
*   [MongoDB](https://www.mongodb.com/try/download/community) (Local o en la nube)
*   [Git](https://git-scm.com/)

---

## ⚙️ Configuración del Entorno (.env)

El proyecto utiliza variables de entorno para proteger la información sensible. Sigue estos pasos:

1.  Localiza el archivo `.env.example` en la raíz del proyecto.
2.  Crea una copia llamada `.env`.
3.  Completa los datos necesarios:
    *   **Servidor**: Puerto de ejecución.
    *   **Base de Datos**: URL de conexión a MongoDB.
    *   **JWT**: Una clave secreta larga para la seguridad de las sesiones.
    *   **Cloudinary**: Tus credenciales de la API de Cloudinary para la subida de imágenes.
    *   **Deploy**: Datos de tu VPS y FTP para el despliegue automático.

---

## 🛠️ Instalación y Uso Local

Para facilitar el trabajo en Windows, el proyecto incluye scripts automatizados:

### 1. Instalación Inicial
Ejecuta el archivo `install.bat`. Este script instalará todas las dependencias de Node.js necesarias.
```bash
./install.bat
```

### 2. Ejecutar el Servidor
Ejecuta el archivo `run.bat`. Esto iniciará el servidor de desarrollo con recarga automática (Nodemon).
```bash
./run.bat
```
El servidor estará disponible en: [http://localhost:2495/artedigital/](http://localhost:2495/artedigital/)

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
