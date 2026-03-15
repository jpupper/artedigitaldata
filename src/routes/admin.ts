import { Router, Response } from 'express';
import User from '../models/User';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/users', authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/role', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['USUARIO', 'ADMINISTRADOR'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
