import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    default: '',
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Regresa a 'User'
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      emoji: { type: String, required: true }
    }
  ],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      imageUrl: String,
      publicId: String, // Para eliminación de Cloudinary
      createdAt: Date
    }
  ],
  media: [{
    url: { type: String },
    publicId: { type: String }, // Para eliminación de Cloudinary
    type: { type: String }, // image, video, file
    name: { type: String },
    mimetype: { type: String }
  }],
  fileUrl: { type: String }, // legacy, para compatibilidad
  images: [{ type: String }], // legacy, para compatibilidad
  isGroupPost: { type: Boolean, default: false } // indica si el post es de grupo
});

const Post = mongoose.model('Post', postSchema);
export default Post;
