import { Router, Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import Evento from '../models/Evento';
import Recurso from '../models/Recurso';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') return res.json([]);

    const query = new RegExp(q, 'i');

    const [users, posts, events, resources] = await Promise.all([
      User.find({ 
        $or: [
          { username: query },
          { displayName: query }
        ]
      }).limit(10).select('username displayName avatar'),
      
      Post.find({ 
        $or: [
          { title: query },
          { tags: query },
          { description: query }
        ]
      }).limit(10).populate('author', 'username').select('title author imageUrl createdAt tags description youtube_video'),
      
      Evento.find({ 
        $or: [
          { title: query },
          { description: query }
        ]
      }).limit(10).select('title date imageUrl description youtube_video'),
      
      Recurso.find({ 
        $or: [
          { title: query },
          { tags: query },
          { description: query }
        ]
      }).limit(10).populate('author', 'username').select('title author url type tags description youtube_video')
    ]);

    const results = [
      ...users.map(u => ({ type: 'user', id: u.username, label: u.displayName || u.username, avatar: u.avatar })),
      ...posts.map(p => ({ type: 'post', id: p._id, label: p.title, author: (p.author as any)?.username, image: p.imageUrl, date: p.createdAt, youtube_video: p.youtube_video, description: p.description })),
      ...events.map(e => ({ type: 'event', id: e._id, label: e.title, date: e.date, image: e.imageUrl, desc: e.description, youtube_video: e.youtube_video })),
      ...resources.map(r => ({ type: 'resource', id: r._id, label: r.title, author: (r.author as any)?.username, url: r.url, resourceType: r.type, youtube_video: r.youtube_video, description: r.description }))
    ];

    return res.json(results);
  } catch (err: any) {
    console.error('[Search] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
