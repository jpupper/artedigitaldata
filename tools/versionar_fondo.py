"""PROPAGAR UN CAMBIO DE DISEÑO A TODO EL SITIO (local + FTP publicado).

Todo el diseño vive en `public/css/fondo-ui.css` (se carga ÚLTIMO en cada
página). Para que un cambio tuyo se vea en todas las secciones alcanza con:

    python tools/versionar_fondo.py            # sube el CSS y bumpea ?v=N en todas las páginas
    python tools/versionar_fondo.py --v=12     # fija una versión concreta

Qué hace:
  1) sube `css/fondo-ui.css` al FTP
  2) recorre todos los HTML (local y publicado) y cambia `fondo-ui.css?v=N`
     por la versión nueva → cache-busting: ningún navegador sirve la vieja
  3) sube al FTP sólo las páginas a las que hubo que cambiarle la versión
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

# versión actual (la más alta que aparezca en las páginas locales)
actual = 0
for p in paginas:
    for m in re.finditer(r'fondo-ui\.css\?v=(\d+)', open(os.path.join(PUB, p), encoding='utf-8', errors='ignore').read()):
        actual = max(actual, int(m.group(1)))
nueva = forzar or str(actual + 1)
print(f'versión {"fijada" if forzar else "actual"}: {actual} → {nueva}')

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
ftp = ftplib.FTP_TLS(context=ctx); ftp.connect(env['FTP_HOST'], 21, timeout=120)
ftp.login(env['FTP_USER'], env['FTP_PASS']); ftp.prot_p(); ftp.voidcmd('TYPE I')

lp = os.path.join(PROJ, r'public\css\fondo-ui.css')
with open(lp, 'rb') as fh:
    ftp.storbinary('STOR /artedigitaldata/css/fondo-ui.css', fh)
print('SUBIDO css/fondo-ui.css', os.path.getsize(lp), '->', ftp.size('/artedigitaldata/css/fondo-ui.css'))

subidas = 0
for p in paginas:
    ruta = os.path.join(PUB, p)
    loc = open(ruta, encoding='utf-8', errors='ignore', newline='').read()
    if 'fondo-ui.css' not in loc:
        continue
    nuevo, n = re.subn(r'fondo-ui\.css\?v=\d+', 'fondo-ui.css?v=' + nueva, loc)
    if not n:
        nuevo, n = re.subn(r'(fondo-ui\.css)"', r'\1?v=' + nueva + '"', loc)
    if n and nuevo != loc:
        open(ruta, 'w', encoding='utf-8', newline='').write(nuevo)
    # live: misma operación sobre el archivo publicado
    try:
        live = urllib.request.urlopen(BASE + p + '?cb=' + str(abs(hash(p)) % 9999), timeout=30).read().decode('utf-8', 'ignore')
    except Exception as e:
        print(f'  {p}: ERROR live {str(e)[:40]}')
        continue
    nl, m = re.subn(r'fondo-ui\.css\?v=\d+', 'fondo-ui.css?v=' + nueva, live)
    if not m:
        nl, m = re.subn(r'(fondo-ui\.css)"', r'\1?v=' + nueva + '"', live)
    if m and nl != live:
        tmp = ruta + '.tmpv'
        open(tmp, 'w', encoding='utf-8', newline='').write(nl)
        with open(tmp, 'rb') as fh:
            ftp.storbinary('STOR /artedigitaldata/' + p, fh)
        os.remove(tmp)
        subidas += 1
ftp.quit()
print(f'páginas actualizadas en el FTP: {subidas}')
print(f'LISTO. Si tocaste css/fondo-ui.css, ya está en todas las secciones (v={nueva}).')
