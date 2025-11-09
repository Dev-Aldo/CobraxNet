import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Definir el esquema del usuario
const userSchema = new mongoose.Schema({
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
  avatar: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  }
});

// Middleware para hacer hash del password antes de guardar
userSchema.pre('save', async function (next) {
  try {
    // Si el password no ha sido modificado o ya está hasheado, no lo hasheamos
    if (!this.isModified('password')) return next();
    
    // Verificar si la contraseña ya está hasheada
    if (this.password.length === 60 && this.password.startsWith('$2')) {
      return next();
    }

    console.log('Hasheando contraseña para:', this.email);
    // Hashear el password
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    console.error('Error al hashear contraseña:', error);
    next(error);
  }
});

// Método para validar la contraseña
userSchema.methods.isPasswordValid = async function(password) {
  try {
    console.log('Validando contraseña para:', this.email);
    console.log('Longitud del hash almacenado:', this.password.length);
    console.log('Primeros caracteres del hash:', this.password.substring(0, 10) + '...');
    
    // Si la contraseña almacenada no parece un hash bcrypt
    if (!this.password.startsWith('$2')) {
      console.log('La contraseña almacenada no parece un hash bcrypt válido');
      return false;
    }

    const isValid = await bcrypt.compare(password, this.password);
    console.log('Resultado de la validación:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error al validar contraseña:', error);
    return false;
  }
};

// Método para validar el password
userSchema.methods.isPasswordValid = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Exportar el modelo
const User = mongoose.model('User', userSchema);
export default User;