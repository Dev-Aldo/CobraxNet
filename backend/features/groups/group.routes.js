import express from 'express';
import * as groupController from './group.controller.js';
import authMiddleware from '../../shared/middlewares/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Configuración de multer para subir imágenes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Rutas públicas
router.get('/', groupController.getAllGroups);
router.get('/:groupId', authMiddleware, groupController.getGroupById);

// Rutas protegidas
router.post('/', authMiddleware, upload.single('avatar'), groupController.createGroup);
router.put('/:groupId', authMiddleware, upload.single('avatar'), groupController.updateGroup);
router.delete('/:groupId', authMiddleware, groupController.deleteGroup);

// Rutas para membresía
router.post('/:groupId/join', authMiddleware, groupController.joinGroup);
router.delete('/:groupId/leave', authMiddleware, groupController.leaveGroup);
router.put('/:groupId/members/:userId/role', authMiddleware, groupController.changeRole);
// Expulsar miembro de un grupo
router.delete('/:groupId/members/:userId', authMiddleware, groupController.removeMember);
router.delete('/:groupId/members/:userId', authMiddleware, groupController.removeMember);

// Rutas para posts en grupos (múltiples archivos)
router.post('/:groupId/posts', authMiddleware, upload.array('media'), groupController.createGroupPost);
router.get('/:groupId/posts', authMiddleware, groupController.getGroupPosts);
// Editar post de grupo
router.put('/:groupId/posts/:postId', authMiddleware, upload.array('media'), groupController.editGroupPost);
// Eliminar post de grupo
router.delete('/:groupId/posts/:postId', authMiddleware, groupController.deleteGroupPost);

// Rutas para reacciones en posts de grupo
router.post('/:groupId/posts/:postId/reaction', authMiddleware, groupController.addGroupPostReaction);
router.delete('/:groupId/posts/:postId/reaction', authMiddleware, groupController.removeGroupPostReaction);

// Rutas para comentarios en posts de grupo
router.post('/:groupId/posts/:postId/comment', authMiddleware, upload.single('file'), groupController.addGroupPostComment);
router.put('/:groupId/posts/:postId/comment/:commentId', authMiddleware, groupController.editGroupPostComment);
router.delete('/:groupId/posts/:postId/comment/:commentId', authMiddleware, groupController.deleteGroupPostComment);

// Ruta para obtener los grupos del usuario actual
router.get('/user/me', authMiddleware, groupController.getMyGroups);

export default router;