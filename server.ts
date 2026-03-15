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
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Middleware para neutralizar el CSP restrictivo del VPS y permitir CDNs
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.tailwindcss.com; " +
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; " +
    "img-src 'self' data: https://res.cloudinary.com; " +
    "connect-src 'self' https://vps-4455523-x.dattaweb.com https://*.cloudinary.com;"
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

// Static files - Detecta automaticamente si estamos en /dist o raiz
app.use(BASE_PATH, express.static(path.join(ROOT_DIR, 'public')));
app.use(`${BASE_PATH}/img`, express.static(path.join(ROOT_DIR, 'img')));

// API Routes
app.use(`${BASE_PATH}/api/tagging`, searchRoutes);
app.use(`${BASE_PATH}/api/auth`, authRoutes);
app.use(`${BASE_PATH}/api/admin`, adminRoutes);
app.use(`${BASE_PATH}/api/posts`, postRoutes);
app.use(`${BASE_PATH}/api/chat`, chatRoutes);
app.use(`${BASE_PATH}/api/recursos`, recursosRoutes);
app.use(`${BASE_PATH}/api/eventos`, eventosRoutes);
app.use(`${BASE_PATH}/api/upload`, uploadRoutes);
app.use(`${BASE_PATH}/api/profile`, profileRoutes);

// SPA fallback — serve index.html for the base path and all sub-routes
app.get([BASE_PATH, `${BASE_PATH}/*`], (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'public', 'index.html'));
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
  if (userCount === 0) {
    const adminUser = process.env.STARTING_ADMIN_USER || 'admin';
    const adminPass = process.env.STARTING_ADMIN_PASS;
    if (!adminPass) {
      console.error('[Seed] No se pudo crear admin: STARTING_ADMIN_PASS no definida en .env');
      return;
    }
    const hashedPass = await bcrypt.hash(adminPass, 10);

    await User.create({
      username: adminUser,
      email: `${adminUser}@artedigital.com`,
      password: hashedPass,
      role: 'ADMINISTRADOR',
    });

    console.log(`[Seed] Usuario ADMINISTRADOR creado: ${adminUser}`);
  } else {
    console.log(`[Seed] Ya existen ${userCount} usuarios. No se creó admin.`);
  }
}

// ========== START ==========
async function start(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[DB] Conectado a MongoDB:', MONGODB_URI);

    await seedAdmin();

    server.listen(PORT, () => {
      console.log(`[Server] Arte Digital Data corriendo en http://localhost:${PORT}${BASE_PATH}/`);
    });
  } catch (err) {
    console.error('[Server] Error al iniciar:', err);
    process.exit(1);
  }
}

start();
