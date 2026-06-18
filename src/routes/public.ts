import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import Evento from '../models/Evento';
import User from '../models/User';
import { hydrate } from '../utils/userHydration';

const router = Router();

/**
 * API Pública de Arte Digital Data
 * Endpoints sin autenticación para consultar contenido,
 * ideales para scrapers, bots, integraciones externas.
 * Todas bajo /api/public
 */

// GET /public/posts — últimos posts (no concurso)
router.get('/posts', async (_req: Request, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = Math.min(parseInt(_req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isContest: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const hydrated = await hydrate(posts);
    const total = await Post.countDocuments({ isContest: { $ne: true } });

    return res.json({
      data: hydrated,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /public/recursos — últimos recursos
router.get('/recursos', async (_req: Request, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = Math.min(parseInt(_req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const recursos = await Recurso.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const hydrated = await hydrate(recursos);
    const total = await Recurso.countDocuments();

    return res.json({
      data: hydrated,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /public/eventos — próximos eventos
router.get('/eventos', async (_req: Request, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = Math.min(parseInt(_req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const eventos = await Evento.find()
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    const hydrated = await hydrate(eventos, 'creator');
    const total = await Evento.countDocuments();

    return res.json({
      data: hydrated,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /public/artistas — artistas indexados (bio + avatar + al menos una obra/recurso/evento)
router.get('/artistas', async (_req: Request, res: Response) => {
  try {
    // 1. Encontrar usuarios con bio y avatar
    const users = await User.find({
      bio: { $ne: '', $exists: true },
      avatar: { $ne: '', $exists: true }
    }).select('username displayName avatar bio socials createdAt');

    if (!users.length) return res.json({ data: [] });

    const userIds = users.map(u => u._id);

    // 2. Encontrar qué usuarios tienen al menos una obra, recurso o evento
    const [postsAuthors, recursosAuthors, eventosCreators] = await Promise.all([
      Post.distinct('author', { author: { $in: userIds } }),
      Recurso.distinct('author', { author: { $in: userIds } }),
      Evento.distinct('creator', { creator: { $in: userIds } }),
    ]);

    // 3. Intersectar — usuarios con al menos UNA obra O recurso O evento
    const activeIds = new Set<string>();
    [...postsAuthors, ...recursosAuthors, ...eventosCreators].forEach(id => activeIds.add(id.toString()));

    // 4. Obtener conteos por usuario
    const [postCounts, recursoCounts, eventoCounts] = await Promise.all([
      Post.aggregate([
        { $match: { author: { $in: userIds } } },
        { $group: { _id: '$author', count: { $sum: 1 } } }
      ]),
      Recurso.aggregate([
        { $match: { author: { $in: userIds } } },
        { $group: { _id: '$author', count: { $sum: 1 } } }
      ]),
      Evento.aggregate([
        { $match: { creator: { $in: userIds } } },
        { $group: { _id: '$creator', count: { $sum: 1 } } }
      ])
    ]);

    const countMap: Record<string, { posts: number; recursos: number; eventos: number }> = {};
    postCounts.forEach((g: any) => {
      const id = g._id.toString();
      if (!countMap[id]) countMap[id] = { posts: 0, recursos: 0, eventos: 0 };
      countMap[id].posts = g.count;
    });
    recursoCounts.forEach((g: any) => {
      const id = g._id.toString();
      if (!countMap[id]) countMap[id] = { posts: 0, recursos: 0, eventos: 0 };
      countMap[id].recursos = g.count;
    });
    eventoCounts.forEach((g: any) => {
      const id = g._id.toString();
      if (!countMap[id]) countMap[id] = { posts: 0, recursos: 0, eventos: 0 };
      countMap[id].eventos = g.count;
    });

    // 5. Armar respuesta
    const artistas = users
      .filter(u => activeIds.has(u._id.toString()))
      .map(u => {
        const counts = countMap[u._id.toString()] || { posts: 0, recursos: 0, eventos: 0 };
        return {
          _id: u._id,
          username: u.username,
          displayName: u.displayName || u.username,
          avatar: u.avatar,
          bio: u.bio,
          socials: u.socials,
          createdAt: u.createdAt,
          counts,
          totalContributions: counts.posts + counts.recursos + counts.eventos,
        };
      })
      .sort((a, b) => b.totalContributions - a.totalContributions); // Más activos primero

    return res.json({ data: artistas });
  } catch (err: any) {
    console.error('[Artistas] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /public/stats — estadísticas generales
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [posts, recursos, eventos, contestEntries] = await Promise.all([
      Post.countDocuments(),
      Recurso.countDocuments(),
      Evento.countDocuments(),
      Post.countDocuments({ isContest: true }),
    ]);

    return res.json({
      totalPosts: posts,
      totalRecursos: recursos,
      totalEventos: eventos,
      totalContestEntries: contestEntries,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /public/contest — concursos (con páginación por mes)
router.get('/contest', async (_req: Request, res: Response) => {
  try {
    const month = (_req.query.month as string) || '';
    const page = parseInt(_req.query.page as string) || 1;
    const limit = Math.min(parseInt(_req.query.limit as string) || 50, 200);
    const skip = (page - 1) * limit;

    const filter: any = { isContest: true };
    if (month) filter.contestMonth = month;

    const entries = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const hydrated = await hydrate(entries);
    const total = await Post.countDocuments(filter);

    // También devolver los meses disponibles
    const months = await Post.distinct('contestMonth', {
      isContest: true,
      contestMonth: { $ne: '' }
    });

    return res.json({
      data: hydrated,
      months: months.sort().reverse(),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
