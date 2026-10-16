/** Busca 'saga'/'barros' en las bases del VPS y lista los usuarios de artedigitaldata. */
const mongoose = require('mongoose');

(async () => {
  // 1) bases disponibles
  const admin = await mongoose.connect('mongodb://127.0.0.1:27017/admin').then(() => mongoose.connection.db.admin().listDatabases());
  console.log('bases:', admin.databases.map(d => d.name).join(', '));

  for (const base of ['artedigital', 'fscauth', 'fullscreen_global', 'fullscreencode']) {
    try {
      const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/' + base).asPromise();
      const cols = await conn.db.listCollections().toArray();
      const nombres = cols.map(c => c.name);
      console.log('\n===', base, '=>', nombres.join(', '));
      const colUsuarios = nombres.find(n => /user|usuario/i.test(n));
      if (colUsuarios) {
        const docs = await conn.db.collection(colUsuarios).find({}).toArray();
        console.log('   usuarios en', colUsuarios, ':', docs.length);
        const hits = docs.filter(u => JSON.stringify(u).match(/saga|barros/i));
        console.log('   coincidencias saga/barros:', hits.length);
        hits.slice(0, 3).forEach(u => console.log('   ->', JSON.stringify({ _id: String(u._id), displayName: u.displayName, username: u.username, email: u.email, bio: (u.bio || '').slice(0, 60) })));
        if (base === 'artedigital' && hits.length === 0) {
          console.log('   (nombres de ejemplo):', docs.slice(0, 12).map(u => u.displayName || u.username || u.email).join(' | '));
        }
      }
      await conn.close();
    } catch (e) {
      console.log('\n===', base, 'ERROR', e.message);
    }
  }
  process.exit(0);
})();
