// Middleware de manejo de errores
const errorMiddleware = (err, req, res, next) => {
  console.error('Error:', err); // Registrar el error en la consola para depuración
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack, // Mostrar el stack solo en desarrollo
  });
};

export default errorMiddleware;