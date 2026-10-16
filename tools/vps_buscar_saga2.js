
const m=require('mongoose');
const RX=/saga/i;
(async()=>{
  for (const base of ['artedigital','fullscreen_global']) {
    const conn = await m.createConnection('mongodb://127.0.0.1:27017/'+base).asPromise();
    const cols = await conn.db.listCollections().toArray();
    for (const c of cols) {
      const docs = await conn.db.collection(c.name).find({}).limit(5000).toArray();
      const hits = docs.filter(d => RX.test(d.username||'') || RX.test(d.displayName||'') || RX.test(d.email||'') || RX.test(d.name||''));
      if (hits.length) {
        console.log('===', base+'.'+c.name, '->', hits.length, 'de', docs.length);
        hits.slice(0,4).forEach(h=>console.log('   ', JSON.stringify(h).slice(0, 420)));
      }
    }
    await conn.close();
  }
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
