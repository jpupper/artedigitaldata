// ============================================================
// 🗂️ FSC — índice universal de assets (lo llama el perfil de fscauth)
// GET /artedigitaldata/api/fsc/assets?username=X
//
// Arquitectura BICOMPARTIDA: las creaciones (recursos, obras, posteos y
// composiciones de palabras) SIGUEN viviendo en la base de datos de esta app;
// fscauth solo las INDEXA para el pasaporte universal de usuario.
//
// Autorización: clave interna de fscauth (x-fsc-internal === JWT_SECRET/FSC_INTERNAL_KEY)
// o sesión FSC válida del propio usuario (se verifica contra fscauth).
// ============================================================
import { Router, Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import VisualEffect from '../models/VisualEffect';
import ParticleWord from '../models/ParticleWord';

const router = Router();

const FSC_BASE = process.env.FSC_PUBLIC_PATH || '/artedigitaldata';
const FSCAUTH = process.env.FSCAUTH_URL || 'https://vps-4455523-x.dattaweb.com/fscauth';

interface Item { id: string; title: string; url: string; meta?: Record<string, unknown> }
interface Group { type: string; label: string; count: number; items: Item[] }

async function authorized(req: Request, username: string): Promise<boolean> {
  const internal = process.env.FSC_INTERNAL_KEY || process.env.JWT_SECRET || '';
  const key = req.headers['x-fsc-internal'];
  if (internal && typeof key === 'string' && key === internal) return true;

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  try {
    const r = await fetch(`${FSCAUTH}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } });
    const d: any = await r.json();
    if (!d || d.loggedIn !== true || !d.user) return false;
    if (String(d.user.username || '').toLowerCase() === username.toLowerCase()) return true;
    return d.user.role === 'ADMIN' || d.user.role === 'SYSTEM';
  } catch {
    return false;
  }
}

router.get('/assets', async (req: Request, res: Response) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'username requerido' });
  if (!(await authorized(req, username))) return res.status(401).json({ error: 'No autorizado' });

  try {
    const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`^${escaped}$`, 'i');
    const users = await User.find({ username: rx }).select('_id').lean();
    const ids = users.map((u: any) => u._id);

    const groups: Group[] = [];
    if (ids.length) {
      const [recursos, obras, posteos] = await Promise.all([
        Recurso.find({ author: { $in: ids } }).select('_id title').sort({ createdAt: -1 }).limit(200).lean(),
        VisualEffect.find({ author: { $in: ids } }).select('_id title').sort({ createdAt: -1 }).limit(200).lean(),
        Post.find({ author: { $in: ids } }).select('_id title').sort({ createdAt: -1 }).limit(200).lean()
      ]);

      if (recursos.length) {
        groups.push({
          type: 'recurso', label: 'Recursos', count: recursos.length,
          items: recursos.map((r: any) => ({ id: String(r._id), title: r.title || 'Recurso', url: `${FSC_BASE}/recurso.html?id=${r._id}` }))
        });
      }
      if (obras.length) {
        groups.push({
          type: 'obra', label: 'Obras / efectos visuales', count: obras.length,
          items: obras.map((o: any) => ({ id: String(o._id), title: o.title || 'Obra', url: `${FSC_BASE}/outputeffect.html?outputeffect=${o._id}` }))
        });
      }
      if (posteos.length) {
        groups.push({
          type: 'post', label: 'Posteos', count: posteos.length,
          items: posteos.map((p: any) => ({ id: String(p._id), title: p.title || 'Posteo', url: `${FSC_BASE}/post.html?id=${p._id}` }))
        });
      }
    }

    // Composiciones de palabras (ParticleWord): se guardan con addedBy.username
    const palabras = await ParticleWord.find({ 'addedBy.username': rx }).select('_id word').sort({ createdAt: -1 }).limit(200).lean();
    if (palabras.length) {
      groups.push({
        type: 'palabra', label: 'Composiciones de palabras', count: palabras.length,
        items: palabras.map((w: any) => ({ id: String(w._id), title: w.word, url: `${FSC_BASE}/particulas.html` }))
      });
    }

    return res.json({
      ok: true, app: 'artedigitaldata', username,
      total: groups.reduce((n, g) => n + g.count, 0),
      groups
    });
  } catch (err: any) {
    console.error('[FSC-ASSETS] error:', err.message);
    return res.status(500).json({ error: 'No se pudo indexar los assets' });
  }
});

export default router;
