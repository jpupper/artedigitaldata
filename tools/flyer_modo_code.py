"""1) flyer: las palabras entran en modo CODE (se descifran y se acomodan).
2) p5-effect: permite que las letras también giren en modo CODE cuando se pide
   el giro de entrada (spin)."""
import io

# ── 1) flyer-1.js: modo CODE ───────────────────────────────────────────────
P1 = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public\js\paginas\flyer-1.js'
s = io.open(P1, encoding='utf-8', newline='').read()
if "w.modo || 'FISICS'" in s:
    s = s.replace("w.modo || 'FISICS'", "w.modo || 'CODE'", 1)
    io.open(P1, 'w', encoding='utf-8', newline='').write(s)
    print('✅ flyer-1.js: las palabras entran en modo CODE')
elif "w.modo || 'CODE'" in s:
    print('· flyer-1.js ya estaba en CODE')
else:
    print('⚠️ no encontré el formationMode del flyer')

# ── 2) p5-effect.js: giro también en CODE ─────────────────────────────────
P2 = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public\js\p5-effect.js'
e = io.open(P2, encoding='utf-8', newline='').read()
cambios = []

# 2a) al dibujar: rotar también en CODE si la letra pidió giro de entrada
viejo = """      if (this.formationMode !== 'CODE' && this.rotAngle && Math.abs(this.rotAngle) > 0.001) {
        rotate(this.rotAngle);
      }"""
nuevo = """      if ((this.formationMode !== 'CODE' || this.spinIn) && this.rotAngle && Math.abs(this.rotAngle) > 0.001) {
        rotate(this.rotAngle);
      }"""
if viejo in e:
    e = e.replace(viejo, nuevo, 1); cambios.append('display: el giro también aplica en CODE')

# 2b) en el update de CODE: el giro se endereza a medida que la letra se descifra
viejo2 = """        if (this.decodeStep < this.maxDecodeSteps) {
          this.decodeStep++;"""
nuevo2 = """        // giro de entrada: mientras se descifra va enderezándose (opt-in con spin)
        if (this.spinIn && this.rotAngle) {
          this.rotAngle *= this.isFormed ? 0.80 : 0.975;
          if (Math.abs(this.rotAngle) < 0.008) this.rotAngle = 0;
        }

        if (this.decodeStep < this.maxDecodeSteps) {
          this.decodeStep++;"""
if viejo2 in e:
    e = e.replace(viejo2, nuevo2, 1); cambios.append('update CODE: el giro se acomoda al descifrarse')

if cambios:
    io.open(P2, 'w', encoding='utf-8', newline='').write(e)
    print('✅ p5-effect.js:', cambios)
else:
    print('⚠️ p5-effect.js sin cambios')
