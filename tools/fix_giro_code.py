"""En modo CODE el update forzaba rotAngle=0 en cada cuadro: eso anulaba el giro
de entrada. Ahora respeta el giro cuando la palabra lo pidió (spin)."""
import io

P = r'D:\Programacion\sistemasfullscreen\artedigitaldata\public\js\p5-effect.js'
s = io.open(P, encoding='utf-8', newline='').read()

viejo = """      if (this.formationMode === 'CODE') {
        // En modo CODE: la posición se mantiene 100% fija en el target, cero rotación
        this.pos.set(this.target);
        this.vel.set(0, 0);
        this.acc.set(0, 0);
        this.rotAngle = 0;"""

nuevo = """      if (this.formationMode === 'CODE') {
        // En modo CODE: la posición se mantiene 100% fija en el target.
        // Sin giro de entrada la letra va siempre derecha; con spin (flyer) se
        // conserva el ángulo y se endereza mientras se descifra.
        this.pos.set(this.target);
        this.vel.set(0, 0);
        this.acc.set(0, 0);
        if (!this.spinIn) this.rotAngle = 0;"""

if viejo in s:
    s = s.replace(viejo, nuevo, 1)
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
    print('✅ p5-effect.js: la rama CODE ya no aplasta el giro de entrada')
else:
    print('⚠️ no encontré el bloque de la rama CODE')
