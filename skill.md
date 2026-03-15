---
name: art-social-architecture-v3
description: Arquitectura completa para la Red Social de Arte Digital: TS, MongoDB, Cloudinary, VPS y Ferozo.
---

# Arquitectura de Sistema - Red Social de Arte Digital

## 1. Stack Tecnológico (Tecnologías Específicas)

* **Lenguaje:** **TypeScript** (Indispensable para manejar los modelos de datos de usuarios, posts y la API de Cloudinary con seguridad).
* **Backend:** Node.js + Express (Escrito en TS, ejecutado como JS).
* **Base de Datos:** **MongoDB** (Almacena el "esqueleto": usuarios, likes, comentarios y URLs).
* **Media Storage:** **Cloudinary** (Almacena el "cuerpo": archivos binarios de arte, videos y avatars).
* **Real-time:** Socket.io (Para notificaciones y actividad social en vivo).
* **Frontend:** Vanilla JS/TS compilado, servido de forma estática.

---

## 2. Estructura de Proyecto y Dinámica de Trabajo

* **`/` (Root):** Lógica del Servidor. Contiene `server.ts` (que compila a `server.js`), `package.json` y config de la DB.
* **`/public`:** **Carpeta Maestra del Frontend.** Es lo que se sube al FTP. Contiene el `index.html` y los assets compilados.
* **`/src`:** Código fuente de TypeScript para el frontend antes de pasar por el proceso de build.
* **`/deploy_scripts`:** Scripts de automatización (.bat, .sh, .js).

---

## 3. Entornos de Despliegue Simultáneos

### A. Localhost (Desarrollo)
- **URL:** `http://localhost:3000/artnetwork/`
- **Script:** Se levanta con `run.bat`. Usa MongoDB local.

### B. VPS (Producción - El Cerebro)
- **URL:** `https://vps-4455523-x.dattaweb.com/artnetwork/`
- **Función:** Ejecuta el `server.js` (Node+Express). Gestiona la base de datos y la subida a Cloudinary.
- **IP:** `149.50.139.152` (SSH puerto `5752`).

### C. fullscreencode.com (Producción - Espejo Estático)
- **URL:** `https://fullscreencode.com/artnetwork/`
- **Hosting:** Ferozo (FTP). **Solo sirve la carpeta `/public`**.
- **Acción:** No tiene lógica; redirige todas las llamadas de API y Sockets al VPS.

---

## 4. Automatización y Scripts (.bat / .sh)

* **`install.bat`**: Instala todas las dependencias (`npm install`) en el root.
* **`run.bat`**: Ejecuta el servidor en local y compila el TS en modo desarrollo.
* **`setup_ssh_key.bat`**: Configura el acceso al VPS sin pedir contraseña cada vez.
* **`server_update.sh`**: Script en el VPS que hace `git pull`, instala dependencias y reinicia con PM2.
* **`run_deploy.bat`**: El "botón rojo". Hace dos cosas:
    1. Se conecta al VPS y ejecuta `server_update.sh` (Actualiza backend).
    2. Compila el frontend y sube la carpeta `/public` al FTP de Ferozo (Actualiza frontend).

---

## 5. Configuración de Rutas (config.ts)

Este archivo es el que permite que la app sepa dónde está parada:

```typescript
const VPS_ORIGIN = '[https://vps-4455523-x.dattaweb.com](https://vps-4455523-x.dattaweb.com)';

const CONFIG = {
    isLocal: window.location.hostname === 'localhost' || window.location.hostname.includes('192.168'),
    
    get API_URL(): string {
        if (this.isLocal) return window.location.origin + '/artnetwork/api';
        return VPS_ORIGIN + '/artnetwork/api';
    },

    get SOCKET_URL(): string {
        if (this.isLocal) return window.location.origin;
        return VPS_ORIGIN;
    },

    get STATIC_ORIGIN(): string {
        return window.location.origin; 
    }
};