import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';

const uploadDir = path.isAbsolute(ENV.UPLOAD_DIR)
  ? ENV.UPLOAD_DIR
  : path.join(process.cwd(), ENV.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 + 1024, // 25 MB max limit (+ framing buffer to prevent premature boundary truncation)
  },
  fileFilter: (_req, file, cb) => {
    // Allowed extensions: pdf, docs, archives, images, text, code
    const allowed = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|tar|gz|png|jpg|jpeg|gif|txt|csv|py|js|ts|tsx|jsx|cpp|java|ipynb|html|css|json)$/i;
    if (file.originalname.match(allowed)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload academic documents, archives, or code files.'));
    }
  },
});
