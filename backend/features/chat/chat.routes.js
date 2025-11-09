
import express from 'express';
import { 
  getPrivateMessages, 
  sendPrivateMessage, 
  deletePrivateMessage,
  editPrivateMessage,
  addReaction
} from './chat.controller.js';
import authMiddleware from '../../shared/middlewares/auth.middleware.js';
import upload from '../../shared/middlewares/upload.middleware.js';

const router = express.Router();


// Obtener todos los mensajes privados entre el usuario autenticado y otro usuario
router.get('/:userId', authMiddleware, getPrivateMessages);

// Enviar un mensaje privado a un usuario (con archivos multimedia)
router.post('/message', authMiddleware, upload.array('media', 10), sendPrivateMessage);

// Eliminar un mensaje privado
router.delete('/:userId/:messageId', authMiddleware, deletePrivateMessage);

// Editar un mensaje privado (solo propietario)
router.patch('/:chatId/message/:messageId', authMiddleware, upload.array('media', 10), editPrivateMessage);

// Agregar/quitar reacción a un mensaje
router.post('/message/:messageId/reaction', authMiddleware, addReaction);

export default router;