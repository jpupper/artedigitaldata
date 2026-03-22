import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const ART_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';

async function checkResources() {
  try {
    const artConn = await mongoose.createConnection(ART_URI).asPromise();
    const Resource = artConn.model('Resource', new mongoose.Schema({}, { strict: false, collection: 'recursos' }));

    const r = await Resource.find({}, 'title author').limit(10);
    console.log('--- Recursos en Arte Digital ---');
    r.forEach((p: any) => console.log(`${p.get('title')} | Autor ID: ${p.get('author')}`));

    console.log('\n--- IDs únicos en Recursos ---');
    console.log(await Resource.distinct('author'));

    const Event = artConn.model('Event', new mongoose.Schema({}, { strict: false, collection: 'eventos' }));
    const e = await Event.find({}, 'title creator').limit(10);
    console.log('\n--- Eventos en Arte Digital ---');
    e.forEach((p: any) => console.log(`${p.get('title')} | Creador ID: ${p.get('creator')}`));

    console.log('\n--- IDs únicos en Eventos ---');
    console.log(await Event.distinct('creator'));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkResources();
