import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { response } from '../../../utils/index.js';

const uploadDir = path.resolve(process.cwd(), 'uploads/menu');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/jfif'];
  if (!allowedMimes.includes(file.mimetype)) {
    const error = new Error('Invalid file type. Only JPEG and PNG are allowed.');
    error.status = 400;
    return cb(error, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export const uploadSingle = (fieldName) => {
  const single = upload.single(fieldName);
  return (req, res, next) => {
    single(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return response(res, 400, 'File size exceeds maximum allowed limit (5 MB)', null);
          }
          return response(res, 400, err.message, null);
        }
        if (err.status === 400) {
          return response(res, 400, err.message, null);
        }
        return next(err);
      }
      next();
    });
  };
};

export default upload;
