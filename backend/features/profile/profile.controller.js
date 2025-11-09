import Profile from './profile.model.js';
import User from '../auth/auth.model.js';
import fs from 'fs';
import path from 'path';

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
      user.avatar = `/uploads/${req.file.filename}`;
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
    const url = req.file ? `/uploads/${req.file.filename}` : '';
    const profile = await Profile.findOneAndUpdate(
      { user: req.user.userId },
      { cover: url },
      { new: true }
    );
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar portada', error: error.message });
  }
};

const DEFAULT_AVATAR = '/uploads/default-avatar.png';
const DEFAULT_COVER = '/uploads/default-cover.jpg';

function deleteFileIfExists(filePath) {
  // Evita borrar el archivo por defecto
  if (
    filePath &&
    !filePath.endsWith('default-avatar.png') &&
    !filePath.endsWith('default-cover.jpg')
  ) {
    const absolutePath = path.join(process.cwd(), 'backend', filePath);
    fs.unlink(absolutePath, err => {
      // No lanzar error si no existe
    });
  }
}

export const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Elimina el archivo anterior si no es el predeterminado
    deleteFileIfExists(user.avatar);

    user.avatar = DEFAULT_AVATAR;
    await user.save();

    res.json({ message: 'Avatar restablecido', avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ message: 'Error al restablecer avatar' });
  }
};

export const deleteCover = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.userId });
    if (!profile) return res.status(404).json({ message: 'Perfil no encontrado' });

    // Elimina el archivo anterior si no es el predeterminado
    deleteFileIfExists(profile.cover);

    profile.cover = DEFAULT_COVER;
    await profile.save();

    res.json({ message: 'Portada restablecida', cover: profile.cover });
  } catch (err) {
    res.status(500).json({ message: 'Error al restablecer portada' });
  }
};