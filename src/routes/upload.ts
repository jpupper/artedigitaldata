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

    // Generar la URL pública asumiendo que /img mapea a d:/Programacion/sistemasfullscreen/artedigitaldata/img
    // Usamos el hostname dinamico o un path relativo
    const relativeUrl = `/img/uploads/${req.file.filename}`;
    
    return res.json({ url: relativeUrl, public_id: req.file.filename });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
