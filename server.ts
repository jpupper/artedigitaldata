import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';

import User from './src/models/User';
import Message from './src/models/Message';
import ChatRoom from './src/models/ChatRoom';

import authRoutes from './src/routes/auth';
import adminRoutes from './src/routes/admin';
import postRoutes from './src/routes/posts';
import chatRoutes from './src/routes/chat';
import recursosRoutes from './src/routes/recursos';
import eventosRoutes from './src/routes/eventos';
import uploadRoutes from './src/routes/upload';
import profileRoutes from './src/routes/profile';
import searchRoutes from './src/routes/search';

const PORT = process.env.PORT || 2495;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';
const BASE_PATH = '/artedigitaldata';

const app = express();
const server = http.createServer(app);

// Detectar si estamos en /dist o en la raiz (para servir public correctamente)
const ROOT_DIR = __dirname.endsWith('dist') ? path.join(__dirname, '..') : __dirname;

const io = new SocketServer(server, {
  path: `${BASE_PATH}/socket.io`,
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] },
});

// Middleware
app.use(cors({
  origin: ["https://fullscreencode.com", "https://artedigitaldata.com", "http://localhost:2495", "http://localhost:5173", "http://localhost:3000", "https://vps-4455523-x.dattaweb.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true
}));

// Middleware para neutralizar el CSP restrictivo del VPS y permitir CDNs
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' *; " +
    "style-src 'self' 'unsafe-inline' *; " +
    "font-src 'self' data: *; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' *; " +
    "img-src 'self' data: *; " +
    "connect-src 'self' *;"
  );
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Static files - Servir tanto en raíz como en /artedigitaldata para máxima compatibilidad
app.use(BASE_PATH, express.static(path.join(ROOT_DIR, 'public')));
app.use(`${BASE_PATH}/img`, express.static(path.join(ROOT_DIR, 'img')));
app.use('/', express.static(path.join(ROOT_DIR, 'public')));
app.use('/img', express.static(path.join(ROOT_DIR, 'img')));

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

// Registrar API en ambos paths (con y sin prefijo)
app.use(`${BASE_PATH}/api`, apiRouter);
app.use('/api', apiRouter);

// SPA fallback — serve index.html for all matching paths
const serveIndex = (_req: express.Request, res: express.Response) => {
  res.sendFile(path.join(ROOT_DIR, 'public', 'index.html'));
};

app.get([BASE_PATH, `${BASE_PATH}/*`], serveIndex);
// Solo servimos fallback en raíz si no hay conflicto (cuidado aquí si hay otras apps)
// Pero el usuario pidió que funcione en artedigitaldata.com que seguro es raíz
app.get('/*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith(BASE_PATH)) return next();
  serveIndex(req, res);
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  console.log(`[Socket] Cliente conectado: ${socket.id}`);

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
      const populated = await message.populate('sender', 'username avatar');
      io.to(data.roomId).emit('newMessage', populated);
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

