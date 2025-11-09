import express from 'express';
import { register, login, verifyEmail } from './auth.controller.js';

const router = express.Router();

// Ruta para registrar un usuario
router.post('/register', register);

// Ruta para iniciar sesión
router.post('/login', login);

// Ruta para verificar el correo electrónico
router.get('/verify/:token', verifyEmail);

export default router;