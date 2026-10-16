"""Bumpea la versión de los assets compartidos en TODAS las páginas (local + FTP).
Sin esto el navegador sigue sirviendo el JS/CSS viejo de la caché.
Uso: python tools/versionar_assets.py [--v=10]
"""
import os, re, sys, ssl, ftplib, urllib.request

PUB = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public'
PROJ = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
BASE = 'https://artedigitaldata.com/'
forzar = None
for a in sys.argv[1:]:
    if a.startswith('--v='):
        forzar = a.split('=', 1)[1]

env = {}
with open(os.path.join(PROJ, '.env'), encoding='utf-8', errors='ignore') as f:
    for line in f:
        line = line.strip()
        if line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip()

paginas = [f for f in sorted(os.listdir(PUB)) if f.endswith('.html') and not f.startswith('_')]


def version_de(txt, archivo):
    m = re.search(re.escape(archivo) + r'\?v=(\d+)', txt)
    return int(m.group(1)) if m else 0


# versión de la capa de diseño (la más alta del repo)
actual = max([version_de(open(os.path.join(PUB, p), encoding='utf-8', errors='ignore').read(), 'fondo-ui.css') for p in paginas] + [0])
nueva = forzar or str(actual + 1)

# versiones de los JS compartidos
def bump_js(txt, archivo, agregar_si_falta=True):
    n = version_de(txt, archivo)
    if n:
        return re.sub(re.escape(archivo) + r'\?v=\d+', f'{archivo}?v={n + 1}', txt), True
    if agregar_si_falta and f'src="{archivo}"' in txt:
        return txt.replace(f'src="{archivo}"', f'src="{archivo}?v=2"'), True
    return txt, False


print(f'css: {actual} -> {nueva}')
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
ftp = ftplib.FTP_TLS(context=ctx); ftp.connect(env['FTP_HOST'], 21, timeout=120)
ftp.login(env['FTP_USER'], env['FTP_PASS']); ftp.prot_p(); ftp.voidcmd('TYPE I')

lp = os.path.join(PROJ, r'public\css\fondo-ui.css')
with open(lp, 'rb') as fh:
    ftp.storbinary('STOR /artedigitaldata/css/fondo-ui.css', fh)
print('SUBIDO css/fondo-ui.css', os.path.getsize(lp))

subidas = 0
for p in paginas:
    ruta = os.path.join(PUB, p)
    loc = open(ruta, encoding='utf-8', errors='ignore', newline='').read()
    if 'fondo-ui.css' not in loc:
        continue
    nuevo = re.sub(r'fondo-ui\.css\?v=\d+', 'fondo-ui.css?v=' + nueva, loc)
    if 'fondo-ui.css?v=' not in nuevo:
        nuevo = re.sub(r'(fondo-ui\.css)"', r'\1?v=' + nueva + '"', nuevo)
    nuevo, _ = bump_js(nuevo, 'js/header.js')
    nuevo, _ = bump_js(nuevo, 'js/index.js')
    nuevo, _ = bump_js(nuevo, 'js/recursos.js')
    if nuevo != loc:
        open(ruta, 'w', encoding='utf-8', newline='').write(nuevo)
    try:
        live = urllib.request.urlopen(BASE + p + '?cb=' + str(abs(hash(p)) % 9999), timeout=30).read().decode('utf-8', 'ignore')
    except Exception as e:
        print(f'  {p}: ERROR {str(e)[:40]}'); continue
    nl = re.sub(r'fondo-ui\.css\?v=\d+', 'fondo-ui.css?v=' + nueva, live)
    if 'fondo-ui.css?v=' not in nl:
        nl = re.sub(r'(fondo-ui\.css)"', r'\1?v=' + nueva + '"', nl)
    nl, _ = bump_js(nl, 'js/header.js')
    nl, _ = bump_js(nl, 'js/index.js')
    nl, _ = bump_js(nl, 'js/recursos.js')
    if nl != live:
        tmp = ruta + '.tmpa'
        open(tmp, 'w', encoding='utf-8', newline='').write(nl)
        with open(tmp, 'rb') as fh:
            ftp.storbinary('STOR /artedigitaldata/' + p, fh)
        os.remove(tmp)
        subidas += 1
ftp.quit()
print(f'páginas actualizadas en el FTP: {subidas}')
