
const m=require('mongoose');
const AVATAR="https://artedigitaldata.com/img/artistas/saga-barros.jpg", BIO="Artista visual, desarrollador de videojuegos, gestor cultural y docente tucumanx. Co-fund\u00f3 Ludalab - Laboratorio de Artes Electr\u00f3nicas y Digitales en 2020; una de sus l\u00edneas de trabajo es la exploraci\u00f3n en la impresi\u00f3n 3D con arcilla. Produjeron los encuentros de formaci\u00f3n, investigaci\u00f3n y producci\u00f3n Art Jam en 2022 y 2023. - Co-fund\u00f3 y preside Tucum\u00e1n Videojuegos Cooperativa desde 2023, donde desarrollan juegos propios y por encargo; actualmente trabajan en Vagabundo, una obra que expresa su amor por la yunga tucumana. - Sus trabajos curatoriales incluyen la muestra colectiva Protocolos de Transmisi\u00f3n de Datos (2024) y el Faro Cultural para la Noche de los Museos de Tucum\u00e1n 2026. - Forma parte de la Comunidad de Desarrolladores de Videojuegos de Tucum\u00e1n y de la Asociaci\u00f3n de Trabajadores Tucum\u00e1n Audiovisual (TAV). - Produce anualmente los festivales Tucum\u00e1n Hace Videojuegos (desde 2018), Visi\u00f3n Norte (audiovisual, desde 2025) y Tormenta (arte y nuevas tecnolog\u00edas, desde 2024). - Actualmente produce las Zapadas Audiovisuales y es director acad\u00e9mico de la Diplomatura en Desarrollo de Videojuegos de la Universidad Nacional de Tucum\u00e1n.";
const ID_OK='6abae138bdc0316557082d1e';          // cuenta real (username 'Saga')
const ID_MALO='6acf1c76448524846bec88f6';        // duplicado creado por error
(async()=>{
  const conn = await m.createConnection('mongodb://127.0.0.1:27017/fullscreen_global').asPromise();
  const users = conn.db.collection('users');

  const dup = await users.findOne({_id: new m.Types.ObjectId(ID_MALO)});
  if (dup) { await users.deleteOne({_id: dup._id}); console.log('DUPLICADO BORRADO:', dup.username); }
  else console.log('el duplicado ya no estaba');

  const r = await users.updateOne({_id: new m.Types.ObjectId(ID_OK)}, {$set:{ avatar: AVATAR, bio: BIO, displayName: 'SAGA BARROS' }});
  const w = await users.findOne({_id: new m.Types.ObjectId(ID_OK)});
  console.log('PERFIL ACTUALIZADO ->', JSON.stringify({ username: w.username, displayName: w.displayName, email: w.email, avatar: w.avatar, bioLen: (w.bio||'').length, socials: w.socials }));

  // por si el sitio tambien guarda copia local en artedigital
  await conn.close();
  const c2 = await m.createConnection('mongodb://127.0.0.1:27017/artedigital').asPromise();
  const u2 = c2.db.collection('users');
  const existe = await u2.findOne({username:/^saga$/i});
  console.log('copia local en artedigital:', existe ? 'sí' : 'no hay');
  if (existe) {
    await u2.updateOne({_id: existe._id}, {$set:{ avatar: AVATAR, bio: BIO, displayName: 'SAGA BARROS' }});
    console.log('  -> copia local actualizada');
  }
  const dupLocal = await u2.findOne({email:'saga.barros@artedigitaldata.com'});
  if (dupLocal) { await u2.deleteOne({_id: dupLocal._id}); console.log('  -> duplicado local borrado'); }
  await c2.close();
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
