#!/usr/bin/env python3
"""Suma el cache-busting ?v= a los <script>/<link> de los archivos que tocamos.

El navegador cachea js/header.js (no tenía versión) y servía el header viejo
aunque el archivo cambiara en el servidor. Uso: python3 tools/versionar-front.py
"""
import re
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
V = "4"
OBJETIVOS = ["js/header.js", "js/index.js", "js/external-data.js", "css/fsc-ui.css"]

total = 0
for html in sorted(PUB.glob("*.html")):
    txt = html.read_text(encoding="utf-8", newline="")
    orig = txt
    for obj in OBJETIVOS:
        # src/href="js/header.js"  →  + ?v=N   (si ya tiene ?v=, se reemplaza)
        pat = re.compile(r'(["\'])' + re.escape(obj) + r'(?:\?v=\d+)?(["\'])')
        txt = pat.sub(lambda m: f"{m.group(1)}{obj}?v={V}{m.group(2)}", txt)
    if txt != orig:
        html.write_text(txt, encoding="utf-8", newline="")
        total += 1

print(f"versionadas: {total} páginas (v={V})")
