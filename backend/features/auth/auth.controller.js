import User from './auth.model.js';
import PendingUser from './pending-user.model.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '../../shared/utils/emailService.js';
import Profile from '../profile/profile.model.js';

// Cache de tokens procesados recientemente (se limpia cada hora)
const processedTokens = new Map();

// Limpiar tokens procesados cada hora
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [token, timestamp] of processedTokens) {
    if (timestamp < oneHourAgo) {
      processedTokens.delete(token);
    }
  }
}, 3600000);

// Controlador para verificar el correo electrónico y completar el registro
export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    console.log('Intentando verificar token:', token);

    // Verificar si el token ya fue procesado
    if (processedTokens.has(token)) {
      return res.status(200).json({
        message: 'Email ya verificado. Ya puedes iniciar sesión.',
        alreadyProcessed: true
      });
    }
    
    // Buscar el usuario pendiente con el token de verificación
    const pendingUser = await PendingUser.findOne({ verificationToken: token });
    
    console.log('Usuario pendiente encontrado:', pendingUser ? 'Sí' : 'No');

    if (!pendingUser) {
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ email: pendingUser?.email });
      if (existingUser) {
        processedTokens.set(token, Date.now());
        return res.status(200).json({ 
          message: 'Esta cuenta ya ha sido verificada',
          alreadyProcessed: true
        });
      }
      return res.status(400).json({ 
        message: 'Token de verificación inválido o expirado'
      });
    }

    console.log('Datos del usuario pendiente:', {
      username: pendingUser.username,
      email: pendingUser.email,
      tokenCreatedAt: pendingUser.createdAt
    });

    // Crear el usuario verificado y evitar el doble hash
    const newUser = new User({
      username: pendingUser.username,
      email: pendingUser.email,
      isVerified: true // Marcar como verificado
    });

    // Asignar la contraseña directamente para evitar el doble hash
    newUser.$set('password', pendingUser.password);
    
    // Guardar el usuario
    await newUser.save();

    console.log('Usuario creado:', {
      id: newUser._id,
      username: newUser.username
    });

    // Crear el perfil asociado
    await Profile.create({
      user: newUser._id,
      username: newUser.username
    });

    console.log('Perfil creado exitosamente');

    // Eliminar el usuario pendiente después de crear el usuario real
    await PendingUser.findByIdAndDelete(pendingUser._id);

    res.status(200).json({
      message: 'Email verificado correctamente. Ya puedes iniciar sesión.',
      user: { id: newUser._id, username: newUser.username, email: newUser.email }
    });
  } catch (error) {
    console.error('Error durante la verificación:', error);
    // Si hay un error, intentamos eliminar el usuario pendiente si existe
    if (pendingUser && pendingUser._id) {
      try {
        await PendingUser.findByIdAndDelete(pendingUser._id);
      } catch (cleanupError) {
        console.error('Error al limpiar usuario pendiente:', cleanupError);
      }
    }
    res.status(500).json({
      message: 'Error al verificar el email',
      error: error.message
    });
  }
};

// Controlador para iniciar el proceso de registro
export const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Verificar que el correo tenga el dominio @cbtis258.edu.mx
    if (!email.endsWith('@cbtis258.edu.mx')) {
      return res.status(400).json({ message: 'El correo debe ser del dominio @cbtis258.edu.mx' });
    }

    // Verificar si el correo ya está en uso (en usuarios activos o pendientes)
    const existingUser = await User.findOne({ email });
    const pendingUser = await PendingUser.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }
    
    if (pendingUser) {
      return res.status(400).json({ message: 'Ya existe una solicitud de registro pendiente para este correo' });
    }

    // Generar token de verificación (16 bytes = 32 caracteres hex)
    const verificationToken = crypto.randomBytes(16).toString('hex');

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario directamente verificado (emails deshabilitados)
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isVerified: true // Verificado directamente
    });

    await newUser.save();

    // Crear el perfil asociado
    await Profile.create({
      user: newUser._id,
      username: newUser.username
    });

    res.status(200).json({
      message: 'Registro completado. Ya puedes iniciar sesión.',
      user: { id: newUser._id, username: newUser.username, email: newUser.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar el registro', error: error.message });
  }
};

// Controlador para iniciar sesión
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Intento de login para:', email);

    // Verificar que el correo tenga el dominio @cbtis258.edu.mx
    if (!email.endsWith('@cbtis258.edu.mx')) {
      return res.status(400).json({ message: 'El correo debe ser del dominio @cbtis258.edu.mx' });
    }

    // Buscar el usuario por correo
    const user = await User.findOne({ email });
    console.log('Usuario encontrado:', user ? 'Sí' : 'No');
    
    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    // Verificar la contraseña
    const isValid = await user.isPasswordValid(password);
    console.log('Contraseña válida:', isValid ? 'Sí' : 'No');
    
    if (!isValid) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    // Crear el token JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Inicio de sesión exitoso', token });
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  }
};