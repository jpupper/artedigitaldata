/** Busca en Mongo las usuarias que puedan ser SAGA BARROS.
 *  Uso en el VPS: node vps_buscar_usuario.js saga barros
 */
const mongoose = require('mongoose');
const terms = process.argv.slice(2).map(t => new RegExp(t, 'i'));

mongoose.connect('mongodb://127.0.0.1:27017/artedigital').then(async () => {
  const c = mongoose.connection.db.collection('users');
  const todos = await c.find({}, { projection: { displayName: 1, username: 1, email: 1, bio: 1, avatar: 1, avatarUrl: 1, role: 1, socials: 1 } }).toArray();
  const hits = todos.filter(u => terms.some(r => r.test(u.displayName || '') || r.test(u.username || '') || r.test(u.email || '')));
  console.log('total usuarios:', todos.length, '| coincidencias:', hits.length);
  hits.forEach(u => {
    console.log('---');
    console.log('_id        :', String(u._id));
    console.log('displayName:', u.displayName);
    console.log('username   :', u.username);
    console.log('email      :', u.email);
    console.log('rol        :', u.role);
    console.log('avatar     :', u.avatar || u.avatarUrl || '(sin avatar)');
    console.log('bio        :', (u.bio || '(sin bio)').slice(0, 90));
  });
  if (hits.length) {
    console.log('\n=== TODOS LOS CAMPOS DEL PRIMERO ===');
    console.log(JSON.stringify(hits[0], null, 1).slice(0, 1200));
  }
  await mongoose.disconnect();
}).catch(e => { console.error('ERR', e.message); process.exit(1); });
