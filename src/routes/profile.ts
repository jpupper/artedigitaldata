import { Router, Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import Evento from '../models/Evento';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:username', async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Favorites (items liked by this user)
    const likedPosts = await Post.find({ likes: user._id })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });
    
    const likedRecursos = await Recurso.find({ likes: user._id })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });

    const likedEventos = await Evento.find({ likes: user._id })
      .populate('creator', 'username avatar')
      .sort({ date: 1 });

    const posts = await Post.find({ author: user._id })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });

    const recursos = await Recurso.find({ author: user._id })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });

    const eventos = await Evento.find({ 
      $or: [
        { creator: user._id },
        { participants: user._id }
      ]
    }).sort({ date: 1 });

    return res.json({ 
      user, 
      posts, 
      recursos, 
      eventos, 
      favorites: {
        posts: likedPosts,
        recursos: likedRecursos,
        eventos: likedEventos
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bio, avatar, displayName, socials } = req.body;
    const update: any = {};
    if (bio !== undefined) update.bio = bio;
    if (avatar !== undefined) update.avatar = avatar;
    if (displayName !== undefined) update.displayName = displayName;
    if (socials !== undefined) update.socials = socials;

    const user = await User.findByIdAndUpdate(req.user!.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
