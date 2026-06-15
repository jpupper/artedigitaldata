import { Router, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import Evento from '../models/Evento';
import BotConfig, { getBotConfig, setBotConfig } from '../models/BotConfig';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { runAutobot, generateContent } from '../scripts/cronbot';

const router = Router();

// Helper: check if autobot is enabled (DB override or env fallback)
async function isAutobotEnabled(): Promise<boolean> {
  const dbEnabled = await getBotConfig('autobot_enabled', null);
  if (dbEnabled !== null) return dbEnabled === true;
  return process.env.AUTOBOT_ENABLED === 'true';
}

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

// GET /admin/autobot/config — obtener configuración del autobot
router.get('/autobot/config', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const enabled = await isAutobotEnabled();
    const envValue = process.env.AUTOBOT_ENABLED === 'true';
    const dbValue = await getBotConfig('autobot_enabled', null);
    return res.json({
      enabled,
      fromEnv: dbValue === null,
      envValue,
      dbValue,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /admin/autobot/config — toggle autobot enabled/disabled (guarda en DB)
router.post('/autobot/config', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled debe ser true o false' });
    }
    await setBotConfig('autobot_enabled', enabled);
    console.log(`[Admin] Autobot ${enabled ? 'HABILITADO' : 'DESHABILITADO'} por admin desde DB config`);
    return res.json({
      message: enabled ? 'Autobot habilitado' : 'Autobot deshabilitado',
      enabled,
      fromDB: true,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /admin/autobot/run — ejecutar el autobot manualmente
router.post('/autobot/run', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  const enabled = await isAutobotEnabled();
  if (!enabled) {
    return res.status(403).json({ error: 'Autobot deshabilitado. Activá el toggle en la sección Autobot del panel.' });
  }
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

// POST /admin/autobot/generate — generar contenido con IA (Ollama + búsqueda web real)
router.post('/autobot/generate', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  const enabled = await isAutobotEnabled();
  if (!enabled) {
    return res.status(403).json({ error: 'Autobot deshabilitado. Activá el toggle en la sección Autobot del panel.' });
  }
  try {
    const { topic, maxItems, publish } = req.body || {};
    console.log('[Admin] generateContent llamado por admin' + (topic ? ` — topic: "${topic}"` : ''));
    
    const result = await generateContent({
      topic: topic || '',
      maxItems: maxItems || 3,
      publish: publish !== false,
    });

    const statusCode = result.success ? 200 : 500;
    return res.status(statusCode).json({
      message: result.success
        ? `Generación completada. Publicados: ${result.published}/${result.generated.length}`
        : 'No se pudo generar contenido',
      ...result,
    });
  } catch (err: any) {
    console.error('[Admin] Error en generateContent:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /admin/autobot/status — estado del autobot
router.get('/autobot/status', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  const enabled = await isAutobotEnabled();
  if (!enabled) {
    return res.status(403).json({ error: 'Autobot deshabilitado', enabled: false });
  }
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
