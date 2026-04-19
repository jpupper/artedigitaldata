import { Router, Request, Response } from 'express';
import Recurso from '../models/Recurso';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hydrate, hydrateComments } from '../utils/userHydration';
import Notification from '../models/Notification';
import User from '../models/User';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const recursos = await Recurso.find().sort({ createdAt: -1 });
    const final = await hydrate(recursos);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const recurso = await Recurso.findById(req.params.id);
    if (!recurso) return res.status(404).json({ error: 'Recurso no encontrado' });
    
    const hydrated = await hydrate([recurso]);
    const final = await hydrateComments(hydrated[0]);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type, url, tags, imageUrl, youtube_video } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'Título y URL son obligatorios' });

    const recurso = await Recurso.create({
      title,
      description,
      type: type || 'other',
      url,
      imageUrl: imageUrl || '',
      youtube_video: youtube_video || '',
      author: req.user!.id,
      tags: tags || [],
    });
    const [final] = await hydrate([recurso]);
    return res.status(201).json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    const recurso = await Recurso.findById(req.params.id);
    if (!recurso) return res.status(404).json({ error: 'Recurso no encontrado' });

    recurso.comments.push({ user: req.user!.id as any, text, createdAt: new Date() });
    await recurso.save();
    const final = await hydrateComments(recurso);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type, url, tags, imageUrl, youtube_video } = req.body;
    const recurso = await Recurso.findById(req.params.id);
    if (!recurso) return res.status(404).json({ error: 'Recurso no encontrado' });

    if (recurso.author.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (title) recurso.title = title;
    if (description !== undefined) recurso.description = description;
    if (type) recurso.type = type;
    if (url) recurso.url = url;
    if (tags !== undefined) recurso.tags = tags;
    if (imageUrl !== undefined) recurso.imageUrl = imageUrl;
    if (youtube_video !== undefined) recurso.youtube_video = youtube_video;

    await recurso.save();
    return res.json(recurso);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const recurso = await Recurso.findById(req.params.id);
    if (!recurso) return res.status(404).json({ error: 'Recurso no encontrado' });

    const userId = req.user!.id;
    const idx = (recurso.likes || []).findIndex((id: any) => id.toString() === userId);
    let isAdding = false;
    if (idx === -1) {
      if (!recurso.likes) recurso.likes = [];
      recurso.likes.push(userId as any);
      isAdding = true;
    } else {
      recurso.likes.splice(idx, 1);
    }
    await recurso.save();

    if (isAdding && recurso.author.toString() !== userId) {
      const actor = await User.findById(userId).select('username displayName avatar');
      Notification.create({
        recipient: recurso.author,
        type: 'like_recurso',
        actor: userId,
        actorName: actor?.displayName || actor?.username || '',
        actorAvatar: actor?.avatar || '',
        resourceId: recurso._id.toString(),
        resourceTitle: recurso.title,
        resourceType: 'recurso',
      }).catch(() => {});
    }

    return res.json(recurso);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const recurso = await Recurso.findById(req.params.id);
    if (!recurso) return res.status(404).json({ error: 'Recurso no encontrado' });
    if (recurso.author.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await recurso.deleteOne();
    return res.json({ message: 'Recurso eliminado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/comment/:commentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const recurso = await Recurso.findById(req.params.id);
    if (!recurso) return res.status(404).json({ error: 'Recurso no encontrado' });

    const comment = (recurso.comments as any).id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

    if (comment.user.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    (recurso.comments as any).pull(req.params.commentId);
    await recurso.save();
    
    const final = await hydrateComments(recurso);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
