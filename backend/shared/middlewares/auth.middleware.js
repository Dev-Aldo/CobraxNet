import jwt from 'jsonwebtoken';

// Middleware para verificar el token JWT
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Acceso no autorizado. Token no proporcionado' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { userId: decoded.userId, username: decoded.username };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado', error: error.message });
  }
};

export default authMiddleware;
