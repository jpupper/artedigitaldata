const mongoose = require('mongoose');
require('dotenv').config();

const authUri = process.env.MONGODB_AUTH_URI || 'mongodb://127.0.0.1:27017/fullscreen_global';

async function seed() {
  try {
    await mongoose.connect(authUri);
    console.log('Connected to', authUri);
    const db = mongoose.connection.db;
    const usersCol = db.collection('users');

    const existing = await usersCol.findOne({
      $or: [
        { username: 'jpupper' },
        { email: 'julian.d.puppo@gmail.com' },
        { _id: new mongoose.Types.ObjectId('69c02530b2cc8407a1eb07f1') }
      ]
    });

    const userDoc = {
      _id: new mongoose.Types.ObjectId('69c02530b2cc8407a1eb07f1'),
      username: 'jpupper',
      displayName: 'JPupper',
      email: 'julian.d.puppo@gmail.com',
      avatar: 'https://vps-4455523-x.dattaweb.com/artedigitaldata/img/uploads/general/fb3ac03c-2ea0-4f1d-bc49-8d52ad679779.jpg',
      bio: 'Master Supreme Admin',
      role: 'ADMIN',
      origin: 'artedigitaldata',
      permissions: {
        artedigital: {
          role: 'ADMINISTRADOR'
        }
      },
      createdAt: new Date('2026-03-15T17:49:29.209Z'),
      updatedAt: new Date()
    };

    if (existing) {
      await usersCol.deleteOne({ _id: existing._id });
      console.log('Removed old user document:', existing._id);
    }
    await usersCol.insertOne(userDoc);
    console.log('Inserted jpupper user with exact ID in local DB');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
