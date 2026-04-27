import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import User from './src/models/User';
import Message from './src/models/Message';
import ChatRoom from './src/models/ChatRoom';
import Notification from './src/models/Notification';

import authRoutes from './src/routes/auth';
import adminRoutes from './src/routes/admin';
import postRoutes from './src/routes/posts';
import chatRoutes from './src/routes/chat';
import recursosRoutes from './src/routes/recursos';
import eventosRoutes from './src/routes/eventos';
import uploadRoutes from './src/routes/upload';
import profileRoutes from './src/routes/profile';
import searchRoutes from './src/routes/search';
import ticketRoutes from './src/routes/tickets';
import notificationRoutes from './src/routes/notifications';
import { hydrate } from './src/utils/userHydration';

const PORT = process.env.PORT || 2495;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';
const BASE_PATH: string = '/artedigitaldata';

const app = express();
const server = http.createServer(app);

// Detectar si estamos en /dist o en la raiz (para servir public correctamente)
const ROOT_DIR = __dirname.endsWith('dist') ? path.join(__dirname, '..') : __dirname;

const io = new SocketServer(server, {
  path: `${BASE_PATH}/socket.io`,
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] },
});

// Export io for use in routes
export { io };

// Helper function to send notifications to specific users
export function notifyUser(userId: string, event: string, data: any) {
  io.to(`user_${userId}`).emit(event, data);
  console.log(`[Notification] Sent ${event} to user_${userId}`);
}

// Favicon local (silenciar error 404)
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// Middleware
app.use(cors({
  origin: ["https://fullscreencode.com", "https://artedigitaldata.com", "https://www.artedigitaldata.com", "http://localhost:2495", "http://localhost:5173", "http://localhost:3000", "https://vps-4455523-x.dattaweb.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true
}));

// Logger para depuración de rutas
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Middleware para neutralizar el CSP restrictivo del VPS y permitir CDNs
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' *; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.tailwindcss.com; " +
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.socket.io https://cdnjs.cloudflare.com; " +
    "img-src * data: blob: ; " +
    "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com; " +
    "connect-src 'self' ws: wss: https://vps-4455523-x.dattaweb.com https://fullscreencode.com https://artedigitaldata.com https://www.artedigitaldata.com https://*.cloudinary.com https://cdn.socket.io;"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// API Routes
const apiRouter = express.Router();
apiRouter.use('/tagging', searchRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/posts', postRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/recursos', recursosRoutes);
apiRouter.use('/eventos', eventosRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/tickets', ticketRoutes);
apiRouter.use('/notifications', notificationRoutes);

// Registrar API en ambos paths (con y sin prefijo) para máxima compatibilidad
// IMPORTANTE: Registrar ANTES de los recursos estáticos para evitar colisiones
app.use('/api', apiRouter);
app.use(`${BASE_PATH}/api`, apiRouter);

// Static files - Servir tanto en raíz como en /artedigitaldata para máxima compatibilidad
app.use(BASE_PATH, express.static(path.join(ROOT_DIR, 'public'), { extensions: ['html'] }));
app.use(`${BASE_PATH}/img`, express.static(path.join(ROOT_DIR, 'img')));
app.use('/', express.static(path.join(ROOT_DIR, 'public'), { extensions: ['html'] }));
app.use('/img', express.static(path.join(ROOT_DIR, 'img')));

// Route handling:
// Prioritizamos API y archivos estáticos
// El router de la API ya está registrado arriba.

// SPA fallback — serve index.html for all matching paths
const serveIndex = (_req: express.Request, res: express.Response) => {
  res.sendFile(path.join(ROOT_DIR, 'public', 'index.html'));
};

// 1. Manejo específico de la raíz del subpath
app.get([BASE_PATH, `${BASE_PATH}/`], serveIndex);

// 2. Interceptor global para SPA y API 404s
app.use((req, res, next) => {
  // Ignorar peticiones que ya tienen respuesta
  if (res.headersSent) return;

  const fullPath = (req.originalUrl || req.url).split('?')[0]; // Ignoramos query params para la lógica de archivos
  
  // Normalizamos para detectar /api regardless de la base
  const isApi = fullPath.includes('/api/');
  const isStaticFile = (fullPath.includes('.') && 
                       !fullPath.includes('.html') && 
                       !fullPath.includes('.php')) || 
                       fullPath.includes('/img/');

  // Verificamos si es una ruta que debería ser un .html (SPA clean URL)
  // Si llegamos aquí es porque express.static no encontró el archivo .html
  // Pero queremos asegurarnos de no servir index.html para rutas que parecen archivos
  
  if (isApi) {
    console.warn(`[SPA Interceptor] 404 for API route: ${req.method} ${req.originalUrl}. Returning JSON 404.`);
    return res.status(404).json({ 
      error: `API route not found: ${req.originalUrl}`,
      method: req.method,
      requestPath: req.path
    });
  }

  if (isStaticFile) {
    return res.status(404).send('Not Found');
  }

  // Rutas conocidas que NO son index.html pero son SPA (si se usan)
  // En este proyecto, la mayoría son archivos .html físicos, así que si llegamos aquí 
  // para /recurso y no existe recurso.html en public, entonces sí servimos index.html
  
  console.log(`[SPA Interceptor] Serving index.html as fallback for: ${req.originalUrl}`);
  serveIndex(req, res);
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  console.log(`[Socket] Cliente conectado: ${socket.id}`);

  // Allow users to join their own room for notifications
  socket.on('joinUserRoom', (userId: string) => {
    socket.join(`user_${userId}`);
    console.log(`[Socket] ${socket.id} se unió a sala user_${userId}`);
  });

  socket.on('joinRoom', async (roomId: string) => {
    socket.join(roomId);
    console.log(`[Socket] ${socket.id} se unió a sala ${roomId}`);
  });

  socket.on('leaveRoom', (roomId: string) => {
    socket.leave(roomId);
  });

  socket.on('chatMessage', async (data: { roomId: string; senderId: string; content: string }) => {
    try {
      const message = await Message.create({
        room: data.roomId,
        sender: data.senderId,
        content: data.content,
      });
      const [hydrated] = await hydrate([message], 'sender');
      io.to(data.roomId).emit('newMessage', hydrated);

      // Notify recipients of private messages
      const room = await ChatRoom.findById(data.roomId);
      if (room && room.isPrivate) {
        const sender = await User.findById(data.senderId).select('username displayName avatar');
        const recipients = room.participants.filter((p: any) => p.toString() !== data.senderId);
        for (const recipientId of recipients) {
          Notification.create({
            recipient: recipientId,
            type: 'private_message',
            actor: data.senderId,
            actorName: sender?.displayName || sender?.username || '',
            actorAvatar: sender?.avatar || '',
            resourceId: data.roomId,
            message: data.content.substring(0, 100),
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[Socket] Error guardando mensaje:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Cliente desconectado: ${socket.id}`);
  });
});

// ========== ADMIN SEEDING ==========
async function seedAdmin(): Promise<void> {
  const userCount = await User.countDocuments();
  console.log(`[AUTH] Sistema central detectado: ${userCount} usuarios registrados.`);
}

// ========== START ==========
async function start(): Promise<void> {
  try {
    // Conexión principal
    await mongoose.connect(MONGODB_URI);
    console.log('[DB] Conectado a MongoDB (Project):', MONGODB_URI);

    await seedAdmin();

    server.listen(PORT, () => {
      console.log(`[Server] Arte Digital Data corriendo en http://localhost:${PORT}/`);
      console.log(`[Server] También disponible en http://localhost:${PORT}${BASE_PATH}/`);
    });
  } catch (err) {
    console.error('[Server] Error al iniciar:', err);
    process.exit(1);
  }
}

start();

