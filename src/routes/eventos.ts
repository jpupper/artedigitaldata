import { Router, Request, Response } from 'express';
import Evento from '../models/Evento';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { hydrate, hydrateComments } from '../utils/userHydration';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const eventos = await Evento.find().sort({ date: 1 });
    const final = await hydrate(eventos, 'creator');
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    
    const [hydrated] = await hydrate([evento], 'creator participants');
    
    // Ensure ticketConfig is always returned (for old events without this field)
    if (!hydrated.ticketConfig) {
      hydrated.ticketConfig = {
        enabled: false,
        price: 0,
        paymentLink: '',
        successMessage: '',
        maxTickets: 100,
        isContribution: false
      };
    }
    
    const final = await hydrateComments(hydrated);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, location, imageUrl, youtube_video, ticketConfig } = req.body;
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
      youtube_video: youtube_video || '',
      creator: req.user!.id,
      participants,
      ticketConfig: ticketConfig || { enabled: false }
    });
    const [final] = await hydrate([evento], 'creator');
    return res.status(201).json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, location, imageUrl, youtube_video, ticketConfig } = req.body;
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    if (evento.creator.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR' && req.user!.role !== 'ADMIN') {
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
    if (imageUrl !== undefined) evento.imageUrl = imageUrl;
    if (youtube_video !== undefined) evento.youtube_video = youtube_video;
    if (ticketConfig !== undefined) evento.ticketConfig = ticketConfig;

    await evento.save();
    
    // Ensure ticketConfig is always returned in response
    const response = evento.toObject();
    if (!response.ticketConfig) {
      response.ticketConfig = {
        enabled: false,
        price: 0,
        paymentLink: '',
        successMessage: '',
        maxTickets: 100,
        isContribution: false
      };
    }
    
    return res.json(response);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const userId = req.user!.id;
    const idx = (evento.likes || []).findIndex((id: any) => id.toString() === userId);
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
    const final = await hydrateComments(evento);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
    if (evento.creator.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await evento.deleteOne();
    return res.json({ message: 'Evento eliminado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
