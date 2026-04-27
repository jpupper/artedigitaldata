import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load models
import User from './src/models/User';
import Post from './src/models/Post';
import Evento from './src/models/Evento';
import Recurso from './src/models/Recurso';

dotenv.config();

async function diagnose() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI not found in .env');
    process.exit(1);
  }

  console.log('--- DIAGNÓSTICO DE BASE DE DATOS ---');
  console.log(`Conectando a: ${uri.split('@').pop()}`);

  try {
    await mongoose.connect(uri);
    console.log('[OK] Conectado exitosamente');

    const targetId = '69b6f395fc3d06f7651d967a';
    console.log(`\nBuscando ID específico: ${targetId}`);

    const [post, recurso, evento] = await Promise.all([
      Post.findById(targetId),
      Recurso.findById(targetId),
      Evento.findById(targetId)
    ]);

    if (post) console.log(`[ENCONTRADO] El ID pertenece a un POST: "${post.title}"`);
    if (recurso) console.log(`[ENCONTRADO] El ID pertenece a un RECURSO: "${recurso.title}"`);
    if (evento) console.log(`[ENCONTRADO] El ID pertenece a un EVENTO: "${evento.title}"`);

    if (!post && !recurso && !evento) {
      console.log('[X] El ID NO existe en la base de datos actual.');
      console.log('    Esto confirma que la "rutina" no lo cargó o los datos están incompletos.');
    }

    console.log('\n--- Estadísticas Generales ---');
    const stats = await Promise.all([
      Post.countDocuments(),
      Recurso.countDocuments(),
      Evento.countDocuments(),
      User.countDocuments()
    ]);

    console.log(`Posts: ${stats[0]}`);
    console.log(`Recursos: ${stats[1]}`);
    console.log(`Eventos: ${stats[2]}`);
    console.log(`Usuarios: ${stats[3]}`);

    process.exit(0);
  } catch (err) {
    console.error('Error durante el diagnóstico:', err);
    process.exit(1);
  }
}

diagnose();
