
const m=require('mongoose');
const BIO="Artista visual, desarrollador de videojuegos, gestor cultural y docente tucumanx. Co-fund\u00f3 Ludalab - Laboratorio de Artes Electr\u00f3nicas y Digitales en 2020; una de sus l\u00edneas de trabajo es la exploraci\u00f3n en la impresi\u00f3n 3D con arcilla. Produjeron los encuentros de formaci\u00f3n, investigaci\u00f3n y producci\u00f3n Art Jam en 2022 y 2023. Co-fund\u00f3 y preside Tucum\u00e1n Videojuegos Cooperativa desde 2023, donde desarrollan juegos propios y por encargo; actualmente trabajan en Vagabundo, una obra que expresa su amor por la yunga tucumana. Sus trabajos curatoriales incluyen la muestra colectiva Protocolos de Transmisi\u00f3n de Datos (2024) y el Faro Cultural para la Noche de los Museos de Tucum\u00e1n 2026. Forma parte de la Comunidad de Desarrolladores de Videojuegos de Tucum\u00e1n y de la Asociaci\u00f3n de Trabajadores Tucum\u00e1n Audiovisual (TAV). Produce anualmente los festivales Tucum\u00e1n Hace Videojuegos (desde 2018), Visi\u00f3n Norte (audiovisual, desde 2025) y Tormenta (arte y nuevas tecnolog\u00edas, desde 2024). Actualmente produce las Zapadas Audiovisuales y es director acad\u00e9mico de la Diplomatura en Desarrollo de Videojuegos de la Universidad Nacional de Tucum\u00e1n.";
const AVATAR="https://artedigitaldata.com/img/artistas/saga-barros.jpg";
const EMAIL="saga.barros@artedigitaldata.com";
const NOMBRE="SAGA BARROS";
m.connect('mongodb://127.0.0.1:27017/artedigital').then(async()=>{
  const c=m.connection.db.collection('users');
  const u=await c.findOne({email:EMAIL});
  if(!u){ console.log('NO EXISTE el usuario con ese email'); process.exit(0); }
  await c.updateOne({_id:u._id},{$set:{bio:BIO,avatar:AVATAR,avatarUrl:AVATAR,displayName:NOMBRE,artisticName:NOMBRE}});
  const w=await c.findOne({_id:u._id});
  console.log('ACTUALIZADO', JSON.stringify({_id:String(w._id),displayName:w.displayName,email:w.email,avatar:w.avatar,bioLen:(w.bio||'').length}));
  await m.disconnect();
}).catch(e=>{console.error('ERR',e.message);process.exit(1)});
