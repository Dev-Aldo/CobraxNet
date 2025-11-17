import express from 'express';
import auth from '../../shared/middlewares/auth.middleware.js';
import upload from '../../shared/middlewares/upload.middleware.js';
import { 
  getAllProfiles,
  getMyProfile, 
  getProfileByUserId, 
  updateMyProfile, 
  updateAvatar, 
  updateCover,
  deleteAvatar,
  deleteCover
} from './profile.controller.js';

const router = express.Router();

// Obtener todos los perfiles
router.get('/all', auth, getAllProfiles);

// Obtener el perfil propio
router.get('/me', auth, getMyProfile);

// Editar el perfil propio (solo username)
router.put('/me', auth, updateMyProfile);

// Actualizar avatar (ANTES de /:userId para que no sea capturado como dinámico)
router.put('/avatar', auth, upload.single('avatar'), updateAvatar);

// Actualizar portada (ANTES de /:userId para que no sea capturado como dinámico)
router.put('/cover', auth, upload.single('cover'), updateCover);

// Eliminar avatar (restablecer a valor por defecto)
router.delete('/avatar', auth, deleteAvatar);

// Eliminar portada (restablecer a valor por defecto)
router.delete('/cover', auth, deleteCover);

// Obtener el perfil de otro usuario por su ID (AL FINAL - rutas dinámicas últimas)
router.get('/:userId', auth, getProfileByUserId);

export default router;