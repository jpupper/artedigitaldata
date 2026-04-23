# Arte Digital Data — Guía para IA

Red social para artistas digitales. Backend Node/TypeScript + frontend vanilla JS. Español.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + TypeScript, Express v4 |
| Base de datos | MongoDB + Mongoose |
| Real-time | Socket.io v4 |
| Auth | JWT + SSO externo (FSCAuth) |
| Pagos | MercadoPago SDK |
| Upload | multer + disco local (NO Cloudinary activo) |
| Frontend | HTML + JS vanilla + TailwindCSS v3 (CDN) |
| Deploy | PM2 + Nginx en VPS |
| Dev local | `npx serve public -p 3000` (NO servidor Node) |

---

## Estructura de carpetas

```
artedigitaldata/
├── server.ts              # Punto de entrada (Express + Socket.io)
├── src/
│   ├── models/            # Schemas Mongoose
│   ├── routes/            # API REST
│   ├── middleware/        # auth.ts — JWT, roles
│   └── utils/             # userHydration.ts, mailer.ts
├── public/                # Todo el frontend (servido estático)
│   ├── *.html             # Una página por feature
│   ├── css/style.css      # Estilos custom (gradient-text, card-cyber, etc.)
│   ├── js/                # Lógica frontend
│   └── img/               # Imágenes estáticas (artedigital.png, etc.)
├── deploy_scripts/        # Scripts de deploy a VPS y FTP
└── nginx-deploy.conf      # Config Nginx para producción
```

---

## Modelos principales

| Modelo | Archivo | Campos clave |
|--------|---------|--------------|
| User | `src/models/User.ts` | username, email, role, permissions.artedigital.role, avatar, bio, socials |
| Post | `src/models/Post.ts` | title, description, imageUrl, author (ref User), likes[], comments[] |
| Evento | `src/models/Evento.ts` | title, date, location, creator, ticketConfig, pinned, participants[] |
| Recurso | `src/models/Recurso.ts` | title, type, url, imageUrl, author, likes[], comments[] |
| ChatRoom | `src/models/ChatRoom.ts` | name, participants[], isPrivate |
| Message | `src/models/Message.ts` | room, sender, content |
| Ticket | `src/models/Ticket.ts` | event, code, qrData, paymentStatus, redeemed |
| Notification | `src/models/Notification.ts` | recipient, actor, type, resourceId |

---

## API — rutas principales

Todas bajo `/artedigitaldata/api` en producción y `/api` en local.

```
POST   /auth/register        POST   /auth/login
GET    /auth/me

GET    /posts                POST   /posts
GET    /posts/:id            PATCH  /posts/:id       DELETE /posts/:id
POST   /posts/:id/like       POST   /posts/:id/comment

GET    /recursos             POST   /recursos
GET    /recursos/:id         PATCH  /recursos/:id    DELETE /recursos/:id
POST   /recursos/:id/like    POST   /recursos/:id/comment

GET    /eventos              POST   /eventos
GET    /eventos/:id          PATCH  /eventos/:id     DELETE /eventos/:id
POST   /eventos/:id/like     POST   /eventos/:id/pin POST   /eventos/:id/unpin
GET    /eventos/pinned/list

GET    /profile/:username
PATCH  /profile/me

GET    /upload               POST   /upload

GET    /tickets/my           POST   /tickets
GET    /notifications        PATCH  /notifications/:id/read

GET    /search?q=...
GET    /admin/users          PATCH  /admin/users/:id/role
```

---

## Frontend — archivos JS en `public/js/`

| Archivo | Rol |
|---------|-----|
| `config.js` | CONFIG global: API_URL, BASE, escapeHTML(), sanitizeUrl() |
| `auth.js` | Token localStorage, isLoggedIn(), getUser(), apiRequest(), SSO |
| `header.js` | Navbar, menú usuario, renderHeader() |
| `notifications.js` | Campana de notificaciones, Socket.io |
| `tagging.js` | Autocomplete @menciones |
| `forms.js` | Templates HTML de formularios (create/edit) |
| `index.js` | Feed global, filtros por tipo, eventos pinnados |
| `create.js` | Crear posts/recursos/eventos |
| `profile.js` | Perfil de usuario, tabs, edición |
| `chat.js` | Chat en tiempo real (Socket.io) |
| `search.js` | Búsqueda global |
| `admin.js` | Panel admin |
| `evento.js` / `post.js` / `recurso.js` | Detalle de cada tipo de contenido |

---

## Patrones críticos

### Seguridad XSS — SIEMPRE usar en HTML dinámico
```js
escapeHTML(str)   // escapa &<>"' — usar en TODO texto de usuario
sanitizeUrl(url)  // valida protocolo http/https — usar en src= y href=
```

### API requests autenticadas
```js
const res = await apiRequest('/posts', { method: 'POST', body: JSON.stringify(data) });
// apiRequest está en auth.js — añade el token automáticamente y hace logout en 401
```

### URLs limpias — IMPORTANTE para dev local
`npx serve` elimina la extensión `.html` de las URLs y puede perder query strings al redirigir.
**Regla:** nunca usar extensión `.html` en los `href` o `window.location.href`:
```js
// ✅ Correcto
window.location.href = `recurso?id=${item._id}`;
href="profile?user=username"

// ❌ Rompe en local con npx serve
window.location.href = `recurso.html?id=${item._id}`;
```

### CONFIG.BASE — NO usar para links internos
`CONFIG.BASE` devuelve `''` en localhost y `/artedigitaldata` en producción. Para links entre páginas usar rutas relativas simples (sin `CONFIG.BASE`). Solo usar `CONFIG.BASE` cuando sea necesario construir una URL absoluta para el servidor.

### Hidratación de usuarios (backend)
`src/utils/userHydration.ts` resuelve refs de User en lotes antes de devolver respuestas. Posts, Recursos y Eventos pasan por hidratación — `_id` se serializa como string hex de 24 chars.

### Roles
- `user.role` (global): `USER`, `ADMIN`, `SYSTEM`
- `user.permissions.artedigital.role` (app-specific): `USUARIO`, `ADMINISTRADOR`
- Los checks de admin en frontend usan `isAdmin()` de `auth.js`
- Los checks en backend usan `adminMiddleware` de `src/middleware/auth.ts`

---

## Auth — flujo SSO

1. Usuario sin token → redirige a `CONFIG.FSCAUTH_URL` (servicio externo FSCAuth)
2. FSCAuth devuelve `?token=...&username=...&userId=...` en la URL
3. `auth.js` captura y guarda en localStorage (`artedigitaldata_token`, `artedigitaldata_user`)
4. Todas las requests llevan `Authorization: Bearer {token}`
5. Backend verifica con `JWT_SECRET` del `.env`

---

## Socket.io

```js
// Cliente
const socket = io(CONFIG.SOCKET_URL, { path: CONFIG.SOCKET_PATH });
socket.emit('joinUserRoom', userId);    // notificaciones personales
socket.emit('joinRoom', roomId);        // sala de chat
socket.emit('chatMessage', { roomId, senderId, content });
socket.on('newMessage', (msg) => { });

// Servidor — notificar a un usuario específico
notifyUser(userId, 'newNotification', data);  // emite a room user_{userId}
```

---

## Upload de archivos

- Endpoint: `POST /upload` con `multipart/form-data`, campo `file`
- Guarda en `/img/uploads/{subfolder}/` (subfolders: profiles, recursos, eventos, posts, general)
- Devuelve `{ url: "https://vps.../artedigitaldata/img/uploads/..." }`
- Tamaño máximo: 10 MB
- **Cloudinary está en package.json pero NO se usa** — el upload actual es a disco local

---

## Variables de entorno (`.env`)

```
PORT=2494
MONGODB_URI=...          # DB principal (contenido)
MONGODB_AUTH_URI=...     # DB de usuarios centralizada (opcional)
JWT_SECRET=...
FSC_AUTH_API=...         # URL del servicio de auth externo
MERCADOPAGO_ACCESS_TOKEN=...
# Deploy (opcionales):
VPS_HOST, VPS_PORT, VPS_USER, VPS_PASS
FTP_HOST, FTP_USER, FTP_PASS
GITHUB_TOKEN, GITHUB_REPO
```

---

## Correr el proyecto

### Solo frontend (más rápido, datos del VPS)
```bash
npx serve public -p 3000
# Abrir http://localhost:3000
```

### Full stack local
```bash
cp .env.example .env   # completar variables
npm install
npm run dev            # ts-node server.ts con watch
# Abrir http://localhost:2494/artedigitaldata
```

### Deploy a producción
```bash
deploy_scripts/run_deploy.bat
# 1. Sube código al VPS por SSH
# 2. Ejecuta server_update.sh (npm install + tsc + PM2 restart)
# 3. Sincroniza /public al FTP (solo archivos modificados)
```

---

## Convenciones de código

- **Sin comentarios obvios** — solo cuando el POR QUÉ no es claro
- **Sin `.html` en hrefs** — usar clean URLs (ver sección arriba)
- **Todo texto de usuario pasa por escapeHTML()** antes de insertarse en innerHTML
- **Todo src/href externo pasa por sanitizeUrl()** antes de insertarse
- **No usar `innerHTML` con err.message** — puede exponer info interna
- **No hacer console.log de CONFIG.API_URL ni datos de respuesta** en producción
- Interfaces TypeScript con prefijo `I`: `IUser`, `IPost`, `IEvento`
- Errores del servidor: `{ error: "mensaje" }` JSON consistente
- Los modelos no tienen transforms en `toJSON`/`toObject` — `_id` se serializa como string hex

---

## Páginas y sus propósitos

| URL | HTML | Propósito |
|-----|------|-----------|
| `/` | `index.html` | Feed global (posts + recursos + eventos mezclados) |
| `/login` | `login.html` | Redirige a SSO FSCAuth |
| `/register` | `register.html` | Redirige a SSO FSCAuth |
| `/profile?user=X` | `profile.html` | Perfil de usuario, tabs de contenido |
| `/create` | `create.html` | Crear post / recurso / evento |
| `/post?id=X` | `post.html` | Detalle de obra con comentarios |
| `/recurso?id=X` | `recurso.html` | Detalle de recurso con comentarios |
| `/evento?id=X` | `evento.html` | Detalle de evento, compra de entradas |
| `/chat` | `chat.html` | Chat en tiempo real |
| `/search` | `search.html` | Búsqueda global |
| `/admin` | `admin.html` | Panel de administración |
| `/calendario` | `calendario.html` | Calendario de eventos |
