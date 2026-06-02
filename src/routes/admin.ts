import { Router, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import Evento from '../models/Evento';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { runAutobot } from '../scripts/cronbot';

const router = Router();

// Listar todos los usuarios del sistema central
router.get('/users', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    // Mapear para que el frontend vea el role de artedigital como el principal
    const mappedUsers = users.map(u => {
      const obj = u.toObject();
      return {
        ...obj,
        role: u.permissions?.artedigital?.role || 'USUARIO'
      };
    });

    return res.json(mappedUsers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Cambiar el rol específico de artedigital para un usuario
router.patch('/users/:id/role', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['USUARIO', 'ADMINISTRADOR'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { $set: { 'permissions.artedigital.role': role } }, 
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const responseUser = {
      ...user.toObject(),
      role: user.permissions?.artedigital?.role || 'USUARIO'
    };

    return res.json(responseUser);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /admin/autobot/run — ejecutar el autobot manualmente
router.post('/autobot/run', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    console.log('[Admin] Autobot ejecutado manualmente por admin');
    const result = await runAutobot();
    return res.json({
      message: `Autobot completado. Publicados: ${result.published}/${result.found}`,
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /admin/autobot/status — estado del autobot
router.get('/autobot/status', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const botUser = await User.findOne({ username: 'ADDBOT' });
    const lastPosts = await Post.find({ tags: 'autobotadd' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt imageUrl');
    const lastRecursos = await Recurso.find({ tags: 'autobotadd' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt url');

    return res.json({
      botUserExists: !!botUser,
      botUser: botUser ? { username: botUser.username, _id: botUser._id } : null,
      totalAutobotPosts: await Post.countDocuments({ tags: 'autobotadd' }),
      totalAutobotRecursos: await Recurso.countDocuments({ tags: 'autobotadd' }),
      lastPosts,
      lastRecursos,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
