import Product from './marketplace.model.js';
import { deleteImageFile } from '../../shared/utils/deleteImageFile.js';
import { uploadToCloudinary } from '../../shared/utils/cloudinaryService.js';

// Crear producto
export const createProduct = async (req, res) => {
	try {
		const { title, description, price, category, contact } = req.body;
		let images = [];
		
		if (req.files && req.files.length > 0) {
			for (const file of req.files) {
				const fileName = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
				const result = await uploadToCloudinary(file.buffer, 'products', fileName, 'image');
				images.push(result.secure_url);
			}
		}
		
		const product = new Product({
			title,
			description,
			price,
			category,
			contact,
			images,
			seller: req.user.userId
		});
		await product.save();
		res.status(201).json(product);
	} catch (error) {
		res.status(500).json({ message: 'Error al crear el producto', error: error.message });
	}
};

// Obtener todos los productos (con paginación y filtro opcional por categoría)
export const getAllProducts = async (req, res) => {
	try {
		const { page = 1, limit = 10, category = '' } = req.query;
		const filter = category ? { category } : {};
		const total = await Product.countDocuments(filter);
		const products = await Product.find(filter)
			.populate('seller', 'username email avatar')
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));
		res.status(200).json({ products, total, page, pages: Math.ceil(total / limit) });
	} catch (error) {
		res.status(500).json({ message: 'Error al obtener productos', error: error.message });
	}
};

// Obtener producto por ID
export const getProductById = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id).populate('seller', 'username email avatar');
		if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
		res.status(200).json(product);
	} catch (error) {
		res.status(500).json({ message: 'Error al obtener el producto', error: error.message });
	}
};

// Actualizar producto (solo el vendedor puede)
export const updateProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
		if (product.seller.toString() !== req.user.userId) {
			return res.status(403).json({ message: 'No tienes permiso para editar este producto' });
		}
		const { title, description, price, category, contact } = req.body;
		if (title) product.title = title;
		if (description) product.description = description;
		if (price) product.price = price;
		if (category) product.category = category;
		if (contact) product.contact = contact;

		// Procesar imágenes a eliminar
		let imagesToDelete = [];
		if (req.body.imagesToDelete) {
			try {
				imagesToDelete = JSON.parse(req.body.imagesToDelete);
			} catch {}
		}
		if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
			// Eliminar del array y de Cloudinary
			product.images = product.images.filter(img => !imagesToDelete.includes(img));
			for (const imgUrl of imagesToDelete) {
				await deleteImageFile(imgUrl, 'image');
			}
		}

		// Agregar nuevas imágenes
		if (req.files && req.files.length > 0) {
			for (const file of req.files) {
				const fileName = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
				const result = await uploadToCloudinary(file.buffer, 'products', fileName, 'image');
				product.images.push(result.secure_url);
			}
		}

		await product.save();
		res.status(200).json(product);
	} catch (error) {
		res.status(500).json({ message: 'Error al actualizar el producto', error: error.message });
	}
};

// Eliminar producto (solo el vendedor puede)
export const deleteProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
		if (product.seller.toString() !== req.user.userId) {
			return res.status(403).json({ message: 'No tienes permiso para eliminar este producto' });
		}
		await product.deleteOne();
		res.status(200).json({ message: 'Producto eliminado correctamente' });
	} catch (error) {
		res.status(500).json({ message: 'Error al eliminar el producto', error: error.message });
	}
};
