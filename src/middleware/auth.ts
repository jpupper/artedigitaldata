import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request<any, any, any, any> {
  user?: { id: string; role: string; username: string };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('[AuthMiddleware] Token present:', !!token, 'Path:', req.path);
  if (!token) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not defined');
    const decoded = jwt.verify(token, secret) as {
      id: string;
      role: string;
      username: string;
    };
    console.log('[AuthMiddleware] Token decoded:', decoded);
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error('[AuthMiddleware] Token verification failed:', err.message);
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Optional auth - sets req.user if token is valid, but doesn't require it
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    next();
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not defined');
    const decoded = jwt.verify(token, secret) as {
      id: string;
      role: string;
      username: string;
    };
    req.user = decoded;
  } catch {
    // Invalid token, continue without user
  }
  next();
}

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  try {
    // Buscar los permisos específicos en la DB central
    const user = await User.findById(req.user.id);
    if (!user || user.permissions?.artedigital?.role !== 'ADMINISTRADOR') {
      res.status(403).json({ error: 'Acceso denegado. Se requiere rol ADMINISTRADOR en Arte Digital.' });
      return;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error verificando permisos de administrador' });
  }
}
