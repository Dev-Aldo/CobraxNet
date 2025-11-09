import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'El nombre de usuario es obligatorio'],
    minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
    maxlength: [20, 'El nombre de usuario no debe exceder los 20 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El correo electrónico es obligatorio'],
    unique: true,
    match: [/.+@cbtis258\.edu\.mx$/, 'El correo debe ser del dominio @cbtis258.edu.mx']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
  },
  verificationToken: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // El documento se eliminará automáticamente después de 24 horas
  }
});

export default mongoose.model('PendingUser', pendingUserSchema);