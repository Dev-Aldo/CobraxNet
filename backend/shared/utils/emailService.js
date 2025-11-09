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
  try {
    const mailOptions = {
      from: 'cobraxnet1@gmail.com',
      to: userEmail,
      subject: 'Verifica tu cuenta de CobraxNet',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:logo" alt="Logo" style="width: 150px; height: auto;"/>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; text-align: center;">
            <h1 style="color: #333; margin-bottom: 20px;">¡Bienvenido a CobraxNet!</h1>
            
            <p style="color: #666; margin-bottom: 30px; font-size: 16px;">
              Gracias por registrarte. Para completar tu registro y comenzar a usar nuestra plataforma,
              por favor verifica tu cuenta haciendo clic en el botón de abajo.
            </p>
            
            <a href="http://localhost:5173/verify/${verificationToken}"
               style="display: inline-block; background-color: #4CAF50; color: white; 
                      padding: 14px 28px; text-decoration: none; border-radius: 5px;
                      font-size: 16px; font-weight: bold; margin: 20px 0;">
              Sí, soy yo - Verificar cuenta
            </a>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Si no creaste una cuenta en Social Network CBTis, puedes ignorar este correo.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} Social Network CBTis. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: 'logo.png',
        path: 'C:/Users/aldoa/Documents/social-network-cbtis-copia 2/frontend/public/logo.png',
        cid: 'logo'
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw error;
  }
};

export { sendVerificationEmail };
