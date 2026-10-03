#!/usr/bin/env python3
"""Aplica el sistema de diseño unificado (css/fsc-ui.css) a TODAS las páginas.

Qué hace, idempotente:
  1. <html lang="es"> → <html lang="es" data-theme="suave">  (la dirección de diseño)
  2. Agrega <link rel="stylesheet" href="css/fsc-ui.css"> DESPUÉS de css/tailwind.css
     (se carga último para poder remapear acentos sin pelear con las utilidades).
  3. Sube el ?v= de los JS tocados (external-data.js, index.js) para romper la caché.
  4. Marca el <body> con .ui-con-header SOLO si la página incluye js/header.js
     (el header es fijo y la página necesita aire; las full-bleed tipo outputeffect o
     particulas no llevan header y 64px arriba les rompería el canvas).
     El <body> se reconstruye con UN solo atributo class: fusionar es obligatorio,
     porque un segundo class= deja ganando al primero y la clase nueva no se aplica.

Uso: python3 tools/aplicar-diseno.py [--check]
"""
import re
import sys
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
CHECK = "--check" in sys.argv

LINK_UI = '<link rel="stylesheet" href="css/fsc-ui.css">'
LINK_TW = re.compile(r'(\s*)(<link\s+rel="stylesheet"\s+href="css/tailwind\.css"\s*>?)')
RE_HTML = re.compile(r'<html\b([^>]*)>', re.IGNORECASE)
RE_BODY = re.compile(r'<body\b([^>]*)>', re.IGNORECASE)
RE_CLASE = re.compile(r'\s*class="([^"]*)"')
RE_V = re.compile(r'(js/(?:external-data|index)\.js)\?v=(\d+)')
CLASE_HEADER = "ui-con-header"

cambios = []

for html in sorted(PUB.glob("*.html")):
    txt = html.read_text(encoding="utf-8", newline="")
    orig = txt

    # 1) dirección de diseño en <html>
    def _html(m):
        attrs = m.group(1)
        if "data-theme" in attrs:
            return m.group(0)
        return f'<html{attrs} data-theme="suave">'
    txt = RE_HTML.sub(_html, txt, count=1)

    # 2) fsc-ui.css después de tailwind.css (o antes de </head> si no hay tailwind)
    if "css/fsc-ui.css" not in txt:
        def _tw(m):
            return f'{m.group(1)}{m.group(2)}{m.group(1)}{LINK_UI}'
        txt, n = LINK_TW.subn(_tw, txt, count=1)
        if not n:
            txt = txt.replace("</head>", f'  {LINK_UI}\n</head>', 1)

    # 3) cache-busting de los JS cambiados
    txt = RE_V.sub(lambda m: f"{m.group(1)}?v={int(m.group(2)) + 1}", txt)

    # 4) clase del <body> (fusionando cualquier class= previo, incluso duplicado)
    con_header = "js/header.js" in txt

    def _body(m):
        attrs = m.group(1)
        clases = []
        for cm in RE_CLASE.finditer(attrs):
            for c in cm.group(1).split():
                if c and c not in clases:
                    clases.append(c)
        attrs_sin_clase = RE_CLASE.sub("", attrs).rstrip()
        clases = [c for c in clases if c != CLASE_HEADER]
        if con_header:
            clases.insert(0, CLASE_HEADER)
        sufijo = f' class="{" ".join(clases)}"' if clases else ""
        return f"<body{attrs_sin_clase}{sufijo}>"

    if RE_BODY.search(txt):
        txt = RE_BODY.sub(_body, txt, count=1)

    if txt != orig:
        cambios.append(html.name)
        if not CHECK:
            html.write_text(txt, encoding="utf-8", newline="")

print(f"{'REVISARÍA' if CHECK else 'ACTUALIZADAS'}: {len(cambios)} páginas")
for c in cambios:
    print("  -", c)
