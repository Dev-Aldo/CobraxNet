import express from 'express';
import { getGroupMessages, sendGroupMessage, deleteGroupMessage, editGroupMessage } from './group-chat.controller.js';
import { addReaction, removeReaction } from './reaction.controller.js';
import authMiddleware from '../../shared/middlewares/auth.middleware.js';
import upload from '../../shared/middlewares/upload.middleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener mensajes de un grupo
router.get('/:groupId/messages', getGroupMessages);

// Enviar mensaje a un grupo (con archivos multimedia opcionales)
router.post('/:groupId/messages', upload.array('media', 10), sendGroupMessage);

// Eliminar mensaje de un grupo
router.delete('/:groupId/messages/:messageId', deleteGroupMessage);

// Editar mensaje de un grupo
router.patch('/:groupId/messages/:messageId', upload.array('media', 10), editGroupMessage);

// Agregar reacción a un mensaje
router.post('/:groupId/messages/:messageId/reaction', addReaction);

// Eliminar reacción de un mensaje
router.delete('/:groupId/messages/:messageId/reactions/:reaction', removeReaction);

export default router;