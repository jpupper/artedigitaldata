import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ recipient: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(notifications);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user!.id, read: false });
    return res.json({ count });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/mark-all-read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ recipient: req.user!.id, read: false }, { read: true });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user!.id },
      { read: true }
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
