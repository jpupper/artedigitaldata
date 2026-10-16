#!/usr/bin/env python3
"""artedigitaldata: la capa de diseño (css/fondo-ui.css = "los cuadrados") y el
fondo animado del JP Shader Editor en TODAS las páginas.

Receta (la del skill, tomada de index.html que ya la tiene):
  1. <link rel="stylesheet" href="css/fondo-ui.css?v=14">   (último CSS: gana en el cascade)
  2. <script>window.FSC_NO_ASCII_BG = true;</script>        (antes de js/p5-effect.js)
  3. <script src=".../jpshadereditor/include.js" data-page="artedigitaldata"
              data-comp="artedigital-ascii" data-pass="ascii1" data-keep-bg="1"></script>
  4. BORRAR los <script src="js/ascii-shader-bg.js"> (canvas viejo en z-index 0 TAPA
     el nuevo en z-index -1: "el fondo no se ve").

Uso: python tools/fondo_en_todas.py [--dry] [--solo-pagina x.html]
"""
import io, os, re, ssl, sys, ftplib, urllib.request, json

APP = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
PUB = os.path.join(APP, 'public')
DRY = '--dry' in sys.argv
SOLO = None
if '--solo-pagina' in sys.argv:
    SOLO = sys.argv[sys.argv.index('--solo-pagina') + 1]

CSS_V = '14'
LINK = '<link rel="stylesheet" href="css/fondo-ui.css?v=%s">' % CSS_V
FLAG = '<script>window.FSC_NO_ASCII_BG = true; /* que p5-effect.js no vuelva a inyectar el fondo viejo */</script>'
INCLUDE = ('<script src="https://vps-4455523-x.dattaweb.com/jpshadereditor/include.js"\n'
           '          data-page="artedigitaldata" data-comp="artedigital-ascii" data-pass="ascii1"\n'
           '          data-keep-bg="1"></script>')
COMENT = ('  <!-- CAPA FONDO: cajas cuadradas + UI de vidrio fina sobre el fondo animado del\n'
          '       JP Shader Editor (misma receta que index.html/galeria.html/404.html) -->')

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
env = {}
for l in io.open(os.path.join(APP, '.env'), encoding='utf-8', errors='ignore'):
    l = l.strip()
    if l.startswith('#') or '=' not in l: continue
    k, v = l.split('=', 1); env[k.strip()] = v.strip()


def traer(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=30, context=ctx).read().decode('utf-8', 'ignore')


def parchear(h, nombre):
    """Devuelve (html_nuevo, cambios[]) sin tocar nada más."""
    cambios = []
    nl = '\r\n' if '\r\n' in h[:4000] else '\n'

    # 4) sacar el canvas viejo (solo tags reales, no comentarios)
    nuevo = re.sub(r'[ \t]*<script[^>]*src="[^"]*ascii-shader-bg\.js[^"]*"[^>]*>\s*</script>\s*\n?', '', h)
    if nuevo != h:
        cambios.append('saca ascii-shader-bg')
        h = nuevo

    # 1) el CSS: después del último <link rel="stylesheet"> del head
    if 'fondo-ui.css' not in h:
        head_fin = h.find('</head>')
        ultimo = h.rfind('<link rel="stylesheet"', 0, head_fin if head_fin > 0 else len(h))
        if ultimo == -1:
            return h, cambios + ['NO encontré dónde poner el CSS']
        fin_linea = h.find('>', ultimo) + 1
        ins = nl + COMENT + nl + '  ' + LINK
        h = h[:fin_linea] + ins + h[fin_linea:]
        cambios.append('+css')

    # 2 y 3) el flag antes de p5-effect y el include después
    if 'include.js' not in h:
        p5 = h.find('<script src="js/p5-effect.js')
        if p5 == -1:
            # sin p5: el include va antes de </body>
            pos = h.rfind('</body>')
            if pos == -1:
                return h, cambios + ['NO encontré dónde poner el include']
            h = h[:pos] + '  ' + INCLUDE + nl + h[pos:]
            cambios.append('+include(sin p5)')
        else:
            fin_p5 = h.find('</script>', p5) + len('</script>')
            ins = nl + '  ' + INCLUDE
            h = h[:fin_p5] + ins + h[fin_p5:]
            cambios.append('+include')
            if 'FSC_NO_ASCII_BG' not in h:
                linea_p5 = h.rfind('\n', 0, p5) + 1
                h = h[:linea_p5] + '  ' + FLAG + nl + h[linea_p5:]
                cambios.append('+flag')
    return h, cambios


paginas = sorted(f for f in os.listdir(PUB) if f.endswith('.html'))
if SOLO:
    paginas = [SOLO] if SOLO in paginas else []
print('páginas a revisar:', len(paginas), '| dry:', DRY)

if not DRY:
    ftp = ftplib.FTP_TLS(context=ctx); ftp.connect(env['FTP_HOST'], 21, timeout=180)
    ftp.login(env['FTP_USER'], env['FTP_PASS']); ftp.prot_p(); ftp.voidcmd('TYPE I')
else:
    ftp = None

resumen = {}
for p in paginas:
    local = os.path.join(PUB, p)
    if not os.path.exists(local):
        continue
    # se parchea lo PUBLICADO (el skill avisa que repo y FTP divergen)
    try:
        publicado = traer('https://artedigitaldata.com/' + p)
    except Exception as e:
        print('%-26s ERROR al bajar: %s' % (p, str(e)[:50])); continue
    if 'fondo-ui.css' in publicado and 'include.js' in publicado:
        resumen[p] = 'ya estaba'
        continue
    nuevo, cambios = parchear(publicado, p)
    if not cambios or all(c.startswith('NO') for c in cambios):
        resumen[p] = 'sin cambios (%s)' % ','.join(cambios)
        continue
    if not DRY:
        ftp.storbinary('STOR /artedigitaldata/' + p, io.BytesIO(nuevo.encode('utf-8')))
        # y el archivo del repo, con el mismo parche
        try:
            local_html = io.open(local, encoding='utf-8', errors='ignore', newline='').read()
            l2, _ = parchear(local_html, p)
            io.open(local, 'w', encoding='utf-8', newline='').write(l2)
        except Exception as e:
            print('  (repo local no actualizado: %s)' % str(e)[:50])
    resumen[p] = ','.join(cambios)
    print('%-26s %s' % (p, ','.join(cambios)))

if ftp:
    ftp.quit()
hechos = [k for k, v in resumen.items() if v not in ('ya estaba',) and not v.startswith('sin cambios')]
print('\nPÁGINAS PARCHEADAS: %d' % len(hechos))
print('ya estaban: %d' % len([v for v in resumen.values() if v == 'ya estaba']))
print('sin cambios: %s' % [k for k, v in resumen.items() if v.startswith('sin cambios')])
