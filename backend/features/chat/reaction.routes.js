import express from 'express';
import { addReaction } from './reaction.controller.js';
import authMiddleware from '../../shared/middlewares/auth.middleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Agregar/actualizar reacción a un mensaje
router.post('/:groupId/messages/:messageId/reaction', addReaction);

export default router;