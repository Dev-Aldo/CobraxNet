import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Subir un archivo a Cloudinary
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} folder - Carpeta en Cloudinary (ej: 'products', 'messages', 'profiles')
 * @param {string} fileName - Nombre del archivo (sin extensión preferentemente)
 * @param {string} resourceType - Tipo de recurso: 'image', 'video', 'auto' (por defecto: 'auto')
 * @returns {Promise} URL segura del recurso subido
 */
export const uploadToCloudinary = async (fileBuffer, folder, fileName, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `cobraxnet/${folder}`,
        public_id: fileName,
        overwrite: true,
        resource_type: resourceType,
        eager: [
          { width: 300, height: 300, crop: 'fill', quality: 'auto' }, // Thumbnail
          { width: 1200, height: 900, crop: 'fill', quality: 'auto' } // Preview
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            url: result.url,
            resourceType: result.resource_type,
            format: result.format
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Eliminar un recurso de Cloudinary por public_id
 * @param {string} publicId - Public ID del recurso en Cloudinary
 * @param {string} resourceType - Tipo de recurso: 'image', 'video', 'raw' (por defecto: 'image')
 * @returns {Promise} Resultado de la eliminación
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error al eliminar de Cloudinary:', error);
    throw error;
  }
};

/**
 * Extraer public_id de una URL de Cloudinary
 * @param {string} cloudinaryUrl - URL de Cloudinary
 * @returns {string} Public ID
 */
export const extractPublicIdFromUrl = (cloudinaryUrl) => {
  if (!cloudinaryUrl) return null;
  
  // Patrón: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
  const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.\w+$/);
  return match ? match[1] : null;
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl
};
