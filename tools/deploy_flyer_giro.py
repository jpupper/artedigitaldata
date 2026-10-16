"""Sube p5-effect.js + flyer-1.js y bumpea p5-effect.js?v=4 en las páginas."""
import io, os, re, ssl, ftplib, urllib.request

PROJ = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
PUB = os.path.join(PROJ, 'public')
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

# ── versión nueva = la más alta que aparezca en las páginas + 1 ────────────
vers = 1
for f in os.listdir(PUB):
    if f.endswith('.html'):
        m = re.search(r'js/p5-effect\.js\?v=(\d+)', io.open(os.path.join(PUB, f), encoding='utf-8', errors='ignore').read())
        if m:
            vers = max(vers, int(m.group(1)))
REEMPLAZO = 'js/p5-effect.js?v=%d' % (vers + 1)

def subir(rel):
    lp = os.path.join(PUB, rel.replace('/', os.sep))
    ftp.storbinary('STOR /artedigitaldata/' + rel, open(lp, 'rb'))
    print('  OK', rel, os.path.getsize(lp), '->', ftp.size('/artedigitaldata/' + rel))

for rel in ['js/p5-effect.js', 'js/paginas/flyer-1.js']:
    subir(rel)

# bump de versión en local
n = 0
for f in sorted(os.listdir(PUB)):
    if not f.endswith('.html'):
        continue
    p = os.path.join(PUB, f)
    s = io.open(p, encoding='utf-8', newline='').read()
    t = re.sub(r'js/p5-effect\.js\?v=\d+', REEMPLAZO, s)
    if t != s:
        io.open(p, 'w', encoding='utf-8', newline='').write(t); n += 1
print('local:', REEMPLAZO, 'en', n, 'páginas')

# bump en las páginas publicadas
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
    nl = re.sub(r'js/p5-effect\.js\?v=\d+', REEMPLAZO, live)
    if nl != live:
        tmp = os.path.join(PUB, f + '.tmpv')
        io.open(tmp, 'w', encoding='utf-8', newline='').write(nl)
        with open(tmp, 'rb') as fh:
            ftp.storbinary('STOR /artedigitaldata/' + f, fh)
        os.remove(tmp); subidas += 1
print('live:', REEMPLAZO, 'en', subidas, 'páginas')
ftp.quit()
