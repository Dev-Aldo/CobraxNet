import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
	title: {
		type: String,
		required: [true, 'El nombre del producto es obligatorio'],
		trim: true,
		maxlength: [100, 'El nombre no debe exceder los 100 caracteres']
	},
	description: {
		type: String,
		required: [true, 'La descripción es obligatoria'],
		maxlength: [500, 'La descripción no debe exceder los 500 caracteres']
	},
	price: {
		type: Number,
		required: [true, 'El precio es obligatorio'],
		min: [0, 'El precio no puede ser negativo']
	},
	images: [{ type: String }], // URLs de imágenes
	category: {
		type: String,
		default: 'General',
		trim: true
	},
	contact: {
		type: String,
		required: [true, 'El contacto es obligatorio']
	},
	seller: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
});

const Product = mongoose.model('Product', productSchema);
export default Product;
