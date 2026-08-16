import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import Evento from '../models/Evento';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hydrate } from '../utils/userHydration';

const router = Router();

router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bio, avatar, displayName, socials } = req.body;
    console.log(`[Profile Update] Updating user ${req.user!.id}`, { bio, avatar, displayName, socials });
    
    const update: any = {};
    if (bio !== undefined) update.bio = bio;
    if (avatar !== undefined) update.avatar = avatar;
    if (displayName !== undefined) update.displayName = displayName;
    if (socials !== undefined) update.socials = socials;

    const user = await User.findByIdAndUpdate(req.user!.id, update, { new: true }).select('-password');
    if (!user) {
        console.warn(`[Profile Update] User not found in DB: ${req.user!.id}`);
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.json(user);
  } catch (err: any) {
    console.error(`[Profile Update Error]`, err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:username', async (req: Request, res: Response) => {
  try {
    // El username NO es único entre apps (la DB users es global: fullscreen_global).
    // Un mismo username puede existir con origin distintos (pizarraia, jpshadeditor,
    // fscauth, artedigitaldata...). findOne solo devuelve el primero y puede apuntar
    // a la cuenta vacía de OTRA app. Por eso elegimos el match correcto de esta app.
    const matches = await User.find({ username: req.params.username }).select('-password');
    if (!matches.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Si el pedido viene autenticado y coincide con uno de los candidatos, ese gana.
    const authHeader = req.headers['authorization'];
    let sesionId: string | null = null;
    if (authHeader) {
      try {
        const secret = process.env.JWT_SECRET;
        if (secret) {
          const decoded: any = jwt.verify(authHeader.replace('Bearer ', ''), secret);
          sesionId = String(decoded.id || decoded.userId || '');
        }
      } catch { /* token inválido → tratar como invitado */ }
    }

    const puntajes = matches.map(u => {
      const o = u.toObject() as any;
      let score = 0;
      if (sesionId && String(u._id) === sesionId) score += 100;      // es el propio usuario logueado
      if (['artedigitaldata', 'fscauth'].includes(o.origin)) score += 10; // pertenece a este ecosistema
      if (o.permissions?.artedigital) score += 5;
      if (o.displayName || o.bio || o.avatar) score += 3;            // tiene perfil completo
      return { user: u, score, o };
    }).sort((a, b) => b.score - a.score);

    const ganador = puntajes[0];
    let user = ganador.user;
    let userObj = ganador.o;

    const isOwnerRequest = !!sesionId && sesionId === String(user._id);
    if (!isOwnerRequest) delete userObj.email;

    // Favorites (items liked by this user)
    const likedPosts = await Post.find({ likes: user._id }).sort({ createdAt: -1 });
    const likedRecursos = await Recurso.find({ likes: user._id }).sort({ createdAt: -1 });
    const likedEventos = await Evento.find({ likes: user._id }).sort({ date: 1 });

    const posts = await Post.find({ author: user._id }).sort({ createdAt: -1 });
    const recursos = await Recurso.find({ author: user._id }).sort({ createdAt: -1 });
    const eventos = await Evento.find({ 
      $or: [
        { creator: user._id },
        { participants: user._id }
      ]
    }).sort({ date: 1 });

    const doorEvents = await Evento.find({ doorUsers: user._id }).sort({ date: 1 });

    return res.json({ 
      user: userObj, 
      posts: await hydrate(posts), 
      recursos: await hydrate(recursos), 
      eventos: await hydrate(eventos, 'creator'),
      doorEvents: await hydrate(doorEvents, 'creator'),
      favorites: {
        posts: await hydrate(likedPosts),
        recursos: await hydrate(likedRecursos),
        eventos: await hydrate(likedEventos, 'creator')
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
