// ============================================================
// 🗂️ FSC — índice universal de assets (lo llama el perfil de fscauth)
// GET /artedigitaldata/api/fsc/assets?username=X        → Internal (esta app)
// GET /artedigitaldata/api/fsc/ecosystem?username=X     → External (proxy de fscauth)
//
// Arquitectura BICOMPARTIDA: las creaciones (recursos, obras, posteos y
// composiciones de palabras) SIGUEN viviendo en la base de datos de esta app;
// fscauth solo las INDEXA para el pasaporte universal de usuario.
//
// Autorización: clave interna de fscauth (x-fsc-internal === JWT_SECRET/FSC_INTERNAL_KEY)
// o sesión FSC válida del propio usuario — el helper compartido está en utils/fscAuthApi.ts.
// ============================================================
import { Router, Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Recurso from '../models/Recurso';
import VisualEffect from '../models/VisualEffect';
import ParticleWord from '../models/ParticleWord';
import { authorizedFsc } from '../utils/fscAuthApi';
import fscEcosystemRoutes from './fscEcosystem';

const router = Router();

// /api/fsc/assets     → lo que vive en ESTA app (Internal)
// /api/fsc/ecosystem  → el resto del ecosistema, proxeado a fscauth (External)
const FSC_BASE = process.env.FSC_PUBLIC_PATH || '/artedigitaldata';

interface Item { id: string; title: string; url: string; meta?: Record<string, unknown> }
interface Group { type: string; label: string; count: number; items: Item[] }

// El índice EXTERNO va montado acá para no tocar server.ts:
// GET /api/fsc/ecosystem?username=X → ver fscEcosystem.ts (explica el bug de CORS).
router.use('/ecosystem', fscEcosystemRoutes);
router.get('/assets', async (req: Request, res: Response) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'username requerido' });
  if (!(await authorizedFsc(req, username))) return res.status(401).json({ error: 'No autorizado' });

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
