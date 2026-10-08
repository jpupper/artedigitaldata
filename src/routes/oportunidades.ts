import { Router, Request, Response } from 'express';
import { Oportunidad, Inscripcion } from '../models/Oportunidad';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Post from '../models/Post';
import Notification from '../models/Notification';
import { notifyUser } from '../../server';
import { hydrate, hydrateComments } from '../utils/userHydration';
import { buildZip } from '../utils/zip';
import { normalizeCocreadores } from '../utils/cocreadores';

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
    const withCocreadores = await hydrate(final, 'cocreadores');
    return res.json(withCocreadores);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// =============================================
// OBTENER UNA OPORTUNIDAD (público)
// =============================================
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) {
      return res.status(404).json({ error: 'Oportunidad no encontrada' });
    }

    const esGestor = !!req.user && (
      oportunidad.creador.toString() === req.user.id ||
      req.user.role === 'ADMINISTRADOR' ||
      req.user.role === 'ADMIN' ||
      req.user.username === 'jpupper'
    );

    const [hydrated] = await hydrate([oportunidad], 'creador');
    const [conCocreadores] = await hydrate([hydrated], 'cocreadores');
    let final: any = await hydrateComments(conCocreadores);

    // Los inscriptos autorizados solo necesitan saber que están en la lista;
    // el creador/admin reciben la lista con datos de usuario para gestionarla.
    if (esGestor && Array.isArray(final.accesoPostulantes) && final.accesoPostulantes.length > 0) {
      const [conUsuarios] = await hydrate([final], 'accesoPostulantes');
      final = conUsuarios;
    }

    return res.json({ ...final, puedeGestionar: esGestor });
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
      sistemaInterno,
      linkExterno,
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
      cocreadores: normalizeCocreadores(req.body.cocreadores, req.user!.id),
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
      sistemaInterno: sistemaInterno !== undefined ? Boolean(sistemaInterno) : true,
      linkExterno: linkExterno || '',
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
      'colaboracionPedida', 'activa', 'sistemaInterno', 'linkExterno', 'tags', 'visibility'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        (oportunidad as any)[field] = req.body[field];
      }
    });

    if (req.body.cocreadores !== undefined) {
      oportunidad.cocreadores = normalizeCocreadores(req.body.cocreadores, oportunidad.creador) as any;
    }

    await oportunidad.save();
    const [conCreador] = await hydrate([oportunidad], 'creador');
    const [final] = await hydrate([conCreador], 'cocreadores');
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

    if (oportunidad.sistemaInterno === false) {
      return res.status(400).json({ error: 'Esta convocatoria gestiona sus postulaciones externamente a través de su link oficial.' });
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

    const esGestorInscripciones =
      oportunidad.creador.toString() === req.user!.id ||
      req.user!.role === 'ADMINISTRADOR' ||
      req.user!.role === 'ADMIN';

    const esViewerAutorizado = (oportunidad.accesoPostulantes || [])
      .some((id: any) => (id?._id || id).toString() === req.user!.id);

    if (!esGestorInscripciones && !esViewerAutorizado) {
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
// ACCESO A LA PLANILLA DE INSCRIPTOS (creador o admin)
// =============================================
// Igual que los "usuarios de puerta" de los eventos: el creador de la
// oportunidad y los administradores eligen qué usuarios pueden VER la
// planilla de inscriptos. Solo creador/admin pueden modificarla.
// =============================================

async function puedeGestionarAcceso(oportunidad: any, req: AuthRequest) {
  return (
    oportunidad.creador.toString() === req.user!.id ||
    req.user!.role === 'ADMINISTRADOR' ||
    req.user!.role === 'ADMIN'
  );
}

async function accesoHidratado(oportunidad: any) {
  const [final] = await hydrate([oportunidad], 'accesoPostulantes');
  return final.accesoPostulantes || [];
}

router.get('/:id/acceso-postulantes', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });

    if (!(await puedeGestionarAcceso(oportunidad, req))) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    return res.json(await accesoHidratado(oportunidad));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/acceso-postulantes', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Falta el usuario' });

    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });

    if (!(await puedeGestionarAcceso(oportunidad, req))) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const user = await User.findById(userId).select('_id username');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!oportunidad.accesoPostulantes) oportunidad.accesoPostulantes = [];
    const yaEsta = oportunidad.accesoPostulantes.some((id: any) => (id?._id || id).toString() === userId);
    if (yaEsta) {
      return res.status(400).json({ error: 'Ese usuario ya tiene acceso a la planilla' });
    }

    oportunidad.accesoPostulantes.push(userId);
    await oportunidad.save();

    return res.json({ message: 'Usuario agregado', accesoPostulantes: await accesoHidratado(oportunidad) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/acceso-postulantes/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad = await Oportunidad.findById(req.params.id);
    if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });

    if (!(await puedeGestionarAcceso(oportunidad, req))) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (!oportunidad.accesoPostulantes) oportunidad.accesoPostulantes = [];
    oportunidad.accesoPostulantes = oportunidad.accesoPostulantes
      .filter((id: any) => (id?._id || id).toString() !== req.params.userId);
    await oportunidad.save();

    return res.json({ message: 'Usuario eliminado', accesoPostulantes: await accesoHidratado(oportunidad) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================
// DESCARGA COMPLETA (ZIP: CSV + todas las imágenes)
// =============================================
// El ZIP se arma acá y no en el navegador porque las imágenes viven en el
// bucket de R2, que no responde cabeceras CORS: el fetch del navegador queda
// opaco. El servidor sí las puede bajar y empaquetar.
// =============================================

const INSCRIPCION_RESERVED = ['tipoInscripcion', 'obraId', 'obraTitulo', 'obraImagen', 'obraDescripcion', 'obraYoutube', 'respuesta'];
const IMG_EXT_RE = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;
const URL_RE = /https?:\/\/[^\s,;"'<>)\]]+/g;
const MIME_A_EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg',
};

function nombreArchivoSeguro(txt: string, max = 70): string {
  const limpio = String(txt || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  return (limpio || 'sin-nombre').slice(0, max).trim();
}

function imagenUrlsDeDatos(datos: any): string[] {
  const urls: string[] = [];
  for (const [clave, valor] of Object.entries(datos || {})) {
    if (INSCRIPCION_RESERVED.includes(clave)) continue;
    if (typeof valor !== 'string') continue;
    for (const u of (valor.match(URL_RE) || [])) {
      if (IMG_EXT_RE.test(u)) urls.push(u);
    }
  }
  return urls;
}

// "Obra por link": la respuesta trae el link a una obra de ADD (post?id=...) en
// lugar de haber seleccionado la obra desde el perfil.
function obraIdEnDatos(datos: any): string {
  for (const valor of Object.values(datos || {})) {
    if (typeof valor !== 'string') continue;
    const m = valor.match(/(?:post|obra)(?:\.html)?\?id=([a-fA-F0-9]{24})/);
    if (m) return m[1];
  }
  return '';
}

async function bajarImagen(url: string): Promise<{ data: Buffer; ext: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;
    const data = Buffer.from(await resp.arrayBuffer());
    if (!data.length || data.length > 30 * 1024 * 1024) return null;
    const ct = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    let ext = MIME_A_EXT[ct] || '';
    if (!ext) {
      const m = url.match(IMG_EXT_RE);
      ext = m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
    }
    return { data, ext };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function csvEscapar(v: any): string {
  const bruto = (v === null || v === undefined) ? '' : String(v);
  const plano = bruto.split(String.fromCharCode(10)).join(' ').split(String.fromCharCode(13)).join(' ');
  return '"' + plano.split('"').join('""').trim() + '"';
}

router.get('/:id/descargar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const oportunidad: any = await Oportunidad.findById(req.params.id);
    if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });

    const esGestor =
      oportunidad.creador.toString() === req.user!.id ||
      req.user!.role === 'ADMINISTRADOR' ||
      req.user!.role === 'ADMIN';
    const esViewer = (oportunidad.accesoPostulantes || [])
      .some((id: any) => (id?._id || id).toString() === req.user!.id);

    if (!esGestor && !esViewer) return res.status(403).json({ error: 'No autorizado' });

    const inscripciones: any[] = await Inscripcion.find({ oportunidad: oportunidad._id })
      .populate('obra')
      .sort({ createdAt: -1 });

    const usuarios = await User.find({ _id: { $in: inscripciones.map(i => i.usuario) } })
      .select('_id username displayName email');
    const usuarioMap = new Map(usuarios.map(u => [u._id.toString(), u]));

    // Columnas dinámicas: los mismos campos que definió el creador en el formulario
    const params = (oportunidad.parametrosPresentacion || []).filter((p: any) => p && p.key);
    const claves: string[] = [];
    params.forEach((p: any) => { if (!claves.includes(p.key)) claves.push(p.key); });
    inscripciones.forEach(insc => {
      Object.keys(insc.datos || {}).forEach(k => {
        if (!INSCRIPCION_RESERVED.includes(k) && !claves.includes(k)) claves.push(k);
      });
    });
    const etiquetas = claves.map(k => {
      const p = params.find((x: any) => x.key === k);
      return p ? p.label : k.replace(/_/g, ' ');
    });

    const filas: string[] = [
      ['#', 'Nombre de la obra', 'Artista', 'Usuario', 'Email', 'Descripción de la obra',
        'Imagen (URL)', 'Video (URL)', 'Subido el', ...etiquetas, 'Mensaje',
        'Aceptada por el curador', 'Archivo de imagen'].map(csvEscapar).join(';'),
    ];

    const imagenesZip: { name: string; data: Buffer }[] = [];
    const vistos = new Set<string>();
    const usados = new Set<string>();
    const avisos: string[] = [];
    const MAX_IMAGENES = 120;
    const MAX_BYTES = 150 * 1024 * 1024;
    let imagenesOk = 0;
    let bytesTotales = 0;

    for (let idx = 0; idx < inscripciones.length; idx++) {
      const insc = inscripciones[idx];
      const usuario: any = usuarioMap.get(insc.usuario.toString()) || {};
      const obra: any = insc.obra || {};
      const artista = usuario.displayName || usuario.username || '';

      // Obra "por link": si no eligió una obra del perfil pero escribió el link
      // a una obra de ADD, se usa su ficha para el nombre/imagen/descripción.
      let obraLink: any = null;
      if (!obra._id && !insc.datos?.obraId) {
        const linkId = obraIdEnDatos(insc.datos);
        if (linkId) {
          try {
            obraLink = await Post.findById(linkId).select('title imageUrl description youtube_video');
          } catch {
            obraLink = null;
          }
        }
      }

      const tituloObra = obra.title || insc.datos?.obraTitulo || obraLink?.title || '';

      const candidatas: string[] = [];
      const principal = obra.imageUrl || insc.datos?.obraImagen || obraLink?.imageUrl || '';
      if (principal) candidatas.push(principal);
      imagenUrlsDeDatos(insc.datos).forEach(u => { if (!candidatas.includes(u)) candidatas.push(u); });

      const archivos: string[] = [];
      for (const url of candidatas) {
        if (vistos.has(url)) continue;
        if (imagenesOk >= MAX_IMAGENES || bytesTotales >= MAX_BYTES) {
          avisos.push(`Omitida por límite de la descarga: ${url}`);
          continue;
        }
        const img = await bajarImagen(url);
        if (!img) {
          avisos.push(`No se pudo descargar: ${url}`);
          continue;
        }
        bytesTotales += img.data.length;

        const base = `${nombreArchivoSeguro(tituloObra, 55)} - ${nombreArchivoSeguro(artista, 35)}`;
        let nombre = `${base}.${img.ext}`;
        let n = 2;
        while (usados.has(nombre.toLowerCase())) {
          nombre = `${base} (${n}).${img.ext}`;
          n++;
        }
        usados.add(nombre.toLowerCase());
        vistos.add(url);
        imagenesZip.push({ name: nombre, data: img.data });
        archivos.push(nombre);
        imagenesOk++;
      }

      filas.push([
        idx + 1,
        tituloObra,
        artista,
        usuario.username || '',
        usuario.email || '',
        obra.description || insc.datos?.obraDescripcion || obraLink?.description || '',
        principal,
        obra.youtube_video || insc.datos?.obraYoutube || obraLink?.youtube_video || '',
        insc.createdAt ? new Date(insc.createdAt).toLocaleString('es-AR') : '',
        ...claves.map(k => (insc.datos || {})[k] ?? ''),
        insc.mensaje || '',
        ({ pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada' } as any)[insc.estado] || 'Pendiente',
        archivos.join(' | '),
      ].map(csvEscapar).join(';'));
    }

    const slug = nombreArchivoSeguro(oportunidad.titulo, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'inscriptos';
    const CRLF = String.fromCharCode(13, 10);
    const csv = Buffer.from(String.fromCharCode(0xFEFF) + filas.join(CRLF), 'utf8');

    const leeme = [
      `Planilla de inscriptos — ${oportunidad.titulo}`,
      `Generado: ${new Date().toLocaleString('es-AR')}`,
      '',
      `Archivo planilla-${slug}.csv : todas las postulaciones con sus datos (abre en Excel/Google Sheets).`,
      `Imágenes incluidas: ${imagenesOk}. Cada imagen se llama "<Nombre de la obra> - <Nombre del artista>".`,
      'Si una misma obra tiene varias imágenes, se agrega " (2)", " (3)"...',
      '',
      'La columna "Archivo de imagen" del CSV dice qué archivo corresponde a cada postulación.',
      avisos.length ? '' : '',
      avisos.length ? `Avisos (${avisos.length}):` : '',
      ...avisos.slice(0, 60),
    ].join(CRLF);

    const zip = buildZip([
      { name: `planilla-${slug}.csv`, data: csv },
      { name: 'LEEME.txt', data: Buffer.from(leeme, 'utf8') },
      ...imagenesZip,
    ]);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="planilla-${slug}.zip"`);
    res.setHeader('Content-Length', String(zip.length));
    return res.send(zip);
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
    const withCocreadores = await hydrate(final, 'cocreadores');
    return res.json(withCocreadores);
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

