import { Router, Response } from 'express';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import Evento from '../models/Evento';
import Oportunidad from '../models/Oportunidad';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hydrate } from '../utils/userHydration';

const router = Router();

// Helper para obtener modelo según tipo
function getModel(type: string) {
  switch (type) {
    case 'post':
    case 'posts':
    case 'obra':
    case 'obras':
      return { model: Post, authorField: 'author', feedType: 'post' };
    case 'recurso':
    case 'recursos':
      return { model: Recurso, authorField: 'author', feedType: 'recurso' };
    case 'evento':
    case 'eventos':
      return { model: Evento, authorField: 'creator', feedType: 'evento' };
    case 'oportunidad':
    case 'oportunidades':
      return { model: Oportunidad, authorField: 'creador', feedType: 'oportunidad' };
    default:
      return null;
  }
}

// =============================================
// LISTAR POSTEOS DESTACADOS / PINNED (todos los tipos)
// =============================================
router.get('/pinned/list', async (_req, res: Response) => {
  try {
    const [pinnedPosts, pinnedRecursos, pinnedEventos, pinnedOportunidades] = await Promise.all([
      Post.find({ pinned: true, visibility: 'public' }).sort({ createdAt: -1 }),
      Recurso.find({ pinned: true, visibility: 'public' }).sort({ createdAt: -1 }),
      Evento.find({ pinned: true, visibility: 'public' }).sort({ date: 1 }),
      Oportunidad.find({ pinned: true, activa: true, visibility: 'public' }).sort({ createdAt: -1 }),
    ]);

    const [hydratedPosts, hydratedRecursos, hydratedEventos, hydratedOportunidades] = await Promise.all([
      hydrate(pinnedPosts, 'author'),
      hydrate(pinnedRecursos, 'author'),
      hydrate(pinnedEventos, 'creator'),
      hydrate(pinnedOportunidades, 'creador'),
    ]);

    const allPinned = [
      ...hydratedPosts.map((p: any) => ({ ...p, feedType: 'post' })),
      ...hydratedRecursos.map((r: any) => ({ ...r, feedType: 'recurso' })),
      ...hydratedEventos.map((e: any) => ({ ...e, feedType: 'evento' })),
      ...hydratedOportunidades.map((o: any) => ({ ...o, feedType: 'oportunidad' })),
    ].sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

    return res.json(allPinned);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// PINEAR CUALQUIER POSTEO (admin)
// =============================================
router.post('/:type/:id/pin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'ADMINISTRADOR' || req.user!.username === 'jpupper';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden pinear posteos' });
    }

    const mapping = getModel(req.params.type);
    if (!mapping) return res.status(400).json({ error: 'Tipo de posteo inválido' });

    const item = await (mapping.model as any).findByIdAndUpdate(req.params.id, { pinned: true }, { new: true });
    if (!item) return res.status(404).json({ error: 'Posteo no encontrado' });

    return res.json({ message: 'Posteo pineado con éxito', item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// DESPINEAR CUALQUIER POSTEO (admin)
// =============================================
router.post('/:type/:id/unpin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'ADMINISTRADOR' || req.user!.username === 'jpupper';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden despinnar posteos' });
    }

    const mapping = getModel(req.params.type);
    if (!mapping) return res.status(400).json({ error: 'Tipo de posteo inválido' });

    const item = await (mapping.model as any).findByIdAndUpdate(req.params.id, { pinned: false }, { new: true });
    if (!item) return res.status(404).json({ error: 'Posteo no encontrado' });

    return res.json({ message: 'Posteo despineado con éxito', item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// TOGGLE LIKE UNIVERSAL (cualquier tipo)
// =============================================
router.post('/:type/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const mapping = getModel(req.params.type);
    if (!mapping) return res.status(400).json({ error: 'Tipo de posteo inválido' });

    const item = await (mapping.model as any).findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Posteo no encontrado' });

    const userId = req.user!.id as any;
    if (!item.likes) item.likes = [];

    const index = item.likes.findIndex((id: any) => id.toString() === userId.toString());
    if (index === -1) {
      item.likes.push(userId);
    } else {
      item.likes.splice(index, 1);
    }

    await item.save();
    return res.json({ likes: item.likes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
