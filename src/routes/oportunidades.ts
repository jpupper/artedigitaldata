import { Router, Request, Response } from 'express';
import { Oportunidad, Inscripcion } from '../models/Oportunidad';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { hydrate } from '../utils/userHydration';

const router = Router();

// =============================================
// LISTAR OPORTUNIDADES (público)
// =============================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: any = { activa: true };
    if (req.query.tipo) filter.tipo = req.query.tipo;
    
    const oportunidades = await Oportunidad.find(filter)
      .sort({ createdAt: -1 });
    const final = await hydrate(oportunidades, 'creador');
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// OBTENER UNA OPORTUNIDAD (público)
// =============================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }
    
    const [hydrated] = await hydrate([oportunidad], 'creador');
    return res.json(hydrated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// CREAR OPORTUNIDAD (requiere auth)
// =============================================
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      tipo,
      titulo,
      descripcion,
      basesCondiciones,
      lugarExposicion,
      fechaDesde,
      fechaHasta,
      imagenUrl,
      parametrosPresentacion,
      nombrePuesto,
      productoraEmpresa,
      nombreProyecto,
      colaboracionPedida,
      tags,
    } = req.body;

    if (!tipo || !titulo) {
      return res.status(400).json({ error: 'Tipo y título son obligatorios' });
    }

    if (!['convocatoria_obra', 'oportunidad_laboral', 'colaboracion'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de oportunidad inválido' });
    }

    const oportunidad = await Oportunidad.create({
      tipo,
      titulo,
      descripcion: descripcion || '',
      creador: req.user!.id,
      basesCondiciones: basesCondiciones || '',
      lugarExposicion: lugarExposicion || '',
      fechaDesde: fechaDesde || null,
      fechaHasta: fechaHasta || null,
      imagenUrl: imagenUrl || '',
      parametrosPresentacion: parametrosPresentacion || [],
      nombrePuesto: nombrePuesto || '',
      productoraEmpresa: productoraEmpresa || '',
      nombreProyecto: nombreProyecto || '',
      colaboracionPedida: colaboracionPedida || '',
      tags: tags || [],
    });

    const [final] = await hydrate([oportunidad], 'creador');
    return res.status(201).json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// ACTUALIZAR OPORTUNIDAD (creador o admin)
// =============================================
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    const updatableFields = [
      'titulo', 'descripcion', 'basesCondiciones', 'lugarExposicion',
      'fechaDesde', 'fechaHasta', 'imagenUrl', 'parametrosPresentacion',
      'nombrePuesto', 'productoraEmpresa', 'nombreProyecto',
      'colaboracionPedida', 'activa', 'tags'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        (oportunidad as any)[field] = req.body[field];
      }
    });

    await oportunidad.save();
    const [final] = await hydrate([oportunidad], 'creador');
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// ELIMINAR OPORTUNIDAD (creador o admin)
// =============================================
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    // Eliminar inscripciones asociadas
    await Inscripcion.deleteMany({ oportunidad: oportunidad._id });
    await oportunidad.deleteOne();
    
    return res.json({ message: 'Oportunidad eliminada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// INSCRIBIRSE A UNA OPORTUNIDAD (requiere auth)
// =============================================
router.post('/:id/inscripcion', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    if (!oportunidad.activa) {
      return res.status(400).json({ error: 'Esta oportunidad ya no está activa' });
    }

    // Verificar si ya está inscrito
    const existing = await Inscripcion.findOne({
      usuario: req.user!.id,
      oportunidad: oportunidad._id,
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya estás inscrito en esta oportunidad' });
    }

    const inscripcion = await Inscripcion.create({
      usuario: req.user!.id,
      oportunidad: oportunidad._id,
      datos: req.body.datos || {},
      mensaje: req.body.mensaje || '',
      estado: 'pendiente',
    });

    // Agregar inscripción a la oportunidad
    oportunidad.inscripciones.push(inscripcion._id as any);
    await oportunidad.save();

    return res.status(201).json(inscripcion);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// OBTENER INSCRIPCIONES DE UNA OPORTUNIDAD (creador o admin)
// =============================================
router.get('/:id/inscripciones', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    const inscripciones = await Inscripcion.find({ oportunidad: oportunidad._id })
      .sort({ createdAt: -1 });

    // Hydrate usuario data
    const userIds = inscripciones.map(i => i.usuario);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id username email displayName avatar bio socials');
    
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const final = inscripciones.map(insc => {
      const obj: any = insc.toObject();
      obj.usuario = userMap.get(insc.usuario.toString()) || insc.usuario;
      return obj;
    });

    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// ACTUALIZAR ESTADO DE INSCRIPCIÓN (creador o admin)
// =============================================
router.patch('/:id/inscripciones/:inscripcionId', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    if (req.body.estado) {
      inscripcion.estado = req.body.estado;
    }
    if (req.body.respuesta !== undefined) {
      inscripcion.datos = { ...inscripcion.datos, respuesta: req.body.respuesta };
    }

    await inscripcion.save();

    // Hydrate usuario
    const user = await User.findById(inscripcion.usuario)
      .select('_id username email displayName avatar bio socials');
    const obj: any = inscripcion.toObject();
    obj.usuario = user || inscripcion.usuario;

    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// MIS INSCRIPCIONES (usuario autenticado)
// =============================================
router.get('/mis-inscripciones/listar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const inscripciones = await Inscripcion.find({ usuario: req.user!.id })
      .sort({ createdAt: -1 });

    const opoIds = inscripciones.map(i => i.oportunidad);
    const oportunidades = await Oportunidad.find({ _id: { $in: opoIds } });
    const opoMap = new Map(oportunidades.map(o => [o._id.toString(), o]));

    const final = inscripciones.map(insc => {
      const obj: any = insc.toObject();
      obj.oportunidad = opoMap.get(insc.oportunidad.toString()) || insc.oportunidad;
      return obj;
    });

    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// MIS OPORTUNIDADES CREADAS (usuario autenticado)
// =============================================
router.get('/mis-oportunidades/listar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidades = await Oportunidad.find({ creador: req.user!.id })
      .sort({ createdAt: -1 });
    const final = await hydrate(oportunidades, 'creador');
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
