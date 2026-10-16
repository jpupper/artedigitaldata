"""Sube archivos del proyecto por FTP. Uso:

  python tools/deploy_archivos.py js/p5-effect.js js/paginas/flyer-1.js public/flyer.html --bump
  python tools/deploy_archivos.py css/fondo-ui.css

- Las rutas son relativas a public/ (aunque pongas 'public/' adelante).
- Con --bump sube la versión de p5-effect.js (?v=N+1) en TODAS las páginas,
  locales y publicadas, para que el navegador no sirva cache vieja.
"""
import io, os, re, ssl, sys, ftplib, urllib.request

PROJ = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
PUB = os.path.join(PROJ, 'public')

args = [a for a in sys.argv[1:] if not a.startswith('--')]
bump = '--bump' in sys.argv
if not args:
    print(__doc__); sys.exit(1)

env = {}
for linea in io.open(os.path.join(PROJ, '.env'), encoding='utf-8', errors='ignore'):
    linea = linea.strip()
    if linea.startswith('#') or '=' not in linea:
        continue
    k, v = linea.split('=', 1)
    env[k.strip()] = v.strip()

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
ftp = ftplib.FTP_TLS(context=ctx); ftp.connect(env['FTP_HOST'], 21, timeout=180)
ftp.login(env['FTP_USER'], env['FTP_PASS']); ftp.prot_p(); ftp.voidcmd('TYPE I')

def normalizar(rel):
    rel = rel.replace('\\', '/')
    if rel.startswith('public/'):
        rel = rel[len('public/'):]
    return rel

for rel in args:
    rel = normalizar(rel)
    lp = os.path.join(PUB, rel.replace('/', os.sep))
    if not os.path.exists(lp):
        print('  ✗ no existe:', lp); continue
    ftp.storbinary('STOR /artedigitaldata/' + rel, open(lp, 'rb'))
    print('  ↑', rel, os.path.getsize(lp), 'bytes ->', ftp.size('/artedigitaldata/' + rel))

if bump:
    vers = 1
    for f in os.listdir(PUB):
        if f.endswith('.html'):
            m = re.search(r'js/p5-effect\.js\?v=(\d+)', io.open(os.path.join(PUB, f), encoding='utf-8', errors='ignore').read())
            if m:
                vers = max(vers, int(m.group(1)))
    reemplazo = 'js/p5-effect.js?v=%d' % (vers + 1)
    n = 0
    for f in sorted(os.listdir(PUB)):
        if not f.endswith('.html'):
            continue
        p = os.path.join(PUB, f)
        s = io.open(p, encoding='utf-8', newline='').read()
        t = re.sub(r'js/p5-effect\.js\?v=\d+', reemplazo, s)
        if t != s:
            io.open(p, 'w', encoding='utf-8', newline='').write(t); n += 1
    print('  local:', reemplazo, 'en', n, 'páginas')
    subidas = 0
    for f in sorted(os.listdir(PUB)):
        if not f.endswith('.html'):
            continue
        try:
            live = urllib.request.urlopen('https://artedigitaldata.com/' + f + '?cb=' + str(abs(hash(f)) % 9999), timeout=25).read().decode('utf-8', 'ignore')
        except Exception:
            continue
        if 'p5-effect.js' not in live:
            continue
        nl = re.sub(r'js/p5-effect\.js\?v=\d+', reemplazo, live)
        if nl != live:
            tmp = os.path.join(PUB, f + '.tmpv')
            io.open(tmp, 'w', encoding='utf-8', newline='').write(nl)
            with open(tmp, 'rb') as fh:
                ftp.storbinary('STOR /artedigitaldata/' + f, fh)
            os.remove(tmp); subidas += 1
    print('  live:', reemplazo, 'en', subidas, 'páginas')

ftp.quit()
