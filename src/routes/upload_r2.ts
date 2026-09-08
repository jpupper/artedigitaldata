import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import sharp from 'sharp';
import { uploadToR2 } from '../utils/r2';

const router = Router();

const FSCAUTH_URL = process.env.FSC_AUTH_API || 'http://localhost:3027/fscauth';

function getSubfolder(req: any): string {
  const referer = req.headers.referer || '';
  if (referer.includes('profile')) return 'profiles';
  if (referer.includes('recurso')) return 'recursos';
  if (referer.includes('evento')) return 'eventos';
  if (referer.includes('create') || referer.includes('post') || referer.includes('obras') || referer.includes('concurso')) return 'posts';
  return 'general';
}

// Usar memoryStorage para guardar en R2 en lugar de disco local
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió ningún archivo' });

    const { rotate, crop } = req.body;
    let image = sharp(req.file.buffer);

    if (rotate) {
      const angle = parseInt(rotate, 10);
      if (!isNaN(angle)) {
        image = image.rotate(angle);
      }
    }

    if (crop) {
      try {
        const cropOptions = JSON.parse(crop);
        if (cropOptions.left !== undefined && cropOptions.top !== undefined && cropOptions.width !== undefined && cropOptions.height !== undefined) {
          image = image.extract({ 
            left: parseInt(cropOptions.left, 10), 
            top: parseInt(cropOptions.top, 10), 
            width: parseInt(cropOptions.width, 10), 
            height: parseInt(cropOptions.height, 10) 
          });
        }
      } catch (e) {
        console.warn('Invalid crop JSON:', e);
      }
    }

    // Procesar la imagen con sharp
    const processedBuffer = await image.toBuffer();
    
    // Determinar la subcarpeta
    const subfolder = getSubfolder(req);
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `${uuidv4()}${ext}`;

    // Subir a R2
    const result = await uploadToR2(
      processedBuffer,
      filename,
      req.file.mimetype || 'image/jpeg',
      'artedigitaldata',
      subfolder
    );
    
    const absoluteUrl = result.url;
    const publicId = result.id;

    // Registrar imagen en FSCAUTH para el panel central
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const registerRes = await fetch(`${FSCAUTH_URL}/api/assets/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            application: 'artedigitaldata',
            publicId,
            url: absoluteUrl,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: processedBuffer.length
          })
        });
        const registerData: any = await registerRes.json();
        console.log(`[UPLOAD] Asset registrado en FSCAUTH: ${registerData.success ? 'OK' : 'FAILED'}`);
      }
    } catch (regErr) {
      console.warn('[UPLOAD] Error registrando en FSCAUTH (no crítico):', regErr);
    }

    return res.json({ url: absoluteUrl, public_id: publicId });
  } catch (err: any) {
    console.error('[Upload Error]', err);
    return res.status(500).json({ error: 'Error interno en el servidor de carga: ' + err.message });
  }
});

// Middleware para capturar errores de Multer
router.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'La imagen es demasiado grande. Máximo 10MB.' });
    }
    return res.status(400).json({ error: 'Error de Multer: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
