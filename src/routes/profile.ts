import { Router, Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:username', async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const posts = await Post.find({ author: user._id })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });

    return res.json({ user, posts });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bio, avatar, displayName } = req.body;
    const update: any = {};
    if (bio !== undefined) update.bio = bio;
    if (avatar !== undefined) update.avatar = avatar;
    if (displayName !== undefined) update.displayName = displayName;

    const user = await User.findByIdAndUpdate(req.user!.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
