import fs from 'fs';

export function deleteImageFile(imageUrl) {
  // Extrae el nombre del archivo de la URL
  const match = imageUrl.match(/\/uploads\/(.+)$/);
  if (!match) return;
  const filename = match[1];
  const filePath = `uploads/${filename}`;
  fs.unlink(filePath, err => {
    if (err) {
      // No lanzar error si no existe
      if (err.code !== 'ENOENT') console.error('Error al eliminar imagen:', filePath, err);
    }
  });
}
