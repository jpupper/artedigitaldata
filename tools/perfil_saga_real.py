"""Borra el usuario duplicado que se creó por error y completa el perfil REAL
(username 'Saga', id 6abae138bdc0316557082d1e) con la bio y la foto."""
import json, subprocess, os

PROY = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
AVATAR = 'https://artedigitaldata.com/img/artistas/saga-barros.jpg'
BIO = ("Artista visual, desarrollador de videojuegos, gestor cultural y docente tucumanx. "
       "Co-fundó Ludalab - Laboratorio de Artes Electrónicas y Digitales en 2020; una de sus líneas de trabajo "
       "es la exploración en la impresión 3D con arcilla. Produjeron los encuentros de formación, investigación "
       "y producción Art Jam en 2022 y 2023. - "
       "Co-fundó y preside Tucumán Videojuegos Cooperativa desde 2023, donde desarrollan juegos propios y por "
       "encargo; actualmente trabajan en Vagabundo, una obra que expresa su amor por la yunga tucumana. - "
       "Sus trabajos curatoriales incluyen la muestra colectiva Protocolos de Transmisión de Datos (2024) y el "
       "Faro Cultural para la Noche de los Museos de Tucumán 2026. - "
       "Forma parte de la Comunidad de Desarrolladores de Videojuegos de Tucumán y de la Asociación de "
       "Trabajadores Tucumán Audiovisual (TAV). - "
       "Produce anualmente los festivales Tucumán Hace Videojuegos (desde 2018), Visión Norte (audiovisual, desde "
       "2025) y Tormenta (arte y nuevas tecnologías, desde 2024). - "
       "Actualmente produce las Zapadas Audiovisuales y es director académico de la Diplomatura en Desarrollo de "
       "Videojuegos de la Universidad Nacional de Tucumán.")

script = r"""
const m=require('mongoose');
const AVATAR=%s, BIO=%s;
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
""" % (json.dumps(AVATAR), json.dumps(BIO))

p = os.path.join(PROY, 'tools', 'vps_set_saga_real.js')
open(p, 'w', encoding='utf-8').write(script)
subprocess.run(['scp', '-P', '5752', p, 'root@149.50.139.152:/root/artedigitaldata/vps_set_saga_real.js'],
               check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
r = subprocess.run(['ssh', '-p', '5752', 'root@149.50.139.152',
                    'cd /root/artedigitaldata && node vps_set_saga_real.js'],
                   capture_output=True, text=True, timeout=180)
print(r.stdout.strip() or r.stderr.strip()[:400])
