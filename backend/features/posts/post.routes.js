import { Router } from 'express';
import authMiddleware from '../../shared/middlewares/auth.middleware.js';
import upload from '../../shared/middlewares/upload.middleware.js';
import {
  createPost,
  getAllPosts,
  getPostsByUser,
  getPostById,
  updatePost,
  deletePost,
  addComment,
  updateComment,
  deleteComment,
  reactToPost,
  removeReaction
} from './post.controller.js';

const router = Router();

// Posts
router.get('/', getAllPosts);
router.get('/user/:userId', getPostsByUser);
router.get('/:id', getPostById);
router.post(
  '/',
  authMiddleware,
  upload.array('media', 10), // hasta 10 archivos multimedia
  createPost
);
router.put('/:id', authMiddleware, upload.array('media', 10), updatePost);
router.delete('/:id', authMiddleware, deletePost);

// Comentarios
router.post('/:id/comment', authMiddleware, upload.single('image'), addComment);
router.put('/:id/comment/:commentId', authMiddleware, updateComment);
router.delete('/:id/comment/:commentId', authMiddleware, deleteComment);

// Reacciones
router.post('/:id/reaction', authMiddleware, reactToPost);
router.delete('/:id/reaction', authMiddleware, removeReaction);

export default router;
