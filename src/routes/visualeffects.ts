import { Router, Request, Response } from 'express';
import VisualEffect from '../models/VisualEffect';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/visualeffects/default-front - Obtener el efecto predeterminado fijado para el front
router.get('/default-front', async (req: Request, res: Response) => {
  try {
    const defaultEffect = await VisualEffect.findOne({ isDefaultFront: true });
    return res.json(defaultEffect || null);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/visualeffects/my - Obtener todos los efectos guardados del usuario logueado
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const effects = await VisualEffect.find({ author: req.user!.id }).sort({ createdAt: -1 });
    return res.json(effects);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/visualeffects/:id - Obtener un efecto por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const effect = await VisualEffect.findById(req.params.id).populate('author', 'username displayName avatar');
    if (!effect) {
      return res.status(404).json({ error: 'Efecto visual no encontrado' });
    }
    return res.json(effect);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/visualeffects - Guardar un nuevo efecto visual
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, flyerWords, timelineLayers, timelineDuration, hasTimeline, config } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    const effect = await VisualEffect.create({
      title: title.trim(),
      author: req.user!.id,
      flyerWords: flyerWords || [],
      timelineLayers: timelineLayers || [],
      timelineDuration: timelineDuration !== undefined ? Number(timelineDuration) : 10.0,
      hasTimeline: hasTimeline !== undefined ? Boolean(hasTimeline) : false,
      config: config || {},
    });

    return res.status(201).json({ message: 'Efecto visual guardado exitosamente', effect });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/visualeffects/:id - Actualizar un efecto visual existente
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, flyerWords, timelineLayers, timelineDuration, hasTimeline, config } = req.body;
    const effect = await VisualEffect.findById(req.params.id);
    if (!effect) {
      return res.status(404).json({ error: 'Efecto visual no encontrado' });
    }

    if (String(effect.author) !== req.user!.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este efecto visual' });
    }

    if (title && typeof title === 'string') effect.title = title.trim();
    if (flyerWords !== undefined) effect.flyerWords = flyerWords;
    if (timelineLayers !== undefined) effect.timelineLayers = timelineLayers;
    if (timelineDuration !== undefined) effect.timelineDuration = Number(timelineDuration);
    if (hasTimeline !== undefined) effect.hasTimeline = Boolean(hasTimeline);
    if (config !== undefined) effect.config = config;

    await effect.save();
    return res.json({ message: 'Efecto visual actualizado', effect });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/visualeffects/:id - Eliminar un efecto visual
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const effect = await VisualEffect.findById(req.params.id);
    if (!effect) {
      return res.status(404).json({ error: 'Efecto visual no encontrado' });
    }

    if (String(effect.author) !== req.user!.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este efecto visual' });
    }

    await VisualEffect.deleteOne({ _id: req.params.id });
    return res.json({ message: 'Efecto visual eliminado exitosamente' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/visualeffects/:id/set-default - Fijar / desfijar como efecto por defecto en el front (SOLO ADMIN)
router.post('/:id/set-default', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    const isAdmin = user && (user.role === 'ADMIN' || user.permissions?.artedigital?.role === 'ADMINISTRADOR');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden fijar el efecto del front' });
    }

    const effect = await VisualEffect.findById(req.params.id);
    if (!effect) {
      return res.status(404).json({ error: 'Efecto visual no encontrado' });
    }

    const willBeDefault = !effect.isDefaultFront;
    if (willBeDefault) {
      await VisualEffect.updateMany({}, { $set: { isDefaultFront: false } });
    }

    effect.isDefaultFront = willBeDefault;
    await effect.save();

    return res.json({
      message: willBeDefault ? 'Secuencia fijada como predeterminada en el front' : 'Secuencia desfijada del front',
      isDefaultFront: willBeDefault,
      effect
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
