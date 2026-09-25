import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import Evento from '../models/Evento';
import Oportunidad from '../models/Oportunidad';
import VisualEffect from '../models/VisualEffect';
import Ticket from '../models/Ticket';
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
    const rawUsername = (req.params.username || '').trim();
    const escaped = rawUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}$`, 'i');

    const queryConditions: any[] = [
      { username: regex },
      { displayName: regex }
    ];
    if (/^[0-9a-fA-F]{24}$/.test(rawUsername)) {
      queryConditions.push({ _id: rawUsername });
    }

    const matches = await User.find({ $or: queryConditions }).select('-password');
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

    const allUserIds = matches.map(u => u._id);

    // Favorites (items liked by this user)
    const likedPosts = await Post.find({ likes: { $in: allUserIds } }).sort({ createdAt: -1 });
    const likedRecursos = await Recurso.find({ likes: { $in: allUserIds } }).sort({ createdAt: -1 });
    const likedEventos = await Evento.find({ likes: { $in: allUserIds } }).sort({ date: 1 });
    const likedOportunidades = await Oportunidad.find({ likes: { $in: allUserIds } }).sort({ createdAt: -1 });

    const posts = await Post.find({ author: { $in: allUserIds } }).sort({ createdAt: -1 });
    const recursos = await Recurso.find({ author: { $in: allUserIds } }).sort({ createdAt: -1 });
    const eventos = await Evento.find({ 
      $or: [
        { creator: { $in: allUserIds } },
        { participants: { $in: allUserIds } }
      ]
    }).sort({ date: 1 });
    const oportunidades = await Oportunidad.find({ creador: { $in: allUserIds } }).sort({ createdAt: -1 });
    const visualeffects = await VisualEffect.find({ author: { $in: allUserIds } }).sort({ createdAt: -1 });

    const doorEvents = await Evento.find({ doorUsers: { $in: allUserIds } }).sort({ date: 1 });

    return res.json({ 
      user: userObj, 
      posts: await hydrate(posts), 
      recursos: await hydrate(recursos), 
      eventos: await hydrate(eventos, 'creator'),
      oportunidades: await hydrate(oportunidades, 'creador'),
      visualeffects: visualeffects || [],
      doorEvents: await hydrate(doorEvents, 'creator'),
      favorites: {
        posts: await hydrate(likedPosts),
        recursos: await hydrate(likedRecursos),
        eventos: await hydrate(likedEventos, 'creator'),
        oportunidades: await hydrate(likedOportunidades, 'creador')
      }
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Exportación de Datos Personales (Portabilidad GDPR - Art. 20)
router.get('/me/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const posts = await Post.find({ author: userId });
    const recursos = await Recurso.find({ author: userId });
    const eventos = await Evento.find({ creator: userId });
    const oportunidades = await Oportunidad.find({ creador: userId });
    const visualeffects = await VisualEffect.find({ author: userId });
    const tickets = await Ticket.find({ user: userId });

    const exportData = {
      exportMetadata: {
        application: 'Arte Digital Data',
        exportDate: new Date().toISOString(),
        gdprArticle: 'Article 20 - Right to data portability'
      },
      userProfile: user.toObject(),
      posts: posts.map(p => p.toObject()),
      recursos: recursos.map(r => r.toObject()),
      eventos: eventos.map(e => e.toObject()),
      oportunidades: oportunidades.map(o => o.toObject()),
      visualeffects: visualeffects.map(v => v.toObject()),
      tickets: tickets.map(t => t.toObject())
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="artedigital_data_export_${user.username}_${Date.now()}.json"`);
    return res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (err: any) {
    console.error('[GDPR Data Export Error]', err);
    return res.status(500).json({ error: 'Error al exportar datos personales' });
  }
});

// Derecho al Olvido / Eliminación de Cuenta (Art. 17 GDPR)
router.delete('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    console.log(`[GDPR Right to be Forgotten] Deleting user data for ${user.username} (${userId})`);

    // Eliminar o anonimizar publicaciones asociadas
    await Post.deleteMany({ author: userId });
    await Recurso.deleteMany({ author: userId });
    await Evento.deleteMany({ creator: userId });
    await Oportunidad.deleteMany({ creador: userId });
    await VisualEffect.deleteMany({ author: userId });
    await Ticket.deleteMany({ user: userId });

    // Eliminar registro del usuario
    await User.findByIdAndDelete(userId);

    return res.json({ 
      success: true, 
      message: 'Cuenta y datos personales eliminados permanentemente conforme al Art. 17 del GDPR.' 
    });
  } catch (err: any) {
    console.error('[GDPR Account Erasure Error]', err);
    return res.status(500).json({ error: 'Error al procesar la eliminación de la cuenta' });
  }
});

export default router;
