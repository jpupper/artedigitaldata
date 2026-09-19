import { Router, Request, Response } from 'express';
import { Oportunidad, Inscripcion } from '../models/Oportunidad';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Post from '../models/Post';
import Notification from '../models/Notification';
import { notifyUser } from '../../server';
import { hydrate, hydrateComments } from '../utils/userHydration';

const router = Router();

// =============================================
// LISTAR OPORTUNIDADES (público / admin)
// =============================================
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    const isAdminUser = req.user && (req.user.role === 'ADMIN' || req.user.role === 'ADMINISTRADOR' || req.user.username === 'jpupper');
    const showAll = req.query.all === 'true' || isAdminUser;

    if (!showAll) {
      filter.activa = true;
      filter.visibility = 'public';
    }

    if (req.query.tipo) filter.tipo = req.query.tipo;
    if (req.query.pinned === 'true') filter.pinned = true;
    
    const oportunidades = await Oportunidad.find(filter)
      .sort({ createdAt: -1 });
    const final = await hydrate(oportunidades, 'creador');
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =============================================
// OBTENER UNA OPORTUNIDAD (público)
// =============================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }
    
    const [hydrated] = await hydrate([oportunidad], 'creador');
    const final = await hydrateComments(hydrated);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =============================================
// CREAR OPORTUNIDAD (requiere auth)
// =============================================
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      tipo,
      titulo,
      descripcion,
      basesCondiciones,
      lugarExposicion,
      fechaDesde,
      fechaHasta,
      imagenUrl,
      parametrosPresentacion,
      nombrePuesto,
      productoraEmpresa,
      nombreProyecto,
      colaboracionPedida,
      tags,
      visibility,
    } = req.body;

    if (!tipo || !titulo) {
      return res.status(400).json({ error: 'Tipo y título son obligatorios' });
    }

    if (!['convocatoria_obra', 'oportunidad_laboral', 'colaboracion'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de oportunidad inválido' });
    }

    const oportunidad = await Oportunidad.create({
      tipo,
      titulo,
      descripcion: descripcion || '',
      creador: req.user!.id,
      basesCondiciones: basesCondiciones || '',
      lugarExposicion: lugarExposicion || '',
      fechaDesde: fechaDesde || null,
      fechaHasta: fechaHasta || null,
      imagenUrl: imagenUrl || '',
      parametrosPresentacion: parametrosPresentacion || [],
      nombrePuesto: nombrePuesto || '',
      productoraEmpresa: productoraEmpresa || '',
      nombreProyecto: nombreProyecto || '',
      colaboracionPedida: colaboracionPedida || '',
      tags: tags || [],
      visibility: visibility || 'public',
    });

    const [final] = await hydrate([oportunidad], 'creador');
    return res.status(201).json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// ACTUALIZAR OPORTUNIDAD (creador o admin)
// =============================================
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    if (
      oportunidad.creador.toString() !== req.user!.id &&
      req.user!.role !== 'ADMINISTRADOR' &&
      req.user!.role !== 'ADMIN'
    ) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (req.body.title !== undefined && req.body.titulo === undefined) req.body.titulo = req.body.title;
    if (req.body.description !== undefined && req.body.descripcion === undefined) req.body.descripcion = req.body.description;
    if (req.body.imageUrl !== undefined && req.body.imagenUrl === undefined) req.body.imagenUrl = req.body.imageUrl;

    const updatableFields = [
      'tipo', 'titulo', 'descripcion', 'basesCondiciones', 'lugarExposicion',
      'fechaDesde', 'fechaHasta', 'imagenUrl', 'parametrosPresentacion',
      'nombrePuesto', 'productoraEmpresa', 'nombreProyecto',
      'colaboracionPedida', 'activa', 'tags', 'visibility'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        (oportunidad as any)[field] = req.body[field];
      }
    });

    await oportunidad.save();
    const [final] = await hydrate([oportunidad], 'creador');
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// ELIMINAR OPORTUNIDAD (creador o admin)
// =============================================
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    if (
      oportunidad.creador.toString() !== req.user!.id &&
      req.user!.role !== 'ADMINISTRADOR' &&
      req.user!.role !== 'ADMIN'
    ) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Eliminar inscripciones asociadas
    await Inscripcion.deleteMany({ oportunidad: oportunidad._id });
    await oportunidad.deleteOne();
    
    return res.json({ message: 'Oportunidad eliminada' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// INSCRIBIRSE A UNA OPORTUNIDAD (requiere auth)
// =============================================
router.post('/:id/inscripcion', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    if (!oportunidad.activa) {
      return res.status(400).json({ error: 'Esta oportunidad ya no está activa' });
    }

    // Verificar si ya está inscrito
    const existing = await Inscripcion.findOne({
      usuario: req.user!.id,
      oportunidad: oportunidad._id,
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya estás inscrito en esta oportunidad' });
    }

    const tipoInscripcion = req.body.tipoInscripcion === 'obra' ? 'obra' : 'formulario';
    const obraId = req.body.obra || req.body.obraId;
    let obraRef: any = null;
    let datosFinal = req.body.datos || {};

    if (tipoInscripcion === 'obra') {
      if (!obraId) {
        return res.status(400).json({ error: 'Debes seleccionar una obra para postular.' });
      }
      const post = await Post.findById(obraId);
      if (!post) {
        return res.status(404).json({ error: 'La obra seleccionada no existe.' });
      }
      obraRef = post._id;

      // Almacenar snapshot de la obra dentro de datos para resiliencia visual
      datosFinal = {
        ...datosFinal,
        tipoInscripcion: 'obra',
        obraId: post._id.toString(),
        obraTitulo: post.title,
        obraImagen: post.imageUrl || '',
        obraDescripcion: post.description || '',
        obraYoutube: post.youtube_video || '',
      };
    } else {
      datosFinal = {
        ...datosFinal,
        tipoInscripcion: 'formulario',
      };
    }

    const inscripcion = await Inscripcion.create({
      usuario: req.user!.id,
      oportunidad: oportunidad._id,
      datos: datosFinal,
      tipoInscripcion,
      obra: obraRef,
      mensaje: req.body.mensaje || '',
      estado: 'pendiente',
    });

    // Agregar inscripción a la oportunidad
    oportunidad.inscripciones.push(inscripcion._id as any);
    await oportunidad.save();

    // Notificar al creador de la oportunidad si no es él mismo
    if (oportunidad.creador.toString() !== req.user!.id) {
      const applicantUser = await User.findById(req.user!.id).select('username displayName avatar');
      const applicantName = applicantUser?.displayName || applicantUser?.username || 'Un artista';
      Notification.create({
        recipient: oportunidad.creador,
        type: 'postulacion_nueva',
        actor: req.user!.id as any,
        actorName: applicantName,
        actorAvatar: applicantUser?.avatar || '',
        resourceId: oportunidad._id.toString(),
        resourceTitle: oportunidad.titulo,
        resourceType: 'oportunidad',
        message: `${applicantName} se postuló a tu convocatoria "${oportunidad.titulo}"`,
      }).then(notif => {
        notifyUser(oportunidad.creador.toString(), 'newNotification', notif);
      }).catch(() => {});
    }

    const populated = await Inscripcion.findById(inscripcion._id).populate('obra');
    return res.status(201).json(populated || inscripcion);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// OBTENER INSCRIPCIONES DE UNA OPORTUNIDAD (creador o admin)
// =============================================
router.get('/:id/inscripciones', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    if (
      oportunidad.creador.toString() !== req.user!.id &&
      req.user!.role !== 'ADMINISTRADOR' &&
      req.user!.role !== 'ADMIN'
    ) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const inscripciones = await Inscripcion.find({ oportunidad: oportunidad._id })
      .populate('obra')
      .sort({ createdAt: -1 });

    // Hydrate usuario data
    const userIds = inscripciones.map(i => i.usuario);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id username email displayName avatar bio socials');
    
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const final = inscripciones.map(insc => {
      const obj: any = insc.toObject();
      obj.usuario = userMap.get(insc.usuario?.toString() || (insc.usuario as any)?._id?.toString()) || insc.usuario;
      if (!obj.tipoInscripcion) {
        obj.tipoInscripcion = obj.obra || obj.datos?.tipoInscripcion === 'obra' ? 'obra' : 'formulario';
      }
      return obj;
    });

    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// ACTUALIZAR ESTADO DE INSCRIPCIÓN (creador o admin)
// =============================================
router.patch('/:id/inscripciones/:inscripcionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    if (
      oportunidad.creador.toString() !== req.user!.id &&
      req.user!.role !== 'ADMINISTRADOR' &&
      req.user!.role !== 'ADMIN'
    ) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const inscripcion = await Inscripcion.findById(req.params.inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }

    const previousState = inscripcion.estado;
    if (req.body.estado) {
      inscripcion.estado = req.body.estado;
    }
    if (req.body.respuesta !== undefined) {
      inscripcion.datos = { ...inscripcion.datos, respuesta: req.body.respuesta };
    }

    await inscripcion.save();

    // Notificar al postulante si el estado cambió a aceptada o rechazada
    if (req.body.estado && req.body.estado !== previousState && inscripcion.usuario.toString() !== req.user!.id) {
      const isAccepted = req.body.estado === 'aceptada';
      const notifType = isAccepted ? 'postulacion_aceptada' : (req.body.estado === 'rechazada' ? 'postulacion_rechazada' : null);
      if (notifType) {
        const creatorUser = await User.findById(req.user!.id).select('username displayName avatar');
        const creatorName = creatorUser?.displayName || creatorUser?.username || 'El organizador';
        const msg = isAccepted
          ? `¡Tu postulación a "${oportunidad.titulo}" fue ACEPTADA!`
          : `Tu postulación a "${oportunidad.titulo}" no fue seleccionada esta vez.`;

        Notification.create({
          recipient: inscripcion.usuario,
          type: notifType,
          actor: req.user!.id as any,
          actorName: creatorName,
          actorAvatar: creatorUser?.avatar || '',
          resourceId: oportunidad._id.toString(),
          resourceTitle: oportunidad.titulo,
          resourceType: 'oportunidad',
          message: msg,
        }).then(notif => {
          notifyUser(inscripcion.usuario.toString(), 'newNotification', notif);
        }).catch(() => {});
      }
    }

    // Hydrate usuario
    const user = await User.findById(inscripcion.usuario)
      .select('_id username email displayName avatar bio socials');
    const obj: any = inscripcion.toObject();
    obj.usuario = user || inscripcion.usuario;

    return res.json(obj);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// MIS INSCRIPCIONES (usuario autenticado)
// =============================================
router.get('/mis-inscripciones/listar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const inscripciones = await Inscripcion.find({ usuario: req.user!.id })
      .populate('obra')
      .sort({ createdAt: -1 });

    const opoIds = inscripciones.map(i => i.oportunidad);
    const oportunidades = await Oportunidad.find({ _id: { $in: opoIds } });
    const opoMap = new Map(oportunidades.map(o => [o._id.toString(), o]));

    const final = inscripciones.map(insc => {
      const obj: any = insc.toObject();
      obj.oportunidad = opoMap.get(insc.oportunidad.toString()) || insc.oportunidad;
      if (!obj.tipoInscripcion) {
        obj.tipoInscripcion = obj.obra || obj.datos?.tipoInscripcion === 'obra' ? 'obra' : 'formulario';
      }
      return obj;
    });

    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// MIS OPORTUNIDADES CREADAS (usuario autenticado)
// =============================================
router.get('/mis-oportunidades/listar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidades = await Oportunidad.find({ creador: req.user!.id })
      .sort({ createdAt: -1 });
    const final = await hydrate(oportunidades, 'creador');
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// LIKE / UNLIKE OPORTUNIDAD (requiere auth)
// =============================================
router.post('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });

    const userId = req.user!.id as any;
    if (!oportunidad.likes) oportunidad.likes = [];
    
    const index = oportunidad.likes.findIndex(id => id.toString() === userId.toString());
    let isAdding = false;
    if (index === -1) {
      oportunidad.likes.push(userId);
      isAdding = true;
    } else {
      oportunidad.likes.splice(index, 1);
    }

    await oportunidad.save();

    if (isAdding && oportunidad.creador.toString() !== userId.toString()) {
      const actor = await User.findById(userId).select('username displayName avatar');
      const actorName = actor?.displayName || actor?.username || 'Alguien';
      Notification.create({
        recipient: oportunidad.creador,
        type: 'like_oportunidad',
        actor: userId,
        actorName,
        actorAvatar: actor?.avatar || '',
        resourceId: oportunidad._id.toString(),
        resourceTitle: oportunidad.titulo,
        resourceType: 'oportunidad',
        message: `${actorName} le dio like a tu convocatoria "${oportunidad.titulo}"`,
      }).then(notif => {
        notifyUser(oportunidad.creador.toString(), 'newNotification', notif);
      }).catch(() => {});
    }

    return res.json({ likes: oportunidad.likes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// COMENTARIOS EN OPORTUNIDAD (requiere auth)
// =============================================
router.post('/:id/comment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }

    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });

    if (!oportunidad.comments) oportunidad.comments = [];
    oportunidad.comments.push({
      user: req.user!.id as any,
      text: text.trim(),
      createdAt: new Date()
    });

    await oportunidad.save();

    if (oportunidad.creador.toString() !== req.user!.id) {
      const actor = await User.findById(req.user!.id).select('username displayName avatar');
      const actorName = actor?.displayName || actor?.username || 'Alguien';
      Notification.create({
        recipient: oportunidad.creador,
        type: 'comment_oportunidad',
        actor: req.user!.id as any,
        actorName,
        actorAvatar: actor?.avatar || '',
        resourceId: oportunidad._id.toString(),
        resourceTitle: oportunidad.titulo,
        resourceType: 'oportunidad',
        message: `${actorName} comentó en tu convocatoria "${oportunidad.titulo}"`,
      }).then(notif => {
        notifyUser(oportunidad.creador.toString(), 'newNotification', notif);
      }).catch(() => {});
    }
    const [hydrated] = await hydrate([oportunidad], 'creador');
    const final = await hydrateComments(hydrated);
    return res.status(201).json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/comments/:commentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });

    const commentIndex = (oportunidad.comments || []).findIndex(
      c => (c as any)._id?.toString() === req.params.commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    const comment = oportunidad.comments[commentIndex];
    const isCommentAuthor = comment.user.toString() === req.user!.id;
    const isOpoCreator = oportunidad.creador.toString() === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'ADMINISTRADOR' || req.user!.username === 'jpupper';

    if (!isCommentAuthor && !isOpoCreator && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado para eliminar este comentario' });
    }

    oportunidad.comments.splice(commentIndex, 1);
    await oportunidad.save();

    const [hydrated] = await hydrate([oportunidad], 'creador');
    const final = await hydrateComments(hydrated);
    return res.json(final);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// PINEAR / DESPINEAR OPORTUNIDAD (admin)
// =============================================
router.post('/:id/pin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'ADMINISTRADOR' || req.user!.username === 'jpupper';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden pinear' });
    }
    const oportunidad = await Oportunidad.findByIdAndUpdate(req.params.id, { pinned: true }, { new: true });
    if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });
    return res.json({ message: 'Oportunidad pineada', oportunidad });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/unpin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'ADMINISTRADOR' || req.user!.username === 'jpupper';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden despinnar' });
    }
    const oportunidad = await Oportunidad.findByIdAndUpdate(req.params.id, { pinned: false }, { new: true });
    if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });
    return res.json({ message: 'Oportunidad despineada', oportunidad });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

