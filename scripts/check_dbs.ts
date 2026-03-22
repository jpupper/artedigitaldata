import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const ART_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';
const GLOBAL_URI = process.env.MONGODB_AUTH_URI || 'mongodb://localhost:27017/fullscreen_global';

async function check() {
  try {
    const artConn = await mongoose.createConnection(ART_URI).asPromise();
    const globalConn = await mongoose.createConnection(GLOBAL_URI).asPromise();

    const ArtUser = artConn.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const GlobalUser = globalConn.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

    const artCount = await ArtUser.countDocuments();
    const globalCount = await GlobalUser.countDocuments();

    console.log(`Usuarios en Arte Digital (Local): ${artCount}`);
    console.log(`Usuarios en Fullscreen Global: ${globalCount}`);

    const globalUsers = await GlobalUser.find({}, 'username email').limit(5);
    console.log('--- Muestra de usuarios Globales ---');
    console.log(globalUsers);

    const artUsers = await ArtUser.find({}, 'username email').limit(5);
    console.log('--- Muestra de usuarios Locales ---');
    console.log(artUsers);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
