import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const ART_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artedigital';
const GLOBAL_URI = process.env.MONGODB_AUTH_URI || 'mongodb://localhost:27017/fullscreen_global';

async function findUsers() {
  try {
    const artConn = await mongoose.createConnection(ART_URI).asPromise();
    const globalConn = await mongoose.createConnection(GLOBAL_URI).asPromise();

    const ArtUser = artConn.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const GlobalUser = globalConn.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

    const artUsers = await ArtUser.find({});
    const globalUsers = await GlobalUser.find({});

    console.log('--- Usuarios en Arte Digital (Local) ---');
    artUsers.forEach((u: any) => console.log(`${u.get('username') || 'S/N'} (${u.get('email') || 'S/E'}) [ID: ${u._id}]`));

    console.log('\n--- Usuarios en Fullscreen Global ---');
    globalUsers.forEach((u: any) => console.log(`${u.get('username') || 'S/N'} (${u.get('email') || 'S/E'}) [ID: ${u._id}]`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findUsers();
