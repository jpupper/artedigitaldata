import { Router, Request, Response } from 'express';
import User from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const FSC_AUTH_API = process.env.FSC_AUTH_API || 'http://localhost:3027/fscauth/api';

// Auxiliar para parsear errores de fetch
const handleProxyError = (res: Response, err: any) => {
  console.error('[Proxy Error]:', err);
  return res.status(500).json({ error: 'Error al conectar con el sistema central de autenticación' });
};

// Register Proxy
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const response = await fetch(`${FSC_AUTH_API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, origin: 'artedigitaldata' })
    });

    const data: any = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Adaptar la respuesta de fscauth al formato esperado por artedigitaldata
    // fscauth devuelve user: { id, username, email, role }
    // artedigitaldata necesita mas campos o roles específicos
    return res.status(201).json({ 
      token: data.token, 
      user: { 
        id: data.user.id, 
        username: data.user.username, 
        role: 'USUARIO', // Por defecto en artedigital
        avatar: '', 
        displayName: '' 
      } 
    });
  } catch (err: any) {
    return handleProxyError(res, err);
  }
});

// Login Proxy
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/usuario y contraseña son obligatorios' });
    }

    const response = await fetch(`${FSC_AUTH_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier, password })
    });

    const data: any = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Buscar el usuario en la DB central (vía el modelo User compartido) para obtener roles específicos de artedigital
    const dbUser = await User.findById(data.user.id);
    const globalRole = dbUser?.role || data.user.role || 'USER';
    const adRole = dbUser?.permissions?.artedigital?.role || (globalRole === 'ADMIN' ? 'ADMINISTRADOR' : 'USUARIO');

    return res.json({ 
      token: data.token, 
      user: { 
        id: data.user.id, 
        username: data.user.username, 
        role: adRole, 
        avatar: dbUser?.avatar || '', 
        displayName: dbUser?.displayName || '' 
      } 
    });
  } catch (err: any) {
    return handleProxyError(res, err);
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    // Mapear campos para compatibilidad si es necesario
    const globalRole = user.role;
    const adRole = user.permissions?.artedigital?.role || (globalRole === 'ADMIN' ? 'ADMINISTRADOR' : 'USUARIO');
    
    const responseData = {
      ...user.toObject(),
      role: adRole // Sobrescribir el role global con el específico de artedigital (o el heredado)
    };

    return res.json(responseData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Los endpoints de forgot/reset password se pueden dejar como estaban si envían mails desde aquí
// O derivarlos a fscauth. Por simplicidad en este paso, los quitamos o comentamos indicando
// que el sistema central debería manejarlos, o los dejamos usando el nuevo User model.
// El usuario pidió básicamente todo relacionado a usuarios, así que los mantendré usando el modelo compartido.

// Forgot Password Proxy
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const response = await fetch(`${FSC_AUTH_API}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, origin: 'artedigitaldata' })
        });

        const data: any = await response.json();
        return res.status(response.status).json(data);
    } catch (err: any) {
        return handleProxyError(res, err);
    }
});

// Reset Password Proxy
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;
        const response = await fetch(`${FSC_AUTH_API}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword: password })
        });

        const data: any = await response.json();
        return res.status(response.status).json(data);
    } catch (err: any) {
        return handleProxyError(res, err);
    }
});

export default router;
