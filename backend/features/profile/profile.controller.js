import Profile from './profile.model.js';
import User from '../auth/auth.model.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../../shared/utils/cloudinaryService.js';

// Obtener todos los perfiles de usuarios
export const getAllProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find().lean();
    
    // Obtener información de avatar para cada perfil
    const profilesWithAvatars = await Promise.all(
      profiles.map(async (profile) => {
        const user = await User.findById(profile.user).lean();
        return {
          ...profile,
          avatar: user?.avatar || '',
        };
      })
    );
    
    res.status(200).json(profilesWithAvatars);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los perfiles', error: error.message });
  }
};

// Obtener el perfil propio
export const getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.userId }).lean();
    if (!profile) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }
    // Busca el usuario para traer el avatar
    const user = await User.findById(req.user.userId).lean();
    // Devuelve el perfil junto con el avatar y el email
    res.status(200).json({
      ...profile,
      avatar: user?.avatar || '',
      email: user?.email || '',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el perfil', error: error.message });
  }
};

// Obtener el perfil de otro usuario por su ID
export const getProfileByUserId = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.userId }).lean();
    if (!profile) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }
    // Busca el usuario para traer el avatar y el email
    const user = await User.findById(req.params.userId).lean();
    res.status(200).json({
      ...profile,
      avatar: user?.avatar || '',
      email: user?.email || '',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el perfil', error: error.message });
  }
};

// Editar el perfil propio (username, pronombre, biografía, carrera, semestre, redesSociales)
export const updateMyProfile = async (req, res) => {
  try {
    const { username, pronombre, biography, carrera, semestre, redesSociales } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { user: req.user.userId },
      { username, pronombre, biography, carrera, semestre, redesSociales },
      { new: true }
    );
    if (!profile) {
      return res.status(404).json({ message: 'Perfil no encontrado' });
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el perfil', error: error.message });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (req.file) {
      // Eliminar avatar anterior si existe
      if (user.avatar) {
        const publicId = extractPublicIdFromUrl(user.avatar);
        if (publicId) {
          await deleteFromCloudinary(publicId, 'image');
        }
      }

      // Subir nuevo avatar a Cloudinary
      const fileName = `avatar_${req.user.userId}_${Date.now()}`;
      const result = await uploadToCloudinary(req.file.buffer, 'profiles', fileName, 'image');
      user.avatar = result.secure_url;
      await user.save();
      return res.json({ avatar: user.avatar });
    }
    res.status(400).json({ message: 'No se subió ninguna imagen' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar avatar' });
  }
};

export const updateCover = async (req, res) => {
  try {
    let coverUrl = '';
    
    if (req.file) {
      // Subir cover a Cloudinary
      const fileName = `cover_${req.user.userId}_${Date.now()}`;
      const result = await uploadToCloudinary(req.file.buffer, 'profiles', fileName, 'image');
      coverUrl = result.secure_url;

      // Eliminar cover anterior si existe
      const profile = await Profile.findOne({ user: req.user.userId });
      if (profile && profile.cover) {
        const publicId = extractPublicIdFromUrl(profile.cover);
        if (publicId) {
          await deleteFromCloudinary(publicId, 'image');
        }
      }
    }

    const profile = await Profile.findOneAndUpdate(
      { user: req.user.userId },
      { cover: coverUrl },
      { new: true }
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar portada', error: error.message });
  }
};


export const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Elimina el avatar de Cloudinary si existe
    if (user.avatar) {
      const publicId = extractPublicIdFromUrl(user.avatar);
      if (publicId) {
        await deleteFromCloudinary(publicId, 'image');
      }
    }

    user.avatar = null;
    await user.save();

    res.json({ message: 'Avatar eliminado', avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar avatar' });
  }
};

export const deleteCover = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.userId });
    if (!profile) return res.status(404).json({ message: 'Perfil no encontrado' });

    // Elimina el cover de Cloudinary si existe
    if (profile.cover) {
      const publicId = extractPublicIdFromUrl(profile.cover);
      if (publicId) {
        await deleteFromCloudinary(publicId, 'image');
      }
    }

    profile.cover = '';
    await profile.save();

    res.json({ message: 'Portada eliminada', cover: profile.cover });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar portada' });
  }
};