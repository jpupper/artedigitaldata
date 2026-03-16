import { Router, Request, Response } from 'express';
import Evento from '../models/Evento';
import { authMiddleware, AuthRequest } from '../middleware/auth';

import User from '../models/User';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const eventos = await Evento.find()
      .populate('creator', 'username avatar')
      .populate('participants', 'username avatar')
      .populate('comments.user', 'username avatar')
      .sort({ date: 1 });
    return res.json(eventos);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const evento = await Evento.findById(req.params.id)
      .populate('creator', 'username avatar')
      .populate('participants', 'username avatar')
      .populate('comments.user', 'username avatar');
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    return res.json(evento);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, location, imageUrl } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Título y fecha son obligatorios' });

    // Parse @usernames from description
    const participants: any[] = [];
    if (description) {
      const mentions = description.match(/@(\w+)/g);
      if (mentions) {
        const usernames = mentions.map((m: string) => m.substring(1));
        const foundUsers = await User.find({ username: { $in: usernames } }).select('_id');
        foundUsers.forEach(u => participants.push(u._id));
      }
    }

    const evento = await Evento.create({
      title,
      description,
      date,
      location,
      imageUrl,
      creator: req.user!.id,
      participants
    });
    return res.status(201).json(evento);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, location } = req.body;
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    if (evento.creator.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Re-parse participants if description changed
    if (description !== undefined) {
      const participants: any[] = [];
      const mentions = description.match(/@(\w+)/g);
      if (mentions) {
        const usernames = mentions.map((m: string) => m.substring(1));
        const foundUsers = await User.find({ username: { $in: usernames } }).select('_id');
        foundUsers.forEach(u => participants.push(u._id));
      }
      evento.participants = participants;
      evento.description = description;
    }

    if (title) evento.title = title;
    if (date) evento.date = date;
    if (location !== undefined) evento.location = location;

    await evento.save();
    return res.json(evento);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const userId = req.user!.id;
    const idx = (evento.likes || []).findIndex((id) => id.toString() === userId);
    if (idx === -1) {
      if (!evento.likes) evento.likes = [];
      evento.likes.push(userId as any);
    } else {
      evento.likes.splice(idx, 1);
    }
    await evento.save();
    return res.json(evento);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    evento.comments.push({ user: req.user!.id as any, text, createdAt: new Date() });
    await evento.save();
    const populated = await evento.populate('comments.user', 'username avatar');
    return res.json(populated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    if (evento.creator.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await evento.deleteOne();
    return res.json({ message: 'Evento eliminado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
