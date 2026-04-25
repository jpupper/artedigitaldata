import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function getSubfolder(req: any): string {
  const referer = req.headers.referer || '';
  if (referer.includes('profile')) return 'profiles';
  if (referer.includes('recurso')) return 'recursos';
  if (referer.includes('evento')) return 'eventos';
  if (referer.includes('create') || referer.includes('post') || referer.includes('obras') || referer.includes('concurso')) return 'posts';
  return 'general';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = getSubfolder(req);
    // Usar process.cwd() asegura apuntar a la raíz del proyecto, evitando el bug de __dirname en la compilación /dist
    const uploadDir = path.join(process.cwd(), 'img', 'uploads', subfolder);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 10 * 1024 * 1024 } 
});

router.post('/', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió ningún archivo' });

    // Determinar la subcarpeta
    const subfolder = getSubfolder(req);

    // Usar protocol dinámico y el host verdadero del servidor NodeJS / VPS
    let host = req.get('host') || 'vps-4455523-x.dattaweb.com';
    let protocol = req.headers['x-forwarded-proto'] || req.protocol;
    
    // Forzar que si se ejecuta desde local test, se devuelva la IP/URL del VPS
    // para cumplir con el requisito de "siempre se tienen que tomar desde el VPS"
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      host = 'vps-4455523-x.dattaweb.com';
      protocol = 'https';
    }

    // Generar la URL absoluta a la imagen
    const absoluteUrl = `${protocol}://${host}/artedigitaldata/img/uploads/${subfolder}/${req.file.filename}`;
    
    return res.json({ url: absoluteUrl, public_id: req.file.filename });
  } catch (err: any) {
    console.error('[Upload Error]', err);
    return res.status(500).json({ error: 'Error interno en el servidor de carga: ' + err.message });
  }
});

// Middleware para capturar errores de Multer (como tamaño de archivo)
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
