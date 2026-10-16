"""Sube la versión (?v=N) de un asset en TODAS las páginas publicadas.
Uso: python tools/bump_asset_live.py css/fsc-ui.css 6
     python tools/bump_asset_live.py js/p5-effect.js 11
"""
import io, os, re, ssl, sys, ftplib, urllib.request

PROJ = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
PUB = os.path.join(PROJ, 'public')

if len(sys.argv) < 3:
    print(__doc__); sys.exit(1)
asset = sys.argv[1].replace('\\', '/')
if asset.startswith('public/'):
    asset = asset[len('public/'):]
nueva = sys.argv[2]

env = {}
for linea in io.open(os.path.join(PROJ, '.env'), encoding='utf-8', errors='ignore'):
    linea = linea.strip()
    if linea.startswith('#') or '=' not in linea:
        continue
    k, v = linea.split('=', 1)
    env[k.strip()] = v.strip()

patron = re.escape(asset) + r'\?v=\d+'
reemplazo = asset + '?v=' + nueva

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
ftp = ftplib.FTP_TLS(context=ctx); ftp.connect(env['FTP_HOST'], 21, timeout=180)
ftp.login(env['FTP_USER'], env['FTP_PASS']); ftp.prot_p(); ftp.voidcmd('TYPE I')

subidas = 0
for f in sorted(os.listdir(PUB)):
    if not f.endswith('.html'):
        continue
    try:
        live = urllib.request.urlopen('https://artedigitaldata.com/' + f + '?cb=' + str(abs(hash(f)) % 9999), timeout=25).read().decode('utf-8', 'ignore')
    except Exception:
        continue
    if asset not in live:
        continue
    nl = re.sub(patron, reemplazo, live)
    if nl != live:
        tmp = os.path.join(PUB, f + '.tmpv')
        io.open(tmp, 'w', encoding='utf-8', newline='').write(nl)
        with open(tmp, 'rb') as fh:
            ftp.storbinary('STOR /artedigitaldata/' + f, fh)
        os.remove(tmp); subidas += 1
print('live: %s -> %s en %d páginas' % (asset, reemplazo, subidas))
ftp.quit()
