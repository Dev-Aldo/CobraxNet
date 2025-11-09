import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

// Limitar tamaño de archivos a 10MB
const limits = {
  fileSize: 10 * 1024 * 1024 // 10MB
};

// Permitir cualquier tipo de archivo
const upload = multer({ 
  storage,
  limits,
  fileFilter: (req, file, cb) => {
    // Permitir imágenes, videos y otros archivos comunes
    const allowedTypes = [
      // Imágenes
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      // Videos
      'video/mp4', 'video/webm', 'video/quicktime',
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Texto
      'text/plain',
      // Comprimidos
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

export default upload;