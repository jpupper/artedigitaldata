import { Router, Request, Response } from 'express';
import Recurso from '../models/Recurso';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const recursos = await Recurso.find()
      .populate('author', 'username avatar')
      .populate('comments.user', 'username avatar')
      .sort({ createdAt: -1 });
    return res.json(recursos);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const recurso = await Recurso.findById(req.params.id)
      .populate('author', 'username avatar')
      .populate('comments.user', 'username avatar');
    if (!recurso) return res.status(404).json({ error: 'Recurso no encontrado' });
    return res.json(recurso);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type, url, tags } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'Título y URL son obligatorios' });

    const recurso = await Recurso.create({
      title,
      description,
      type: type || 'other',
      url,
      author: req.user!.id,
      tags: tags || [],
    });
    return res.status(201).json(recurso);
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
    const populated = await recurso.populate('comments.user', 'username avatar');
    return res.json(populated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const recurso = await Recurso.findById(req.params.id);
    if (!recurso) return res.status(404).json({ error: 'Recurso no encontrado' });
    if (recurso.author.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await recurso.deleteOne();
    return res.json({ message: 'Recurso eliminado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
