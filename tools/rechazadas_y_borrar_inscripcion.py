"""1) Las obras RECHAZADAS no salen más en la galería ni en el flyer
   (el flyer usa el mismo endpoint público de la galería).
2) La planilla tiene botón para BORRAR la inscripción de una obra
   (solo quien gestiona la convocatoria; lo valida el backend).
"""
import io

PROJ = r'D:\Programacion\sistemasfullscreen\artedigitaldata'
PUB = PROJ + r'\public'
cambios = []

# ── 1) galería: excluir rechazadas ──────────────────────────────────────────
P = PROJ + r'\src\routes\public.ts'
s = io.open(P, encoding='utf-8', newline='').read()
viejo = """    const inscripciones: any[] = await Inscripcion.find({ oportunidad: opo._id })"""
nuevo = """    // OJO: las obras RECHAZADAS por el curador no se muestran (ni en la galería
    // pública ni en el flyer, que consume este mismo endpoint).
    const inscripciones: any[] = await Inscripcion.find({
      oportunidad: opo._id,
      estado: { $ne: 'rechazada' },
    })"""
if viejo in s and "$ne: 'rechazada'" not in s:
    s = s.replace(viejo, nuevo, 1)
    io.open(P, 'w', encoding='utf-8', newline='').write(s)
    cambios.append('public.ts: la galería ya no muestra obras rechazadas')

# ── 2) backend: borrar una inscripción ──────────────────────────────────────
P2 = PROJ + r'\src\routes\oportunidades.ts'
r = io.open(P2, encoding='utf-8', newline='').read()
if "inscripciones/:inscripcionId', authMiddleware, async (req: AuthRequest, res: Response) => {\n  try {\n    const oportunidad = await Oportunidad.findById(req.params.id);\n    if (!oportunidad) {\n      return res.status(404).json({ error: 'Oportunidad no encontrada' });\n    }\n\n    if (\n      oportunidad.creador.toString() !== req.user!.id &&\n      req.user!.role !== 'ADMINISTRADOR' &&\n      req.user!.role !== 'ADMIN'\n    ) {\n      return res.status(403).json({ error: 'No autorizado' });\n    }\n\n    const inscripcion = await Inscripcion.findById(req.params.inscripcionId);\n    if (!inscripcion) {\n      return res.status(404).json({ error: 'Inscripción no encontrada' });\n    }\n\n    await inscripcion.deleteOne();" not in r:
    ancla = """router.get('/:id/inscripciones', authMiddleware, async (req: AuthRequest, res: Response) => {"""
    nueva = """// ─────────────────────────────────────────────────────────────────────────────
// DELETE /:id/inscripciones/:inscripcionId — borra la inscripción de una obra
// de la convocatoria (solo el creador o un admin).
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id/inscripciones/:inscripcionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    if (
      oportunidad.creador.toString() !== req.user!.id &&
      req.user!.role !== 'ADMINISTRADOR' &&
      req.user!.role !== 'ADMIN'
    ) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const inscripcion = await Inscripcion.findById(req.params.inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }
    if (inscripcion.oportunidad && inscripcion.oportunidad.toString() !== oportunidad._id.toString()) {
      return res.status(400).json({ error: 'Esa inscripción no es de esta convocatoria' });
    }

    await inscripcion.deleteOne();
    return res.json({ message: 'Inscripción eliminada', ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/inscripciones', authMiddleware, async (req: AuthRequest, res: Response) => {"""
    if ancla in r:
        r = r.replace(ancla, nueva, 1)
        io.open(P2, 'w', encoding='utf-8', newline='').write(r)
        cambios.append('oportunidades.ts: ruta DELETE de inscripción')

# ── 3) planilla: botón borrar ───────────────────────────────────────────────
P3 = PUB + r'\js\paginas\planilla-1.js'
f = io.open(P3, encoding='utf-8', newline='').read()
viejo3 = """          ${e !== 'pendiente'
            ? `<button type="button" class="pl-btn pl-btn--reset" onclick="setEstado('${insc._id}', 'pendiente')" title="Volver a pendiente"><i class="fas fa-rotate-left"></i></button>`
            : ''}
        </div>`;"""
nuevo3 = """          ${e !== 'pendiente'
            ? `<button type="button" class="pl-btn pl-btn--reset" onclick="setEstado('${insc._id}', 'pendiente')" title="Volver a pendiente"><i class="fas fa-rotate-left"></i></button>`
            : ''}
          <button type="button" class="pl-btn pl-btn--borrar" onclick="borrarInscripcion('${insc._id}', '${String((insc.datos && (insc.datos.obraTitulo || insc.datos.nombre)) || (insc.obra && insc.obra.title) || '').replace(/'/g, "\\\\'")}')" title="Borrar la inscripción de esta obra">
            <i class="fas fa-trash"></i> Borrar
          </button>
        </div>`;"""
if viejo3 in f and 'borrarInscripcion' not in f:
    f = f.replace(viejo3, nuevo3, 1); cambios.append('planilla-1.js: botón Borrar en cada fila')

if 'window.borrarInscripcion' not in f and 'borrarInscripcion' in f:
    f += """

    /* Borrar la inscripción de una obra en esta convocatoria (creador o admin) */
    window.borrarInscripcion = async function (inscripcionId, titulo) {
      const nombre = titulo ? ('"' + titulo + '"') : 'esta obra';
      if (!confirm('¿Borrar la inscripción de ' + nombre + '? Se saca de la planilla y del flyer/galería.')) return;
      try {
        const res = await apiRequest(`/oportunidades/${oportunidadId}/inscripciones/${inscripcionId}`, { method: 'DELETE' });
        if (res && res.ok) {
          await cargarPlanilla();
        } else {
          alert('No se pudo borrar la inscripción (¿tenés permiso?).');
        }
      } catch (e) {
        alert('Error al borrar: ' + e.message);
      }
    };
"""
    cambios.append('planilla-1.js: función borrarInscripcion')

if cambios:
    io.open(P3, 'w', encoding='utf-8', newline='').write(f)

print('\n'.join('· ' + c for c in cambios) if cambios else '· sin cambios')
