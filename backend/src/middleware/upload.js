import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED = /\.(jpg|jpeg|png|webp|gif)$/i;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

function fileFilter(_req, file, cb) {
  if (ALLOWED.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpg, jpeg, png, webp, gif files are allowed'), false);
  }
}

const base = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export const uploadLogo        = base.single('logo');
export const uploadBrandImages = base.array('brand_images', 10);
export const uploadSingle      = base.single('image');
