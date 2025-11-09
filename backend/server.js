import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import { authRoutes } from './features/auth/index.js';
import { postRoutes } from './features/posts/index.js';
import { chatRoutes, groupChatRoutes } from './features/chat/index.js';
import { groupRoutes } from './features/groups/index.js';
import { notificationRoutes } from './features/notifications/index.js';
import { marketplaceRoutes } from './features/marketplace/index.js';
import authMiddleware from './shared/middlewares/auth.middleware.js';
import errorMiddleware from './shared/middlewares/error.middleware.js';
import profileRoutes from './features/profile/index.js';
import jwt from 'jsonwebtoken';

// Configurar dotenv
dotenv.config();

// Crear la app de Express
const app = express();
const httpServer = createServer(app);

// Configurar Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"], // URLs del frontend
    methods: ["GET", "POST"]
  }
});

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Conexión a la base de datos
connectDB();

// Rutas públicas
app.use('/api/v1/users', authRoutes);

// Rutas protegidas (requieren autenticación)
app.get('/api/v1/protected-route', authMiddleware, (req, res) => {
  res.json({ message: 'Acceso permitido', user: req.user });
});

// Ruta para posts
app.use('/api/v1/posts', postRoutes);

// Ruta para perfil
app.use('/api/v1/profile', profileRoutes);

// Ruta para grupos
app.use('/api/v1/groups', groupRoutes);

// Ruta para chat privado
app.use('/api/v1/chat', chatRoutes);

// Ruta para chat grupal
app.use('/api/v1/groups', groupChatRoutes);

// Ruta para notificaciones
app.use('/api/v1/notifications', notificationRoutes);

// Ruta para marketplace
app.use('/api/v1/marketplace', marketplaceRoutes);

// Middleware de manejo de errores
app.use(errorMiddleware);

// Middleware de autenticación para Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Autenticación requerida'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { userId: decoded.userId, username: decoded.username };
    next();
  } catch (error) {
    next(new Error('Token inválido'));
  }
});

// Configurar eventos de Socket.io
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.user.username}`);
  
  // Unirse a una sala privada entre dos usuarios
  socket.on('joinPrivateChat', async ({ userId }) => {
    try {
      // Sala única para los dos usuarios (ordenada para que sea igual para ambos)
      const ids = [socket.user.userId, userId].sort();
      const roomName = `private_${ids[0]}_${ids[1]}`;
      socket.join(roomName);
      socket.privateRoom = roomName;
    } catch (err) {
      console.error('Error al unirse a sala privada:', err);
    }
  });
  
  // Unirse a una sala de chat grupal
  socket.on('joinGroupChat', async ({ groupId }) => {
    try {
      const Group = (await import('./features/groups/group.model.js')).default;
      
      // Verificar que el usuario sea miembro del grupo
      const group = await Group.findById(groupId);
      if (!group) {
        return socket.emit('error', { message: 'Grupo no encontrado' });
      }
      
      const isMember = group.members.some(member => member.user.toString() === socket.user.userId);
      if (!isMember) {
        return socket.emit('error', { message: 'No eres miembro de este grupo' });
      }
      
      const roomName = `group-${groupId}`;
      socket.join(roomName);
      socket.groupRoom = roomName;
      console.log(`Usuario ${socket.user.username} se unió al chat del grupo ${groupId}`);
    } catch (err) {
      console.error('Error al unirse a sala grupal:', err);
      socket.emit('error', { message: 'Error al unirse al chat grupal' });
    }
  });

  // Escuchar mensajes del grupo
  socket.on('groupMessage', async ({ groupId, message }) => {
    try {
      // Emitir el mensaje a todos los miembros del grupo
      io.to(`group-${groupId}`).emit('groupMessage', message);
    } catch (error) {
      console.error('Error al enviar mensaje al grupo:', error);
      socket.emit('error', { message: 'Error al enviar mensaje al grupo' });
    }
  });
  
  // Escuchar nuevos mensajes privados
  socket.on('sendPrivateMessage', async (payload) => {
    try {
      const { content, to, _id } = payload || {};
      const Chat = (await import('./features/chat/chat.model.js')).default;
      const User = (await import('./features/auth/auth.model.js')).default;
      // Buscar o crear el chat privado entre los dos usuarios
      const ids = [socket.user.userId, to].sort();
      let chat = await Chat.findOne({ users: { $all: ids, $size: 2 } });
      if (!chat) {
        chat = new Chat({ users: ids, messages: [] });
      }
      // Si ya viene un mensaje persistido (tiene _id), solo retransmitir sin guardar de nuevo
      const roomName = `private_${ids[0]}_${ids[1]}`;
      if (_id) {
        io.to(roomName).emit('newMessage', payload);
        return;
      }

      // Crear y guardar un nuevo mensaje (solo texto desde socket)
      const newMessage = {
        sender: socket.user.userId,
        content,
        imageUrl: null, // El socket no maneja archivos, solo texto
        timestamp: new Date()
      };
      chat.messages.push(newMessage);
      await chat.save();
      const userInfo = await User.findById(socket.user.userId).select('username avatar');
      const savedMessage = chat.messages[chat.messages.length - 1];
      // Crear notificación para el destinatario
      const { createNotification } = await import('./features/notifications/notification.controller.js');
      await createNotification(
        to,
        socket.user.userId,
        'message',
        `${userInfo.username || socket.user.username} te envió un mensaje`,
        null,
        chat._id
      );

      // Emitir solo a la sala privada
      io.to(roomName).emit('newMessage', {
        _id: savedMessage._id,
        sender: {
          _id: socket.user.userId,
          username: userInfo.username || socket.user.username,
          avatar: userInfo.avatar || null
        },
        content: savedMessage.content,
        imageUrl: savedMessage.imageUrl || null,
        timestamp: savedMessage.timestamp
      });
    } catch (error) {
      console.error('Error al guardar el mensaje privado:', error);
    }
  });
  
  // Escuchar eliminación de mensajes privados
  socket.on('deletePrivateMessage', async ({ messageId, to }) => {
    try {
      const Chat = (await import('./features/chat/chat.model.js')).default;
      const ids = [socket.user.userId, to].sort();
      let chat = await Chat.findOne({ users: { $all: ids, $size: 2 } });
      if (!chat) {
        return socket.emit('error', { message: 'Chat privado no encontrado' });
      }
      const messageIndex = chat.messages.findIndex(msg => msg._id.toString() === messageId);
      if (messageIndex === -1) {
        return socket.emit('error', { message: 'Mensaje no encontrado' });
      }
      if (chat.messages[messageIndex].sender.toString() !== socket.user.userId) {
        return socket.emit('error', { message: 'No tienes permiso para eliminar este mensaje' });
      }
      chat.messages.splice(messageIndex, 1);
      await chat.save();
      const roomName = `private_${ids[0]}_${ids[1]}`;
      io.to(roomName).emit('messageDeleted', { messageId });
    } catch (error) {
      console.error('Error al eliminar el mensaje privado:', error);
      socket.emit('error', { message: 'Error al eliminar el mensaje privado' });
    }
  });
  
  // Enviar mensaje a un grupo
  socket.on('sendGroupMessage', async (payload) => {
    try {
      const { groupId, content, _id } = payload || {};
      const GroupChat = (await import('./features/chat/group-chat.model.js')).default;
      const Group = (await import('./features/groups/group.model.js')).default;
      const User = (await import('./features/auth/auth.model.js')).default;
      
      // Verificar que el grupo exista
      const group = await Group.findById(groupId);
      if (!group) {
        return socket.emit('error', { message: 'Grupo no encontrado' });
      }
      
      // Verificar que el usuario sea miembro del grupo
      const isMember = group.members.some(member => member.user.toString() === socket.user.userId);
      if (!isMember) {
        return socket.emit('error', { message: 'No eres miembro de este grupo' });
      }
      
      // Buscar o crear el chat del grupo
      let groupChat = await GroupChat.findOne({ group: groupId });
      if (!groupChat) {
        groupChat = new GroupChat({ group: groupId, messages: [] });
      }
      
      const roomName = `group_${groupId}`;

      // Si viene un mensaje ya persistido (desde HTTP), solo retransmitir
      if (_id) {
        io.to(roomName).emit('groupMessage', payload);
        return;
      }

      // Crear el nuevo mensaje (solo texto vía socket)
      const newMessage = {
        sender: socket.user.userId,
        content,
        timestamp: new Date()
      };
      
      groupChat.messages.push(newMessage);
      await groupChat.save();
      
      const userInfo = await User.findById(socket.user.userId).select('username avatar');
      const savedMessage = groupChat.messages[groupChat.messages.length - 1];
      
      // Emitir a todos los miembros del grupo
      io.to(roomName).emit('groupMessage', {
        _id: savedMessage._id,
        sender: {
          _id: socket.user.userId,
          username: userInfo.username || socket.user.username,
          avatar: userInfo.avatar || null
        },
        content,
        timestamp: newMessage.timestamp
      });
    } catch (error) {
      console.error('Error al enviar mensaje al grupo:', error);
      socket.emit('error', { message: 'Error al enviar mensaje al grupo' });
    }
  });
  
  // Eliminar mensaje de un grupo
  socket.on('deleteGroupMessage', async ({ groupId, messageId }) => {
    try {
      const GroupChat = (await import('./features/chat/group-chat.model.js')).default;
      const Group = (await import('./features/groups/group.model.js')).default;
      
      // Verificar que el grupo exista
      const group = await Group.findById(groupId);
      if (!group) {
        return socket.emit('error', { message: 'Grupo no encontrado' });
      }
      
      // Verificar que el usuario sea miembro del grupo
      const isMember = group.members.some(member => member.user.toString() === socket.user.userId);
      if (!isMember) {
        return socket.emit('error', { message: 'No eres miembro de este grupo' });
      }
      
      // Buscar el chat del grupo
      let groupChat = await GroupChat.findOne({ group: groupId });
      if (!groupChat) {
        return socket.emit('error', { message: 'Chat del grupo no encontrado' });
      }
      
      // Buscar el mensaje
      const message = groupChat.messages.id(messageId);
      if (!message) {
        return socket.emit('error', { message: 'Mensaje no encontrado' });
      }
      
      // Verificar que el usuario sea el remitente del mensaje o un administrador del grupo
      const isAdmin = group.members.some(member => 
        member.user.toString() === socket.user.userId && ['admin', 'creator'].includes(member.role)
      );
      
      if (message.sender.toString() !== socket.user.userId && !isAdmin) {
        return socket.emit('error', { message: 'No tienes permiso para eliminar este mensaje' });
      }
      
      // Eliminar el mensaje
  groupChat.messages = groupChat.messages.filter(msg => msg._id.toString() === messageId ? false : true);
  await groupChat.save();
      
      // Emitir a todos los miembros del grupo
      const roomName = `group_${groupId}`;
      io.to(roomName).emit('deleteGroupMessage', { messageId });
    } catch (error) {
      console.error('Error al eliminar mensaje del grupo:', error);
      socket.emit('error', { message: 'Error al eliminar mensaje del grupo' });
    }
  });
  
  // Manejar desconexión
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.user.username}`);
  });
});

// Iniciar el servidor
const args = process.argv.slice(2);
const PORT = args[0] || process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
