const mongoose = require('mongoose');

const mongoUri = 'mongodb://127.0.0.1:27017/artedigital';
const ids = [
  '69b6f395fc3d06f7651d967a',
  '69b6f758fc3d06f7651d96ce',
  '69b702f0de708b12e9c27a82'
];

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const id of ids) {
      console.log(`\nChecking ID: ${id}`);
      let found = false;
      for (const col of collections) {
        const doc = await mongoose.connection.db.collection(col.name).findOne({ 
          $or: [
            { _id: id }, 
            { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null }
          ].filter(q => q !== null)
        });
        if (doc) {
          console.log(`[FOUND] in ${col.name}: ${doc.title || doc.name || 'Untitled'}`);
          console.log(JSON.stringify(doc, null, 2));
          found = true;
        }
      }
      if (!found) console.log('[NOT FOUND]');
    }
    
    // Also check the global auth database just in case
    const authUri = 'mongodb://127.0.0.1:27017/fullscreen_global';
    await mongoose.disconnect();
    await mongoose.connect(authUri);
    console.log('\nConnected to Auth MongoDB (fullscreen_global)');
    for (const id of ids) {
        const collectionsAuth = await mongoose.connection.db.listCollections().toArray();
        for (const col of collectionsAuth) {
            const doc = await mongoose.connection.db.collection(col.name).findOne({ 
                $or: [
                  { _id: id }, 
                  { _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null }
                ].filter(q => q !== null)
              });
              if (doc) {
                console.log(`[FOUND] in AuthDB/${col.name}: ${doc.username || doc.displayName || 'Untitled'}`);
                found = true;
              }
        }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
