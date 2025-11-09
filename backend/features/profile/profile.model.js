import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  username: { type: String, required: true, unique: true },
  avatar: { type: String, default: '' },      // URL de la foto de perfil
  cover: { type: String, default: '' },       // URL de la portada
  biography: { type: String, default: '', maxlength: [500, 'La biografía no debe exceder los 500 caracteres'] },
  pronombre: { type: String, default: '' },
  carrera: { type: String, default: '' },
  semestre: { type: String, default: '' },
  redesSociales: {
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' }
  },
  amigos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Profile', profileSchema);