/**
 * Script único para arreglar los posts/recursos creados por el autobot
 * que no tienen el tag 'autobotadd' ni source: 'ia'.
 * 
 * Ejecutar: npx ts-node src/scripts/fix-autobot-tags.ts
 * (con el backend corriendo / mongoose conectado)
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

// Importar modelos para que mongoose los registre
import '../models/User';
import '../models/Post';
import '../models/Recurso';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';
  await mongoose.connect(uri);
  console.log('Conectado a MongoDB');

  // Buscar el usuario ADDBOT para identificar sus publicaciones
  const User = mongoose.model('User');
  const botUser = await User.findOne({ username: 'ADDBOT' });
  if (!botUser) {
    console.log('Usuario ADDBOT no encontrado — nada que arreglar.');
    await mongoose.disconnect();
    return;
  }

  const botId = botUser._id;

  // === POSTS ===
  const Post = mongoose.model('Post');
  const postResult = await Post.updateMany(
    { author: botId, tags: { $ne: 'autobotadd' } },
    { 
      $addToSet: { tags: { $each: ['autobotadd', 'noticia'] } },
      $set: { source: 'ia' }
    }
  );
  console.log(`Posts arreglados: ${postResult.modifiedCount} documentos`);

  // === RECURSOS ===
  const Recurso = mongoose.model('Recurso');
  const recursoResult = await Recurso.updateMany(
    { author: botId, tags: { $ne: 'autobotadd' } },
    { 
      $addToSet: { tags: { $each: ['autobotadd', 'digital-art'] } },
      $set: { source: 'ia' }
    }
  );
  console.log(`Recursos arreglados: ${recursoResult.modifiedCount} documentos`);

  console.log('✅ Listo');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
