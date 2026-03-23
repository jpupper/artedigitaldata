import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hydrate, hydrateComments } from '../utils/userHydration';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    const hydratedPosts = await hydrate(posts);
    return res.json(hydratedPosts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });
    
    let hydrated = await hydrate([post]);
    let final = await hydrateComments(hydrated[0]);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, youtube_video, tags } = req.body;
    const post = await Post.create({
      author: req.user!.id,
      title,
      description,
      imageUrl,
      youtube_video: youtube_video || '',
      tags: tags || [],
    });
    const [populated] = await hydrate([post]);
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
    const idx = post.likes.findIndex((id: any) => id.toString() === userId);
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
    
    const final = await hydrateComments(post);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, tags, imageUrl, youtube_video } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });

    if (post.author.toString() !== req.user!.id && req.user!.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (title) post.title = title;
    if (description !== undefined) post.description = description;
    if (tags) post.tags = tags;
    if (imageUrl) post.imageUrl = imageUrl;
    if (youtube_video !== undefined) post.youtube_video = youtube_video;

    await post.save();
    return res.json(post);
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
