"""Bump de ?v= de un asset en las páginas publicadas (una sola conexión FTP, en paralelo).

Uso: python tools/bump_asset_rapido.py js/auth.js 6 [--dry]
Progreso en tools/bump_asset_rapido.log
"""
import io, os, re, ssl, sys, time, ftplib, urllib.request
from concurrent.futures import ThreadPoolExecutor

PROJ = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
PUB = os.path.join(PROJ, 'public')
LOG = os.path.join(PROJ, 'tools', 'bump_asset_rapido.log')
asset = (sys.argv[1] if len(sys.argv) > 1 else 'js/auth.js').replace('\\', '/')
nueva = sys.argv[2] if len(sys.argv) > 2 else '6'
dry = '--dry' in sys.argv
patron = re.escape(asset) + r'\?v=\d+'
reemplazo = asset + '?v=' + nueva

log = io.open(LOG, 'w', encoding='utf-8', buffering=1)
def out(*a):
    linea = ' '.join(str(x) for x in a)
    print(linea, flush=True); log.write(linea + '\n')

env = {}
for linea in io.open(os.path.join(PROJ, '.env'), encoding='utf-8', errors='ignore'):
    linea = linea.strip()
    if linea.startswith('#') or '=' not in linea:
        continue
    k, v = linea.split('=', 1)
    env[k.strip()] = v.strip()

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

locales = []
for f in sorted(os.listdir(PUB)):
    if not f.endswith('.html'):
        continue
    try:
        if asset in io.open(os.path.join(PUB, f), encoding='utf-8', errors='ignore').read():
            locales.append(f)
    except Exception:
        pass
out('páginas locales con %s: %d' % (asset, len(locales)))

def bajar(f):
    try:
        url = 'https://artedigitaldata.com/' + f + '?cb=' + str(abs(hash(f)) % 9999)
        return f, urllib.request.urlopen(url, timeout=25).read().decode('utf-8', 'ignore')
    except Exception:
        return f, None

t0 = time.time()
with ThreadPoolExecutor(max_workers=8) as ex:
    vivos = dict(ex.map(bajar, locales))
out('descargadas en %.1fs (%d con contenido)' % (time.time() - t0, sum(1 for v in vivos.values() if v)))

if dry:
    for f in locales:
        vivo = vivos.get(f)
        if vivo:
            m = re.search(patron, vivo)
            out('  %-30s live=%s' % (f, m.group(0) if m else 'sin ?v='))
    sys.exit(0)

ftp = ftplib.FTP_TLS(context=ctx)
ftp.connect(env['FTP_HOST'], 21, timeout=120)
ftp.login(env['FTP_USER'], env['FTP_PASS']); ftp.prot_p(); ftp.voidcmd('TYPE I')
out('conectado al FTP')

tocados = 0
for f in locales:
    vivo = vivos.get(f)
    if not vivo or asset not in vivo:
        out('  - %s (sin contenido vivo)' % f); continue
    nl = re.sub(patron, reemplazo, vivo)
    if nl != vivo:
        tmp = os.path.join(PUB, f + '.tmpv')
        io.open(tmp, 'w', encoding='utf-8', newline='').write(nl)
        try:
            with open(tmp, 'rb') as fh:
                ftp.storbinary('STOR /artedigitaldata/' + f, fh)
            tocados += 1
            out('  ↑ %s' % f)
        except Exception as e:
            out('  ✗ %s -> %r' % (f, e))
        finally:
            try: os.remove(tmp)
            except Exception: pass
    p = os.path.join(PUB, f)
    s = io.open(p, encoding='utf-8', newline='').read()
    t = re.sub(patron, reemplazo, s)
    if t != s:
        io.open(p, 'w', encoding='utf-8', newline='').write(t)
try:
    ftp.quit()
except Exception:
    pass
out('LISTO: %d páginas subidas con %s' % (tocados, reemplazo))
