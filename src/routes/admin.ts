import { Router, Response } from 'express';
import User from '../models/User';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

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

    // Actualizar en permissions.artedigital.role
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

export default router;
