import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const GLOBAL_URI = process.env.MONGODB_AUTH_URI || 'mongodb://localhost:27017/fullscreen_global';

async function listCollections() {
  try {
    const globalConn = await mongoose.createConnection(GLOBAL_URI).asPromise();
    const collections = await globalConn.db!.listCollections().toArray();
    console.log('--- Colecciones en DB fullscreen_global ---');
    console.log(collections.map(c => c.name));

    for (const coll of collections) {
      const count = await globalConn.db!.collection(coll.name).countDocuments();
      console.log(`- ${coll.name}: ${count} documentos`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listCollections();
