import mongoose from 'mongoose';
import Chat from './chat.model.js';
import User from '../auth/auth.model.js';

// Agregar una reacción a un mensaje
export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const userId = req.user._id || req.user.userId;

    // Buscar el chat que contiene el mensaje
    const chat = await Chat.findOne({ "messages._id": new mongoose.Types.ObjectId(messageId) });
    if (!chat) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    // Encontrar el mensaje en el chat
    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    // Inicializar el array de reacciones si no existe
    if (!Array.isArray(message.reactions)) {
      message.reactions = [];
    }

    // Verificar si el usuario ya reaccionó con este emoji
    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId.toString() && r.reaction === reaction
    );

    if (existingReactionIndex !== -1) {
      // Si ya existe la misma reacción, la quitamos
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Agregar la nueva reacción
      message.reactions.push({
        userId: userId,
        reaction: reaction,
        timestamp: new Date()
      });
    }

    await chat.save();

    // Poblar los datos del usuario para cada reacción
    const populatedChat = await Chat.findById(chat._id).populate({
      path: 'messages.reactions.userId',
      select: 'username avatar'
    });

    // Obtener el mensaje actualizado con las reacciones pobladas
    const updatedMessage = populatedChat.messages.id(messageId);

    if (!updatedMessage) {
      return res.status(500).json({ message: 'Error al actualizar las reacciones' });
    }

    // Emitir el evento de actualización de reacciones
    const io = req.app.get('io');
    if (io) {
      io.to(chat._id.toString()).emit('reactionUpdated', {
        messageId,
        reactions: updatedMessage.reactions
      });
    }

    return res.status(200).json({
      success: true,
      reactions: updatedMessage.reactions
    });
  } catch (error) {
    console.error('Error al procesar la reacción:', error);
    return res.status(500).json({ message: 'Error al procesar la reacción' });
  }
};

// Obtener todos los mensajes entre el usuario autenticado y otro usuario
export const getPrivateMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const currentUserId = req.user.userId;

    if (!otherUserId) {
      return res.status(400).json({ message: 'Falta el ID del usuario receptor' });
    }

    // Obtener información del otro usuario
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Buscar el chat entre ambos usuarios (sin importar el orden) y poblar los datos necesarios
    let chat = await Chat.findOne({
      users: { $all: [currentUserId, otherUserId], $size: 2 }
    }).populate({
      path: 'messages.reactions.userId',
      select: 'username avatar'
    });

    // Si no existe, crear uno vacío
    if (!chat) {
      chat = new Chat({
        users: [currentUserId, otherUserId],
        messages: []
      });
      await chat.save();
    }

    // Obtener el chat con toda la información necesaria
    const populatedChat = await Chat.findById(chat._id)
      .populate('users', 'username avatar')
      .populate({
        path: 'messages.sender',
        model: 'User',
        select: 'username avatar'
      })
      .populate({
        path: 'messages.reactions.userId',
        model: 'User',
        select: 'username avatar'
      });

    // Procesar los mensajes de manera segura
    const messages = populatedChat.messages.map(msg => {
      try {
        const msgObj = msg.toObject();

        // Si hay un replyTo, intentar obtener la información básica
        let replyToInfo = null;
        if (msgObj.replyTo) {
          const replyToMessage = populatedChat.messages.find(m => m._id.toString() === msgObj.replyTo.toString());
          if (replyToMessage) {
            replyToInfo = {
              _id: replyToMessage._id,
              content: replyToMessage.content,
              media: replyToMessage.media || [],
              sender: replyToMessage.sender
            };
          }
        }

        return {
          _id: msgObj._id,
          content: msgObj.content || '',
          sender: msgObj.sender || null,
          media: msgObj.media || [],
          timestamp: msgObj.timestamp,
          replyTo: replyToInfo,
          reactions: msgObj.reactions || []
        };
      } catch (error) {
        return null;
      }
    }).filter(msg => msg !== null); // Eliminar mensajes que fallaron al procesar

    const response = {
      messages,
      chatId: chat._id,
      otherUser: {
        _id: otherUser._id,
        username: otherUser.username,
        avatar: otherUser.avatar
      }
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener los mensajes',
      error: error.message,
      details: error.stack
    });
  }
};

// Enviar un mensaje privado
export const sendPrivateMessage = async (req, res) => {
  try {
    const { content = '', to } = req.body;
    let mediaFiles = [];
    if (req.files) {
      mediaFiles = req.files.map(file => {
        const url = `/uploads/${file.filename}`;
        let type = 'file';
        if (file.mimetype.startsWith('image/')) {
          type = 'image';
        } else if (file.mimetype.startsWith('video/')) {
          type = 'video';
        }
        return {
          type,
          url,
          name: file.originalname
        };
      });
    }

    const otherUserId = to;
    const currentUserId = req.user.userId;

    // Validaciones
    if ((!content || content.trim() === '') && mediaFiles.length === 0) {
      return res.status(400).json({ message: 'El contenido del mensaje o algún archivo es obligatorio' });
    }
    if (!otherUserId) {
      return res.status(400).json({ message: 'Falta el ID del usuario receptor' });
    }

    // Buscar el chat entre ambos usuarios
    let chat = await Chat.findOne({
      users: { $all: [currentUserId, otherUserId], $size: 2 }
    });

    // Si no existe el chat, crearlo
    if (!chat) {
      chat = new Chat({
        users: [currentUserId, otherUserId],
        messages: []
      });
    }

    // Procesar respuesta si existe
    let replyToMessage = null;
    if (req.body.replyTo) {
      try {
        const replyToId = req.body.replyTo;
        // Verificar si el mensaje al que se responde existe
        const originalMessage = chat.messages.find(
          msg => msg._id && msg._id.toString() === replyToId
        );
        if (originalMessage) {
          replyToMessage = originalMessage._id;
        }
      } catch (error) {
      }
    }

    // Crear el nuevo mensaje
    const messageToAdd = {
      sender: currentUserId,
      content: content.trim(),
      media: mediaFiles,
      timestamp: new Date(),
      replyTo: replyToMessage
    };

    // Agregar el mensaje al chat
    chat.messages.push(messageToAdd);

    // Guardar el chat
    await chat.save();

    // Crear notificación
    try {
      const { createNotification } = await import('../notifications/notification.controller.js');
      await createNotification(
        otherUserId,
        currentUserId,
        'message',
        `${req.user.username} te envió un mensaje`,
        null,
        chat._id
      );
    } catch (e) {
    }

        // Obtener el mensaje con toda la información necesaria, incluyendo el mensaje al que se responde
    const populatedChat = await Chat.findById(chat._id)
      .populate('users', 'username avatar')
      .populate({
        path: 'messages.sender',
        model: 'User',
        select: 'username avatar'
      });

    // Obtener y procesar el mensaje enviado
    const sentMessage = populatedChat.messages[populatedChat.messages.length - 1];

    if (!sentMessage) {
      throw new Error('No se pudo obtener el mensaje enviado');
    }

    // Si hay un mensaje al que se responde, obtener sus detalles
    let replyToDetails = null;
    if (sentMessage.replyTo) {
      const replyToMessage = populatedChat.messages.find(
        msg => msg._id.toString() === sentMessage.replyTo.toString()
      );
      if (replyToMessage) {
        replyToDetails = {
          _id: replyToMessage._id.toString(),
          content: replyToMessage.content,
          media: replyToMessage.media || [],
          sender: {
            _id: replyToMessage.sender._id,
            username: replyToMessage.sender.username,
            avatar: replyToMessage.sender.avatar
          }
        };
      }
    }

    // Convertir a objeto plano y asegurar la estructura correcta
    const processedMessage = {
      _id: sentMessage._id.toString(),
      content: sentMessage.content || '',
      sender: {
        _id: sentMessage.sender._id,
        username: sentMessage.sender.username,
        avatar: sentMessage.sender.avatar
      },
      media: sentMessage.media || [],
      timestamp: sentMessage.timestamp,
      reactions: sentMessage.reactions || [],
      replyTo: replyToDetails
    }

    res.status(201).json({
      message: 'Mensaje enviado con éxito',
      data: processedMessage
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error al enviar el mensaje',
      error: error.message,
      stack: error.stack
    });
  }
};

// Eliminar un mensaje de un chat privado
export const deletePrivateMessage = async (req, res) => {
  try {
    const { messageId, userId } = req.params;
    const currentUserId = req.user.userId;
    // Buscar el chat entre ambos usuarios
    const chat = await Chat.findOne({
      users: { $all: [currentUserId, userId], $size: 2 }
    });
    if (!chat) {
      return res.status(404).json({ message: 'Chat no encontrado' });
    }
    // Buscar el mensaje a eliminar
    const messageIndex = chat.messages.findIndex(msg => msg._id.toString() === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }
    // Verificar que el usuario sea el propietario del mensaje
    if (chat.messages[messageIndex].sender.toString() !== currentUserId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este mensaje' });
    }
    // Eliminar el mensaje
    chat.messages.splice(messageIndex, 1);
    await chat.save();
    res.status(200).json({ message: 'Mensaje eliminado con éxito', messageId });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el mensaje', error: error.message });
  }
};

// Editar un mensaje privado (solo propietario)
export const editPrivateMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const currentUserId = req.user.userId;

    let mediaFiles = [];
    if (req.files) {
      mediaFiles = req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 
              file.mimetype.startsWith('video/') ? 'video' : 'file',
        url: `/uploads/${file.filename}`,
        name: file.originalname
      }));
    }

    const { content = '', existingMedia = '[]' } = req.body;
    const existingMediaArray = JSON.parse(existingMedia);

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat no encontrado' });

    const message = chat.messages.id(messageId);
    if (!message) return res.status(404).json({ message: 'Mensaje no encontrado' });

    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({ message: 'No tienes permiso para editar este mensaje' });
    }

    // Actualizar campos permitidos
    if (content && content.trim() !== '') message.content = content.trim();
    // Actualizar archivos multimedia combinando los existentes con los nuevos
    message.media = [...existingMediaArray, ...mediaFiles];

    await chat.save();

    // Devolver el mensaje actualizado (poblado)
    const populatedChat = await Chat.findById(chatId).populate({
      path: 'messages.sender',
      select: 'username avatar'
    });
    const updated = populatedChat.messages.id(messageId);

    res.status(200).json({ message: 'Mensaje actualizado', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error al editar el mensaje', error: error.message });
  }
};