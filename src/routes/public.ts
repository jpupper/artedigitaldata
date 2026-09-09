import { Router, Request, Response } from 'express';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import Evento from '../models/Evento';
import User from '../models/User';
import { hydrate } from '../utils/userHydration';
import { getBotConfig, setBotConfig } from '../models/BotConfig';
import { authMiddleware, adminMiddleware, AuthRequest, optionalAuth } from '../middleware/auth';
import ParticleWord from '../models/ParticleWord';

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

// GET /public/particles-config — Obtener configuración de partículas de p5
router.get('/particles-config', async (_req: Request, res: Response) => {
  try {
    const config = await getBotConfig('particles_p5_config', null);
    return res.json({ config });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /public/particles-config — Guardar configuración de partículas de p5
router.post('/particles-config', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Configuración inválida' });
    }

    // Verificar autorización por Bearer token
    const token = req.headers.authorization?.split(' ')[1];
    let authorized = false;

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET;
        if (secret) {
          const decoded: any = jwt.verify(token, secret);
          if (
            decoded.username === 'jpupper' ||
            decoded.role === 'ADMIN' ||
            decoded.role === 'ADMINISTRADOR'
          ) {
            authorized = true;
          } else {
            // Verificar en DB
            const user = await User.findById(decoded.id);
            if (
              user?.username === 'jpupper' ||
              user?.role === 'ADMIN' ||
              user?.permissions?.artedigital?.role === 'ADMINISTRADOR'
            ) {
              authorized = true;
            }
          }
        }
      } catch (tokenErr) {
        console.warn('[Particles Config] Token verification failed:', tokenErr);
      }
    }

    // Si no está autenticado como admin
    if (!authorized) {
      return res.status(403).json({ error: 'Se requiere cuenta de Administrador para guardar globalmente' });
    }

    await setBotConfig('particles_p5_config', config);
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper de inicialización de palabras de partículas
async function seedInitialWordsIfNeeded() {
  try {
    // Eliminar palabras anónimas previas para asegurar que solo usuarios registrados aparezcan
    await ParticleWord.deleteMany({
      $or: [
        { 'addedBy.username': 'Anónimo' },
        { 'addedBy.username': { $exists: false } },
        { addedBy: null }
      ]
    }).catch(() => {});

    const count = await ParticleWord.countDocuments();
    if (count === 0) {
      const config = await getBotConfig('particles_p5_config', null);
      const words = config && Array.isArray(config.WORDS) ? config.WORDS : [];
      if (words.length > 0) {
        const docs = words.map((w: string) => ({
          word: w.trim().toUpperCase(),
          addedBy: {
            username: 'jpupper',
            displayName: 'jpupper (Admin)',
            avatar: '',
          }
        }));
        await ParticleWord.insertMany(docs, { ordered: false }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[ParticleWord] Seeding error:', err);
  }
}

// GET /public/particles-words — Listado de palabras agrupadas por contribuidor
router.get('/particles-words', async (_req: Request, res: Response) => {
  try {
    await seedInitialWordsIfNeeded();
    const allWords = await ParticleWord.find().sort({ createdAt: -1 });

    const byUserMap: Record<string, {
      username: string;
      displayName: string;
      avatar: string;
      words: string[];
      count: number;
      lastAdded: Date;
    }> = {};

    for (const doc of allWords) {
      const uname = doc.addedBy?.username || '';
      if (!uname || uname === 'Anónimo') continue; // Solo usuarios registrados

      if (!byUserMap[uname]) {
        byUserMap[uname] = {
          username: uname,
          displayName: doc.addedBy?.displayName || uname,
          avatar: doc.addedBy?.avatar || '',
          words: [],
          count: 0,
          lastAdded: doc.createdAt,
        };
      }
      if (!byUserMap[uname].words.includes(doc.word)) {
        byUserMap[uname].words.push(doc.word);
        byUserMap[uname].count++;
      }
    }

    const byUser = Object.values(byUserMap).sort((a, b) => {
      return b.count - a.count;
    });

    const recent = allWords
      .filter(w => w.addedBy?.username && w.addedBy.username !== 'Anónimo')
      .slice(0, 40)
      .map(w => ({
        word: w.word,
        username: w.addedBy?.username || '',
        displayName: w.addedBy?.displayName || w.addedBy?.username || '',
        avatar: w.addedBy?.avatar || '',
        createdAt: w.createdAt,
      }));

    return res.json({
      totalWords: allWords.filter(w => w.addedBy?.username && w.addedBy.username !== 'Anónimo').length,
      totalContributors: byUser.length,
      byUser,
      recent
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /public/particles-words — Agregar palabras (SOLO USUARIOS REGISTRADOS, con guardado automático)
router.post('/particles-words', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Debes iniciar sesión para agregar palabras a la comunidad' });
    }

    const rawInput = req.body.words || req.body.word;
    if (!rawInput) {
      return res.status(400).json({ error: 'No se enviaron palabras' });
    }

    let rawList: string[] = [];
    if (typeof rawInput === 'string') {
      rawList = rawInput.split(',');
    } else if (Array.isArray(rawInput)) {
      for (const item of rawInput) {
        if (typeof item === 'string') {
          rawList.push(...item.split(','));
        }
      }
    }

    // Limpiar y normalizar palabras
    const cleaned = rawList
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 0 && w.length <= 120);

    const uniqueWords = Array.from(new Set(cleaned));
    if (!uniqueWords.length) {
      return res.status(400).json({ error: 'Lista de palabras vacía o inválida' });
    }

    // Identificar usuario contribuidor (OBLIGATORIO REGISTRADO)
    let username = req.user.username;
    let displayName = username;
    let avatar = '';
    const userId = req.user.id;

    try {
      const u = await User.findById(req.user.id);
      if (u) {
        username = u.username || username;
        displayName = u.displayName || u.username || username;
        avatar = u.avatar || '';
      }
    } catch (uErr) {
      console.warn('[ParticleWord] User lookup error:', uErr);
    }

    // Cargar config actual de partículas
    const config = await getBotConfig('particles_p5_config', {});
    if (!Array.isArray(config.WORDS)) {
      config.WORDS = [];
    }

    const addedWords: string[] = [];

    for (const w of uniqueWords) {
      try {
        await ParticleWord.findOneAndUpdate(
          { word: w },
          {
            $setOnInsert: {
              word: w,
              addedBy: {
                userId,
                username,
                displayName,
                avatar,
              }
            }
          },
          { upsert: true, new: true }
        );
      } catch (saveErr) {
        console.warn('[ParticleWord] Save error for word:', w, saveErr);
      }

      if (!config.WORDS.includes(w)) {
        config.WORDS.push(w);
        addedWords.push(w);
      }
    }

    // Persistir configuración global en BotConfig si hay nuevas palabras
    if (addedWords.length > 0) {
      await setBotConfig('particles_p5_config', config);
    }

    return res.json({
      success: true,
      added: addedWords,
      totalAdded: addedWords.length,
      totalWords: config.WORDS.length,
      contributor: { username, displayName }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /public/particles-words/:word — Eliminar palabra (SOLO ADMIN)
router.delete('/particles-words/:word', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const rawWord = req.params.word;
    if (!rawWord) {
      return res.status(400).json({ error: 'Palabra no especificada' });
    }
    const wordToDelete = decodeURIComponent(rawWord).trim().toUpperCase();

    // Eliminar de colección ParticleWord
    await ParticleWord.deleteOne({ word: wordToDelete });

    // Eliminar de config general
    const config = await getBotConfig('particles_p5_config', {});
    if (Array.isArray(config.WORDS)) {
      config.WORDS = config.WORDS.filter((w: string) => w !== wordToDelete);
      await setBotConfig('particles_p5_config', config);
    }

    return res.json({
      success: true,
      deletedWord: wordToDelete,
      remainingWords: config.WORDS?.length || 0
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
