import nodemailer from 'nodemailer';

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // usar SSL/TLS
  auth: {
    user: 'cobraxnet1@gmail.com',
    pass: 'cckj kioi cthk hjin'
  },
  tls: {
    // No verificar el certificado
    rejectUnauthorized: false
  }
});

// Función para enviar correo de verificación
const sendVerificationEmail = async (userEmail, verificationToken) => {
  // Emails deshabilitados en producción (Render bloquea SMTP)
  console.log('📧 Email de verificación deshabilitado temporalmente');
  console.log(`✅ El usuario ${userEmail} puede verificar su cuenta accediendo a: /verify/${verificationToken}`);
  return true;
};

export { sendVerificationEmail };
