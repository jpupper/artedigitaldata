import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username avatar')
      .populate('comments.user', 'username avatar')
      .sort({ createdAt: -1 });
    return res.json(posts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username avatar')
      .populate('comments.user', 'username avatar');
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });
    return res.json(post);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, tags } = req.body;
    const post = await Post.create({
      author: req.user!.id,
      title,
      description,
      imageUrl,
      tags: tags || [],
    });
    const populated = await post.populate('author', 'username avatar');
    return res.status(201).json(populated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });

    const userId = req.user!.id;
    const idx = post.likes.findIndex((id) => id.toString() === userId);
    if (idx === -1) {
      post.likes.push(userId as any);
    } else {
      post.likes.splice(idx, 1);
    }
    await post.save();
    return res.json(post);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });

    post.comments.push({ user: req.user!.id as any, text, createdAt: new Date() });
    await post.save();
    const populated = await post.populate('comments.user', 'username avatar');
    return res.json(populated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });
    if (post.author.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    await post.deleteOne();
    return res.json({ message: 'Post eliminado' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
