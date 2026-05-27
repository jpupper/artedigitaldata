import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import Evento from '../models/Evento';
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
