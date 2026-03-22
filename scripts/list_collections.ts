import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const ART_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';

async function listCollections() {
  try {
    const artConn = await mongoose.createConnection(ART_URI).asPromise();
    const collections = await artConn.db!.listCollections().toArray();
    console.log('--- Colecciones en DB artedigital ---');
    console.log(collections.map(c => c.name));

    for (const coll of collections) {
      const count = await artConn.db!.collection(coll.name).countDocuments();
      console.log(`- ${coll.name}: ${count} documentos`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listCollections();
