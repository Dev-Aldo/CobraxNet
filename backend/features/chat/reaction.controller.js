import GroupChat from './group-chat.model.js';
import Group from '../groups/group.model.js';
import { StatusCodes } from 'http-status-codes';

// Agregar o actualizar reacción a un mensaje
export const addReaction = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { reaction } = req.body;
    const userId = req.user.userId;

    if (!reaction) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'La reacción es requerida'
      });
    }

    // Buscar el chat del grupo
    const groupChat = await GroupChat.findOne({ group: groupId });
    if (!groupChat) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Chat del grupo no encontrado'
      });
    }

    // Encontrar el mensaje específico
    const message = groupChat.messages.id(messageId);
    if (!message) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // Inicializar el array de reacciones si no existe
    if (!message.reactions) {
      message.reactions = [];
    }

    // Verificar si el usuario ya usó esta reacción específica
    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId && r.reaction === reaction
    );

    if (existingReactionIndex > -1) {
      // Si ya existe esta reacción específica, la removemos
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Agregar nueva reacción
      message.reactions.push({ userId, reaction });
    }

    await groupChat.save();

    // Poblar la información de los usuarios que reaccionaron
    await GroupChat.populate(message, {
      path: 'reactions.userId',
      select: 'username avatar'
    });

    // Emitir evento de actualización de reacciones a través de socket.io
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`group-${groupId}`).emit('groupReactionUpdated', {
        messageId: message._id,
        reactions: message.reactions
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      reactions: message.reactions
    });
  } catch (error) {
    console.error('Error al agregar reacción:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error al agregar reacción',
      error: error.message
    });
  }
};

// Eliminar reacción de un mensaje
export const removeReaction = async (req, res) => {
  try {
    const { groupId, messageId, reaction } = req.params;
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

    // Eliminar la reacción específica del usuario
    const reactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId && r.reaction === reaction
    );

    if (reactionIndex === -1) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
        message: 'No se encontró la reacción especificada' 
      });
    }

    message.reactions.splice(reactionIndex, 1);
    await groupChat.save();

    // Obtener el mensaje actualizado con la información poblada
    await groupChat.populate([
      {
        path: 'messages.reactions.userId',
        select: 'username avatar'
      }
    ]);

    // Encontrar el mensaje actualizado
    const updatedMessage = groupChat.messages.id(messageId);

    return res.status(StatusCodes.OK).json({
      success: true,
      reactions: updatedMessage.reactions
    });
  } catch (error) {
    console.error('Error al eliminar reacción:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error al eliminar reacción',
      error: error.message
    });
  }
};
