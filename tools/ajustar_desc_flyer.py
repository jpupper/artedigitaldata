"""Acomoda la descripción de la escena de obra para que no choque con la foto
del artista (que va abajo a la izquierda)."""
import io

P = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public\js\paginas\flyer-1.js'
s = io.open(P, encoding='utf-8', newline='').read()

viejo = """      var grandeObra = window.innerWidth > 900;
      var desc = String(obra.descripcion || '').replace(/\\s+/g, ' ').trim();
      if (desc.length > 95) desc = desc.slice(0, 95).replace(/\\s\\S*$/, '') + '…';
      var lineasDesc = desc ? trocear(desc, 30).slice(0, 3) : [];
      var palabrasObra = [
        { texto: obra.titulo || 'Sin título', y: lineasDesc.length ? 0.38 : 0.5, size: grandeObra ? 52 : 30, max: 18 },
        { texto: (artista.nombre || '') + (artista.usuario ? '  ·  @' + artista.usuario : ''), y: lineasDesc.length ? 0.53 : 0.66, size: grandeObra ? 24 : 16, spacing: 8 },
      ].filter(function (w) { return w.texto; });
      lineasDesc.forEach(function (linea, i) {
        palabrasObra.push({
          texto: linea, y: 0.67 + i * 0.075, size: grandeObra ? 21 : 14,
          spacing: grandeObra ? 3 : 1, max: 30,
        });
      });"""

nuevo = """      var grandeObra = window.innerWidth > 900;
      // Descripción: un pedazo corto, repartido en pocas líneas y SIEMPRE por
      // encima de la foto del artista (que va abajo a la izquierda).
      var anchoLinea = grandeObra ? 30 : 34;
      var maxLineas = grandeObra ? 3 : 2;
      var ysDesc = grandeObra ? [0.66, 0.72, 0.78] : [0.60, 0.685];
      var maxLargo = anchoLinea * maxLineas;
      var desc = String(obra.descripcion || '').replace(/\\s+/g, ' ').trim();
      if (desc.length > maxLargo) desc = desc.slice(0, maxLargo).replace(/\\s\\S*$/, '') + '…';
      var lineasDesc = desc ? trocear(desc, anchoLinea).slice(0, maxLineas) : [];
      var palabrasObra = [
        { texto: obra.titulo || 'Sin título', y: lineasDesc.length ? (grandeObra ? 0.36 : 0.33) : 0.5, size: grandeObra ? 52 : 30, max: 18 },
        { texto: (artista.nombre || '') + (artista.usuario ? '  ·  @' + artista.usuario : ''), y: lineasDesc.length ? (grandeObra ? 0.5 : 0.47) : 0.66, size: grandeObra ? 24 : 16, spacing: 8 },
      ].filter(function (w) { return w.texto; });
      lineasDesc.forEach(function (linea, i) {
        palabrasObra.push({
          texto: linea, y: ysDesc[i] !== undefined ? ysDesc[i] : 0.72, size: grandeObra ? 21 : 14,
          spacing: grandeObra ? 3 : 1, max: anchoLinea,
        });
      });"""

if viejo in s:
    s = s.replace(viejo, nuevo, 1)
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
    print('✅ layout de la descripción ajustado')
else:
    print('⚠️ no encontré el bloque exacto — reviso por líneas')
