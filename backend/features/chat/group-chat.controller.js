import GroupChat from './group-chat.model.js';
import Group from '../groups/group.model.js';
import { StatusCodes } from 'http-status-codes';

// Obtener mensajes de un grupo
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Verificar que el grupo exista
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Grupo no encontrado' });
    }

    // Verificar que el usuario sea miembro del grupo
    const isMember = group.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'No eres miembro de este grupo' });
    }

    // Buscar o crear el chat del grupo
    let groupChat = await GroupChat.findOne({ group: groupId })
      .populate({
        path: 'messages.sender',
        select: 'username avatar'
      })
      .populate({
        path: 'messages.replyTo.sender',
        select: 'username avatar'
      })
      .populate({
        path: 'messages.reactions.userId',
        select: 'username avatar'
      });

    if (!groupChat) {
      groupChat = await GroupChat.create({
        group: groupId,
        messages: []
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      messages: groupChat.messages
    });
  } catch (error) {
    console.error('Error al obtener mensajes del grupo:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error al obtener mensajes del grupo',
      error: error.message
    });
  }
};

// Enviar mensaje a un grupo
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content = '' } = req.body;
    const userId = req.user.userId;

    // Procesar archivos multimedia
    let media = [];
    if (req.files && req.files.length > 0) {
      media = req.files.map(file => {
        const fileType = file.mimetype.startsWith('image/') ? 'image' :
                        file.mimetype.startsWith('video/') ? 'video' : 'file';
        return {
          type: fileType,
          url: `/uploads/${file.filename}`,
          name: file.originalname,
          mimeType: file.mimetype
        };
      });
    }

    if ((!content || content.trim() === '') && media.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'El contenido del mensaje o archivos multimedia son requeridos' });
    }

    // Verificar que el grupo exista
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Grupo no encontrado' });
    }

    // Verificar que el usuario sea miembro del grupo
    const isMember = group.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'No eres miembro de este grupo' });
    }

    // Buscar o crear el chat del grupo
    let groupChat = await GroupChat.findOne({ group: groupId });
    if (!groupChat) {
      groupChat = await GroupChat.create({
        group: groupId,
        messages: []
      });
    }

    // Crear el nuevo mensaje
    let newMessage = {
      sender: userId,
      content: content || '',
      media: media,
      timestamp: new Date()
    };

    // Si hay un mensaje al que se responde, buscar su información
    if (req.body.replyTo) {
      const replyToMessage = groupChat.messages.find(
        msg => msg._id.toString() === req.body.replyTo
      );
      if (replyToMessage) {
        // Populate sender information for the reply
        await GroupChat.populate(replyToMessage, {
          path: 'sender',
          select: 'username avatar'
        });
        
        // Store reply information
        newMessage.replyTo = {
          messageId: replyToMessage._id,
          content: replyToMessage.content || '',
          sender: replyToMessage.sender._id
        };
      }
    }

    // Añadir el mensaje al chat
    groupChat.messages.push(newMessage);
    await groupChat.save();
    
    // Recargar el chat para obtener el mensaje con todas las referencias pobladas
    const updatedChat = await GroupChat.findById(groupChat._id)
      .populate('messages.sender', 'username avatar')
      .populate('messages.replyTo.sender', 'username avatar');
    
    const savedMessage = updatedChat.messages[updatedChat.messages.length - 1];

    // Crear notificaciones para todos los miembros del grupo (excepto el remitente)
    const groupForNotifications = await Group.findById(groupId).populate('members.user');
    if (groupForNotifications) {
      const { createNotification } = await import('../notifications/notification.controller.js');
      
      for (const member of groupForNotifications.members) {
        if (member.user._id.toString() !== userId.toString()) {
          await createNotification(
            member.user._id,
            userId,
            'message',
            `${req.user.username} envió un mensaje al grupo ${groupForNotifications.name}`,
            null,
            groupChat._id
          );
        }
      }
    }

    // Obtener el mensaje completo con toda la información poblada
    await groupChat.populate([
      {
        path: 'messages.sender',
        select: 'username avatar'
      },
      {
        path: 'messages.replyTo.sender',
        select: 'username avatar'
      }
    ]);

    const addedMessage = groupChat.messages[groupChat.messages.length - 1];

    // Emitir el mensaje a través de Socket.IO
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`group-${groupId}`).emit('groupMessage', addedMessage);
    }

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: addedMessage
    });
  } catch (error) {
    console.error('Error al enviar mensaje al grupo:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error al enviar mensaje al grupo',
      error: error.message
    });
  }
};

// Editar mensaje de un grupo
export const editGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    // Verificar que el grupo exista
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Grupo no encontrado' });
    }

    // Verificar que el usuario sea miembro del grupo
    const isMember = group.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'No eres miembro de este grupo' });
    }

    // Buscar el chat del grupo
    const groupChat = await GroupChat.findOne({ group: groupId });
    if (!groupChat) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Chat del grupo no encontrado' });
    }

    // Buscar el mensaje específico
    const message = groupChat.messages.id(messageId);
    if (!message) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Mensaje no encontrado' });
    }

    // Verificar que el usuario sea el remitente del mensaje
    if (message.sender.toString() !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: 'No tienes permiso para editar este mensaje' 
      });
    }

    // Procesar los archivos multimedia nuevos
    let newMedia = [];
    if (req.files && req.files.length > 0) {
      newMedia = req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' :
              file.mimetype.startsWith('video/') ? 'video' : 'file',
        url: `/uploads/${file.filename}`,
        name: file.originalname,
        mimeType: file.mimetype
      }));
    }

    // Manejar archivos multimedia existentes
    let existingMedia = [];
    if (req.body.existingMedia) {
      try {
        existingMedia = JSON.parse(req.body.existingMedia);
      } catch (e) {
        console.error('Error al parsear existingMedia:', e);
      }
    }

    // Eliminar archivos multimedia que ya no se usan
    const removedMedia = message.media.filter(oldFile => 
      !existingMedia.some(existingFile => existingFile.url === oldFile.url)
    );

    // Eliminar archivos físicamente
    for (const file of removedMedia) {
      if (file.url) {
        try {
          await deleteImageFile(file.url);
        } catch (error) {
          console.error('Error al eliminar archivo:', error);
        }
      }
    }

    // Actualizar el mensaje
    message.content = content;
    message.media = [...existingMedia, ...newMedia];
    message.edited = true;
    message.editedAt = new Date();

    // Guardar los cambios
    await groupChat.save();

    // Obtener el mensaje actualizado con las referencias pobladas
    await groupChat.populate([
      {
        path: 'messages.sender',
        select: 'username avatar'
      },
      {
        path: 'messages.replyTo.sender',
        select: 'username avatar'
      }
    ]);

    const updatedMessage = groupChat.messages.id(messageId);

    // Emitir el mensaje actualizado a través de Socket.IO
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`group-${groupId}`).emit('groupMessageUpdated', updatedMessage);
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: updatedMessage
    });
  } catch (error) {
    console.error('Error al editar mensaje del grupo:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error al editar mensaje del grupo',
      error: error.message
    });
  }
};

// Eliminar mensaje de un grupo
export const deleteGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user.userId;

    // Verificar que el grupo exista
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Grupo no encontrado' });
    }

    // Verificar que el usuario sea miembro del grupo
    const isMember = group.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'No eres miembro de este grupo' });
    }

    // Buscar el chat del grupo
    const groupChat = await GroupChat.findOne({ group: groupId });
    if (!groupChat) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Chat del grupo no encontrado' });
    }

    // Buscar el mensaje
    const message = groupChat.messages.id(messageId);
    if (!message) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Mensaje no encontrado' });
    }

    // Verificar que el usuario sea el remitente del mensaje o un administrador del grupo
    const isAdmin = group.members.some(member => 
      member.user.toString() === userId && ['admin', 'creator'].includes(member.role)
    );
    
    if (message.sender.toString() !== userId && !isAdmin) {
      return res.status(StatusCodes.FORBIDDEN).json({ 
        message: 'No tienes permiso para eliminar este mensaje' 
      });
    }

    // Eliminar el mensaje usando pull
    groupChat.messages.pull({ _id: messageId });
    await groupChat.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Mensaje eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar mensaje del grupo:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error al eliminar mensaje del grupo',
      error: error.message
    });
  }
};