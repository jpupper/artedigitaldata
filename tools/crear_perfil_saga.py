"""Crea/actualiza el perfil de SAGA BARROS en artedigitaldata:
 - alta por el endpoint real de registro (así el usuario queda completo y válido)
 - después completa bio + avatar + nombre artístico en la base
 - la clave se genera al azar y NO se imprime (ella la define con 'olvidé mi contraseña')
"""
import io, json, os, ssl, random, string, subprocess, urllib.request

PROY = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
VPS = ['ssh', '-p', '5752', '-o', 'StrictHostKeyChecking=no', 'root@149.50.139.152']
REGISTER = 'https://vps-4455523-x.dattaweb.com/fscauth/api/auth/register'

NOMBRE = 'SAGA BARROS'
EMAIL  = 'saga.barros@artedigitaldata.com'      # provisorio hasta que pasen el real
AVATAR = 'https://artedigitaldata.com/img/artistas/saga-barros.jpg'
BIO = ("Artista visual, desarrollador de videojuegos, gestor cultural y docente tucumanx. "
       "Co-fundó Ludalab - Laboratorio de Artes Electrónicas y Digitales en 2020; una de sus líneas de trabajo "
       "es la exploración en la impresión 3D con arcilla. Produjeron los encuentros de formación, investigación "
       "y producción Art Jam en 2022 y 2023. "
       "Co-fundó y preside Tucumán Videojuegos Cooperativa desde 2023, donde desarrollan juegos propios y por "
       "encargo; actualmente trabajan en Vagabundo, una obra que expresa su amor por la yunga tucumana. "
       "Sus trabajos curatoriales incluyen la muestra colectiva Protocolos de Transmisión de Datos (2024) y el "
       "Faro Cultural para la Noche de los Museos de Tucumán 2026. "
       "Forma parte de la Comunidad de Desarrolladores de Videojuegos de Tucumán y de la Asociación de "
       "Trabajadores Tucumán Audiovisual (TAV). "
       "Produce anualmente los festivales Tucumán Hace Videojuegos (desde 2018), Visión Norte (audiovisual, desde "
       "2025) y Tormenta (arte y nuevas tecnologías, desde 2024). "
       "Actualmente produce las Zapadas Audiovisuales y es director académico de la Diplomatura en Desarrollo de "
       "Videojuegos de la Universidad Nacional de Tucumán.")


def azar(n=24):
    return ''.join(random.choice(string.ascii_letters + string.digits + '!%*+-_') for _ in range(n))


def post(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode(),
                                headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        return e.code, {'error': e.read().decode()[:300]}
    except Exception as e:
        return 0, {'error': str(e)}


clave = azar()
print('=== 1) alta por el endpoint de registro ===')
for body in [
    {'displayName': NOMBRE, 'email': EMAIL, 'password': clave, 'origen': 'artedigitaldata'},
    {'displayName': NOMBRE, 'username': EMAIL, 'email': EMAIL, 'password': clave},
]:
    st, resp = post(REGISTER, body)
    print('  intento ->', st, str(resp)[:180])
    if st in (200, 201):
        break

print('\n=== 2) completar bio + avatar + nombre en la base ===')
script = """
const m=require('mongoose');
const BIO=%s;
const AVATAR=%s;
const EMAIL=%s;
const NOMBRE=%s;
m.connect('mongodb://127.0.0.1:27017/artedigital').then(async()=>{
  const c=m.connection.db.collection('users');
  const u=await c.findOne({email:EMAIL});
  if(!u){ console.log('NO EXISTE el usuario con ese email'); process.exit(0); }
  await c.updateOne({_id:u._id},{$set:{bio:BIO,avatar:AVATAR,avatarUrl:AVATAR,displayName:NOMBRE,artisticName:NOMBRE}});
  const w=await c.findOne({_id:u._id});
  console.log('ACTUALIZADO', JSON.stringify({_id:String(w._id),displayName:w.displayName,email:w.email,avatar:w.avatar,bioLen:(w.bio||'').length}));
  await m.disconnect();
}).catch(e=>{console.error('ERR',e.message);process.exit(1)});
""" % (json.dumps(BIO), json.dumps(AVATAR), json.dumps(EMAIL), json.dumps(NOMBRE))

open(os.path.join(PROY, 'tools', 'vps_set_saga.js'), 'w', encoding='utf-8').write(script)
subprocess.run(['scp', '-P', '5752', os.path.join(PROY, 'tools', 'vps_set_saga.js'),
                'root@149.50.139.152:/root/artedigitaldata/vps_set_saga.js'], check=True,
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
r = subprocess.run(VPS + ['cd /root/artedigitaldata && node vps_set_saga.js'], capture_output=True, text=True, timeout=120)
print(r.stdout.strip() or r.stderr.strip()[:300])
