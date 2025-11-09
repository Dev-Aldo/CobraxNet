import { Router } from 'express';
import authMiddleware from '../../shared/middlewares/auth.middleware.js';
import upload from '../../shared/middlewares/upload.middleware.js';
import {
	createProduct,
	getAllProducts,
	getProductById,
	updateProduct,
	deleteProduct
} from './marketplace.controller.js';

const router = Router();

// Listar productos (público)
router.get('/', getAllProducts);
// Ver producto por ID (público)
router.get('/:id', getProductById);

// Crear producto (solo autenticado, permite varias imágenes)
router.post('/', authMiddleware, upload.array('images', 5), createProduct);
// Editar producto (solo vendedor, permite varias imágenes)
router.put('/:id', authMiddleware, upload.array('images', 5), updateProduct);
// Eliminar producto (solo vendedor)
router.delete('/:id', authMiddleware, deleteProduct);

export default router;
