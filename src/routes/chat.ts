import { Router, Request, Response } from 'express';
import ChatRoom from '../models/ChatRoom';
import Message from '../models/Message';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hydrate } from '../utils/userHydration';

const router = Router();

router.get('/rooms', async (_req: Request, res: Response) => {
  try {
    const rooms = await ChatRoom.find({ isPrivate: { $ne: true } })
      .sort({ createdAt: -1 });
    const hydrated = await hydrate(rooms, 'creator');
    return res.json(hydrated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/private', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await ChatRoom.find({
      isPrivate: true,
      participants: req.user!.id
    })
    .sort({ updatedAt: -1 });
    const hydrated = await hydrate(rooms, 'participants');
    return res.json(hydrated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/private', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) return res.status(400).json({ error: 'ID de destinatario obligatorio' });

    // Check if room already exists
    let room = await ChatRoom.findOne({
      isPrivate: true,
      participants: { $all: [req.user!.id, recipientId] }
    });

    if (!room) {
      room = await ChatRoom.create({
        name: 'Private Chat',
        isPrivate: true,
        creator: req.user!.id,
        participants: [req.user!.id, recipientId]
      });
    }

    const hydrated = await hydrate([room], 'participants');
    return res.json(hydrated[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/users/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user!.id }
    })
    .select('username avatar')
    .limit(10);

    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/users/all', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({})
      .select('username avatar displayName bio')
      .sort({ username: 1 });
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/rooms', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre de la sala es obligatorio' });

    const room = await ChatRoom.create({
      name,
      description,
      creator: req.user!.id,
      participants: [req.user!.id],
    });
    return res.status(201).json(room);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/rooms/:roomId/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    if (room.isPrivate && !room.participants.includes(req.user!.id as any)) {
      return res.status(403).json({ error: 'No tienes permiso para ver estos mensajes' });
    }

    const messages = await Message.find({ room: req.params.roomId })
      .sort({ createdAt: 1 })
      .limit(100);
    const hydrated = await hydrate(messages, 'sender');
    return res.json(hydrated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
