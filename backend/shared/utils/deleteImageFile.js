import { deleteFromCloudinary, extractPublicIdFromUrl } from './cloudinaryService.js';

export async function deleteImageFile(imageUrl, resourceType = 'image') {
  try {
    // Extraer public_id de la URL de Cloudinary
    const publicId = extractPublicIdFromUrl(imageUrl);
    
    if (!publicId) {
      console.warn('No se pudo extraer public_id de:', imageUrl);
      return false;
    }

    // Eliminar de Cloudinary
    await deleteFromCloudinary(publicId, resourceType);
    return true;
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    return false;
  }
}
