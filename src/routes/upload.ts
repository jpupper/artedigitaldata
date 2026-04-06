import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Asegurarse de que el directorio existe
const uploadDir = path.join(__dirname, '..', '..', 'img', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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
    const absoluteUrl = `${protocol}://${host}/artedigitaldata/img/uploads/${req.file.filename}`;
    
    return res.json({ url: absoluteUrl, public_id: req.file.filename });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
