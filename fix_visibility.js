const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/artedigital').then(async () => {
  const db = mongoose.connection.db;
  
  // Update all collections to set visibility: 'public' where it's null or doesn't exist
  const collections = ['posts', 'recursos', 'eventos', 'oportunidades'];
  
  for (const col of collections) {
    const result = await db.collection(col).updateMany(
      { $or: [{ visibility: null }, { visibility: { $exists: false } }] },
      { $set: { visibility: 'public' } }
    );
    console.log(`${col}: ${result.modifiedCount} documents updated`);
  }
  
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
