"""Corrige las dobles barras que quedaron en los regex de flyer-1.js.
(El heredoc de la shell duplicó las barras invertidas.)"""
import io, os

P = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public\js\paginas\flyer-1.js'
s = io.open(P, encoding='utf-8', newline='').read()

malo = '\\\\'          # dos barras en el archivo
bueno = '\\'           # una barra
antes = s.count(malo)
if antes:
    s = s.replace(malo, bueno)
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('barras dobles corregidas:', antes)

# chequeo
s2 = io.open(P, encoding='utf-8', newline='').read()
for linea in s2.split('\n'):
    if 'var desc = String(obra.descripcion' in linea or 'if (desc.length > 95)' in linea:
        print(repr(linea.strip()[:110]))
