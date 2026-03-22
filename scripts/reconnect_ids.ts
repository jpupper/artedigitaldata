import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

const ARTEDIGITAL_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';
const GLOBAL_URI = process.env.MONGODB_AUTH_URI || 'mongodb://localhost:27017/fullscreen_global';

async function reconnect() {
  try {
    console.log('--- Iniciando Reconexión de IDs de Usuario en Arte Digital ---');

    const artConn = await mongoose.createConnection(ARTEDIGITAL_URI).asPromise();
    const globalConn = await mongoose.createConnection(GLOBAL_URI).asPromise();

    console.log('[OK] Conectado a ambas bases de datos.');

    // Esquemas temporales (strict: false para no lidiar con tipos exactos aquí)
    const OldUserModel = artConn.model('OldUser', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const GlobalUserModel = globalConn.model('GlobalUser', new mongoose.Schema({}, { strict: false, collection: 'users' }));

    const PostModel = artConn.model('Post', new mongoose.Schema({}, { strict: false, collection: 'posts' }));
    const RecursoModel = artConn.model('Recurso', new mongoose.Schema({}, { strict: false, collection: 'recursos' }));
    const EventoModel = artConn.model('Evento', new mongoose.Schema({}, { strict: false, collection: 'eventos' }));
    const MessageModel = artConn.model('Message', new mongoose.Schema({}, { strict: false, collection: 'messages' }));

    const artUsers = await OldUserModel.find({});
    console.log(`[INFO] Encontrados ${artUsers.length} usuarios antiguos en Arte Digital.`);

    let count = 0;

    for (const oldU of artUsers) {
      if (!oldU.email) continue;
      
      const newU = await GlobalUserModel.findOne({ email: oldU.email.toLowerCase() });
      if (!newU) {
        console.warn(`[SKIP] No se encontró usuario global para: ${oldU.email}`);
        continue;
      }

      const oldId = oldU._id;
      const newId = newU._id;

      if (oldId.toString() === newId.toString()) {
        // console.log(`[SAME] IDs idénticos para ${oldU.email}.`);
        continue;
      }

      console.log(`[LINK] ${oldU.email}: ${oldId} -> ${newId}`);

      // Actualizar Posts
      await PostModel.updateMany({ author: oldId }, { $set: { author: newId } });
      await PostModel.updateMany({ likes: oldId }, { $set: { 'likes.$': newId } });
      await PostModel.updateMany({ 'comments.user': oldId }, { $set: { 'comments.$.user': newId } });

      // Actualizar Recursos
      await RecursoModel.updateMany({ author: oldId }, { $set: { author: newId } });
      await RecursoModel.updateMany({ likes: oldId }, { $set: { 'likes.$': newId } });
      await RecursoModel.updateMany({ 'comments.user': oldId }, { $set: { 'comments.$.user': newId } });

      // Actualizar Eventos
      await EventoModel.updateMany({ creator: oldId }, { $set: { creator: newId } });
      await EventoModel.updateMany({ participants: oldId }, { $set: { 'participants.$': newId } });
      await EventoModel.updateMany({ 'comments.user': oldId }, { $set: { 'comments.$.user': newId } });

      // Actualizar Mensajes
      await MessageModel.updateMany({ sender: oldId }, { $set: { sender: newId } });
      await MessageModel.updateMany({ receiver: oldId }, { $set: { receiver: newId } });

      count++;
    }

    console.log(`\n--- Reconexión finalizada: ${count} usuarios vinculados exitosamente ---`);
    process.exit(0);
  } catch (err) {
    console.error('--- ERROR DURANTE RECONEXIÓN ---', err);
    process.exit(1);
  }
}

reconnect();
