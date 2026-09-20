import { Router, Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Evento from '../models/Evento';
import Recurso from '../models/Recurso';
import Oportunidad from '../models/Oportunidad';

const router = Router();

const MAX_PER_TYPE = 12;

// Escapa los caracteres especiales para poder meter el texto del usuario dentro de un RegExp
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Combina condiciones opcionales sin romper cuando no hay ninguna
function buildFilter(parts: any[]) {
  const clean = parts.filter((p) => p && Object.keys(p).length > 0);
  return clean.length ? { $and: clean } : {};
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, types, subType, tag } = req.query as {
      q?: string;
      types?: string;
      subType?: string;
      tag?: string;
    };

    const text = typeof q === 'string' ? q.trim() : '';
    const keyword = typeof tag === 'string' ? tag.trim() : '';
    const tipoChance = typeof subType === 'string' ? subType.trim() : '';
    const requestedTypes = typeof types === 'string' && types.trim()
      ? types.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    // Sin texto ni filtros no hay nada que buscar
    if (!text && !keyword && !tipoChance && requestedTypes.length === 0) return res.json([]);

    const textQuery = text ? new RegExp(escapeRegex(text), 'i') : null;
    const tagQuery = keyword ? new RegExp(escapeRegex(keyword), 'i') : null;

    // Sin "types" se buscan todos los tipos
    const wants = (type: string) => requestedTypes.length === 0 || requestedTypes.includes(type);

    const userParts: any[] = [];
    if (textQuery) userParts.push({ $or: [{ username: textQuery }, { displayName: textQuery }, { bio: textQuery }] });
    if (tagQuery) userParts.push({ $or: [{ username: tagQuery }, { displayName: tagQuery }] });

    const postParts: any[] = [{ visibility: 'public' }];
    if (textQuery) postParts.push({ $or: [{ title: textQuery }, { tags: textQuery }, { description: textQuery }] });
    if (tagQuery) postParts.push({ tags: tagQuery });

    const eventParts: any[] = [{ visibility: 'public' }];
    if (textQuery) eventParts.push({ $or: [{ title: textQuery }, { description: textQuery }, { tags: textQuery }] });
    if (tagQuery) eventParts.push({ tags: tagQuery });

    const resourceParts: any[] = [{ visibility: 'public' }];
    if (textQuery) resourceParts.push({ $or: [{ title: textQuery }, { tags: textQuery }, { description: textQuery }] });
    if (tagQuery) resourceParts.push({ tags: tagQuery });

    const oportunidadParts: any[] = [{ activa: true }, { visibility: 'public' }];
    if (textQuery) {
      oportunidadParts.push({
        $or: [
          { titulo: textQuery },
          { descripcion: textQuery },
          { tags: textQuery },
          { lugarExposicion: textQuery },
          { nombrePuesto: textQuery },
          { nombreProyecto: textQuery }
        ]
      });
    }
    if (tagQuery) oportunidadParts.push({ tags: tagQuery });
    if (tipoChance) oportunidadParts.push({ tipo: tipoChance });

    const [users, posts, events, resources, oportunidades] = await Promise.all([
      wants('user')
        ? User.find(buildFilter(userParts)).limit(MAX_PER_TYPE).select('username displayName avatar').lean()
        : Promise.resolve([] as any[]),

      wants('post')
        ? Post.find(buildFilter(postParts))
            .sort({ createdAt: -1 })
            .limit(MAX_PER_TYPE)
            .populate('author', 'username')
            .select('title author imageUrl createdAt tags description youtube_video')
            .lean()
        : Promise.resolve([] as any[]),

      wants('event')
        ? Evento.find(buildFilter(eventParts))
            .sort({ date: 1 })
            .limit(MAX_PER_TYPE)
            .select('title date imageUrl description youtube_video tags')
            .lean()
        : Promise.resolve([] as any[]),

      wants('resource')
        ? Recurso.find(buildFilter(resourceParts))
            .sort({ createdAt: -1 })
            .limit(MAX_PER_TYPE)
            .populate('author', 'username')
            .select('title author url type tags description youtube_video')
            .lean()
        : Promise.resolve([] as any[]),

      wants('oportunidad')
        ? Oportunidad.find(buildFilter(oportunidadParts))
            .sort({ createdAt: -1 })
            .limit(MAX_PER_TYPE)
            .populate('creador', 'username')
            .select('titulo creador imagenUrl createdAt tags descripcion tipo youtube_video')
            .lean()
        : Promise.resolve([] as any[])
    ]);

    const results = [
      ...users.map((u: any) => ({ type: 'user', id: u.username, _id: u._id, label: u.displayName || u.username, avatar: u.avatar })),
      ...posts.map((p: any) => ({ type: 'post', id: p._id, label: p.title, author: p.author?.username, image: p.imageUrl, date: p.createdAt, youtube_video: p.youtube_video, description: p.description, tags: p.tags || [] })),
      ...events.map((e: any) => ({ type: 'event', id: e._id, label: e.title, date: e.date, image: e.imageUrl, desc: e.description, youtube_video: e.youtube_video, tags: e.tags || [] })),
      ...resources.map((r: any) => ({ type: 'resource', id: r._id, label: r.title, author: r.author?.username, url: r.url, resourceType: r.type, youtube_video: r.youtube_video, description: r.description, tags: r.tags || [] })),
      ...oportunidades.map((o: any) => ({ type: 'oportunidad', id: o._id, label: o.titulo, author: o.creador?.username, image: o.imagenUrl, date: o.createdAt, desc: o.descripcion, subType: o.tipo, youtube_video: o.youtube_video, tags: o.tags || [] }))
    ];

    return res.json(results);
  } catch (err: any) {
    console.error('[Search] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
