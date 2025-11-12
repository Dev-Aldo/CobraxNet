// Expulsar miembro de un grupo
export const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    // Buscar el grupo
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    }
    

    // No permitir que el owner sea eliminado por nadie
    if (group.creator.toString() === userId) {
      return res.status(403).json({ success: false, message: 'No se puede eliminar al owner del grupo' });
    }
    
    // Verificar si el usuario que hace la petición es admin o owner
    const isAdmin = group.members.some(member => member.user.toString() === req.user.userId && member.role === 'admin');
    const isOwner = group.creator.toString() === req.user.userId;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para expulsar miembros' });
    }
    
    // Si es un admin (no owner), no puede expulsar al owner del grupo (ya cubierto arriba, pero por claridad)
    if (isAdmin && !isOwner && group.creator.toString() === userId) {
      return res.status(403).json({ success: false, message: 'No se puede eliminar al owner del grupo' });
    }
    
    // Buscar al miembro a eliminar
    const memberIndex = group.members.findIndex(member => member.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    }
    
    group.members.splice(memberIndex, 1);
    await group.save();
    res.status(200).json({ success: true, message: 'Miembro expulsado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al expulsar miembro', error: error.message });
  }
};
// Eliminar publicación de un grupo
export const deleteGroupPost = async (req, res) => {
  try {
    const { groupId, postId } = req.params;
    // Buscar el grupo
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    // Buscar el post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post no encontrado' });
    // Verificar que el usuario sea el autor o admin del grupo
    const isAdmin = group.members.some(m => m.user.toString() === req.user.userId && m.role === 'admin');
    if (post.author.toString() !== req.user.userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este post' });
    }
    // Eliminar el post del array de posts del grupo
    group.posts = group.posts.filter(p => p.toString() !== postId);
    await group.save();
    // Eliminar el post de la colección
    await Post.findByIdAndDelete(postId);
    res.status(200).json({ success: true, message: 'Post eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar post', error: error.message });
  }
};
// Editar publicación de un grupo
export const editGroupPost = async (req, res) => {
  try {
    const { groupId, postId } = req.params;
    const { content, existingMedia } = req.body;
    // Buscar el post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post no encontrado' });
    // Verificar que el usuario sea el autor
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar este post' });
    }
    // Actualizar campos
    if (typeof content !== 'undefined') post.content = content;
    // Procesar archivos nuevos
    let newMedia = [];
    if (req.files && req.files.length > 0) {
      newMedia = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype.startsWith('image') ? 'image' : file.mimetype.startsWith('video') ? 'video' : 'file',
        name: file.originalname,
        mimetype: file.mimetype
      }));
    }
    // Procesar media existente (que no se eliminó)
    let parsedExisting = [];
    if (existingMedia) {
      try {
        parsedExisting = JSON.parse(existingMedia);
      } catch (e) { parsedExisting = []; }
    }
    post.media = [...parsedExisting, ...newMedia];
    await post.save();
    await post.populate('author', 'username avatar');
    await post.populate('reactions.user', 'username avatar');
    await post.populate('comments.user', 'username avatar');
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al editar post', error: error.message });
  }
}
// Agregar comentario a un post de grupo
export const addGroupPostComment = async (req, res) => {
  try {
    const { groupId, postId } = req.params;
    const { content } = req.body;
    // Permitir comentario solo con archivo o solo con texto
    if (!content && !req.file) return res.status(400).json({ success: false, message: 'El comentario o el archivo es obligatorio' });
    // Verificar grupo y membresía
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    const isMember = group.members.some(m => m.user.toString() === req.user.userId);
    if (!isMember) return res.status(403).json({ success: false, message: 'No eres miembro del grupo' });
    // Buscar el post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post no encontrado' });
    // Procesar archivo si existe
    let fileUrl = '';
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }
    // Agregar comentario
    post.comments.push({ user: req.user.userId, content, fileUrl, createdAt: new Date() });
    await post.save();
    // Crear notificación para el autor del post
    if (post.author.toString() !== req.user.userId.toString()) {
      const { createNotification } = await import('../notifications/notification.controller.js');
      await createNotification(
        post.author,
        req.user.userId,
        'comment',
        `${req.user.username} comentó en tu publicación del grupo`,
        post._id
      );
    }
    await post.populate('comments.user', 'username avatar');
    res.status(201).json({ success: true, comments: post.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al agregar comentario', error: error.message });
  }
};

// Editar comentario de un post de grupo
export const editGroupPostComment = async (req, res) => {
  try {
    const { groupId, postId, commentId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'El comentario no puede estar vacío' });
    // Verificar grupo y membresía
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    const isMember = group.members.some(m => m.user.toString() === req.user.userId);
    if (!isMember) return res.status(403).json({ success: false, message: 'No eres miembro del grupo' });
    // Buscar el post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post no encontrado' });
    // Buscar y editar comentario
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
    if (comment.user.toString() !== req.user.userId) return res.status(403).json({ success: false, message: 'No puedes editar este comentario' });
    comment.content = content;
    await post.save();
    await post.populate('comments.user', 'username avatar');
    res.status(200).json({ success: true, comments: post.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al editar comentario', error: error.message });
  }
};

// Eliminar comentario de un post de grupo
export const deleteGroupPostComment = async (req, res) => {
  try {
    const { groupId, postId, commentId } = req.params;
    // Verificar grupo y membresía
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    const isMember = group.members.some(m => m.user.toString() === req.user.userId);
    if (!isMember) return res.status(403).json({ success: false, message: 'No eres miembro del grupo' });
    
    // Verificar si el usuario es administrador del grupo
    const isAdmin = group.members.some(m => m.user.toString() === req.user.userId && m.role === 'admin');
    
    // Buscar el post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post no encontrado' });
    
    // Buscar comentario
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
    
    // Verificar permisos: solo el autor o un administrador puede eliminar
    if (comment.user.toString() !== req.user.userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este comentario' });
    }
    
    // Eliminar comentario
    post.comments = post.comments.filter(c => c._id.toString() !== commentId);
    await post.save();
    await post.populate('comments.user', 'username avatar');
    res.status(200).json({ success: true, comments: post.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar comentario', error: error.message });
  }
};
import Group from './group.model.js';
import Post from '../posts/post.model.js';

// Crear un nuevo grupo
export const createGroup = async (req, res) => {
  try {
    const { name, description, isPublic = true } = req.body;
    
    // Validaciones básicas
    if (!name || !description) {
      return res.status(400).json({ message: 'El nombre y la descripción son obligatorios' });
    }
    
    // Procesar imagen de avatar si existe
    let avatarUrl = '';
    if (req.file) {
      avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
    
    // Crear el grupo
    const group = new Group({
      name,
      description,
      creator: req.user.userId,
      avatar: avatarUrl,
      isPublic
    });
    
    await group.save();
    
    res.status(201).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear el grupo', 
      error: error.message 
    });
  }
};

// Obtener todos los grupos (con filtros opcionales)
export const getAllGroups = async (req, res) => {
  try {
    const { search, isPublic, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Construir el filtro
    const filter = {};
    
    // Filtrar por búsqueda en nombre o descripción
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filtrar por visibilidad
    if (isPublic !== undefined) {
      filter.isPublic = isPublic === 'true';
    }
    
    // Contar total de grupos que coinciden con el filtro
    const total = await Group.countDocuments(filter);
    
    // Obtener grupos paginados
    const groups = await Group.find(filter)
      .populate('creator', 'username email avatar')
      .populate('members.user', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: {
        groups,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener los grupos', 
      error: error.message 
    });
  }
};

// Obtener un grupo específico por ID
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId)
      .populate('creator', 'username email avatar')
      .populate('members.user', 'username email avatar')
      .populate({
        path: 'posts',
        populate: {
          path: 'author',
          select: 'username email avatar'
        }
      });
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grupo no encontrado' 
      });
    }
    
    // Verificar si el grupo es privado y el usuario no es miembro
    if (!group.isPublic) {
      const isMember = group.members.some(member => 
        member.user._id.toString() === req.user.userId
      );
      
      if (!isMember) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permiso para ver este grupo privado' 
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener el grupo', 
      error: error.message 
    });
  }
};

// Actualizar un grupo
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, isPublic } = req.body;
    
    // Buscar el grupo
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grupo no encontrado' 
      });
    }
    
    // Verificar si el usuario es admin del grupo
    const isAdmin = group.members.some(member => 
      member.user.toString() === req.user.userId && member.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permiso para actualizar este grupo' 
      });
    }
    
    // Actualizar campos
    if (name) group.name = name;
    if (description) group.description = description;
    if (isPublic !== undefined) group.isPublic = isPublic;
    
    // Actualizar avatar si se proporciona
    if (req.file) {
      group.avatar = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
    
    await group.save();
    
    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar el grupo', 
      error: error.message 
    });
  }
};

// Eliminar un grupo
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Buscar el grupo
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grupo no encontrado' 
      });
    }
    
    // Solo el creador del grupo puede eliminarlo
    const isCreator = group.creator.toString() === req.user.userId;
    
    if (!isCreator) {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo el creador del grupo puede eliminarlo' 
      });
    }
    
    // Eliminar el grupo
    await Group.findByIdAndDelete(groupId);
    
    res.status(200).json({
      success: true,
      message: 'Grupo eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar el grupo', 
      error: error.message 
    });
  }
};

// Unirse a un grupo
export const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Buscar el grupo
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grupo no encontrado' 
      });
    }
    
    // Verificar si el usuario ya es miembro
    const isMember = group.members.some(member => 
      member.user.toString() === req.user.userId
    );
    
    if (isMember) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ya eres miembro de este grupo' 
      });
    }
    
    // Verificar si el grupo es privado
    if (!group.isPublic) {
      return res.status(403).json({ 
        success: false, 
        message: 'No puedes unirte a un grupo privado sin invitación' 
      });
    }
    
    // Agregar al usuario como miembro
    group.members.push({
      user: req.user.userId,
      role: 'member',
      joinedAt: Date.now()
    });
    
    await group.save();
    
    res.status(200).json({
      success: true,
      message: 'Te has unido al grupo correctamente'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al unirse al grupo', 
      error: error.message 
    });
  }
};

// Abandonar un grupo
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Buscar el grupo
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grupo no encontrado' 
      });
    }
    
    // Verificar si el usuario es miembro
    const memberIndex = group.members.findIndex(member => 
      member.user.toString() === req.user.userId
    );
    
    if (memberIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        message: 'No eres miembro de este grupo' 
      });
    }
    
    // Si el usuario es el creador, eliminar el grupo
    if (group.creator.toString() === req.user.userId) {
      await Group.findByIdAndDelete(groupId);
      return res.status(200).json({
        success: true,
        message: 'Eras el creador, el grupo ha sido eliminado correctamente'
      });
    }

    // Eliminar al usuario de los miembros
    group.members.splice(memberIndex, 1);

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Has abandonado el grupo correctamente'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al abandonar el grupo', 
      error: error.message 
    });
  }
};

// Cambiar rol de un miembro
export const changeRole = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { role } = req.body;
    
    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rol inválido' 
      });
    }
    
    // Buscar el grupo
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Grupo no encontrado' 
      });
    }
    
    // Verificar si el usuario que hace la petición es admin o owner
    const isAdmin = group.members.some(member => member.user.toString() === req.user.userId && member.role === 'admin');
    const isOwner = group.creator.toString() === req.user.userId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permiso para cambiar roles' 
      });
    }
    
    // Buscar al miembro a modificar
    const memberIndex = group.members.findIndex(member => 
      member.user.toString() === userId
    );
    
    if (memberIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado en el grupo' 
      });
    }
    
    // Si es un admin (no owner), no puede cambiar el rol del owner del grupo
    if (isAdmin && !isOwner && group.creator.toString() === userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Los administradores no pueden cambiar el rol del creador del grupo' 
      });
    }
    
    // Si es un admin (no owner), no puede cambiar roles de otros administradores
    if (isAdmin && !isOwner) {
      const targetMember = group.members[memberIndex];
      if (targetMember.role === 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Los administradores no pueden cambiar el rol de otros administradores' 
        });
      }
    }
    
    // No permitir que se cambie el rol del owner a member
    if (group.creator.toString() === userId && role === 'member') {
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede cambiar el rol del creador del grupo' 
      });
    }
    
    // Cambiar el rol
    group.members[memberIndex].role = role;
    
    await group.save();
    
    res.status(200).json({
      success: true,
      message: `Rol cambiado a ${role} correctamente`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al cambiar el rol', 
      error: error.message 
    });
  }
};

// Crear una publicación en un grupo
export const createGroupPost = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title = '', content } = req.body;
    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, message: 'El contenido o al menos un archivo es obligatorio' });
    }
    // Buscar el grupo
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    }
    // Verificar si el usuario es miembro
    const isMember = group.members.some(member => member.user.toString() === req.user.userId);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'No eres miembro de este grupo' });
    }
    // Procesar archivos
    let media = [];
    if (req.files && req.files.length > 0) {
      media = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype.startsWith('image') ? 'image' : file.mimetype.startsWith('video') ? 'video' : 'file',
        name: file.originalname,
        mimetype: file.mimetype
      }));
    }
    // Crear el post
    const post = new Post({
      title,
      content,
      media,
      author: req.user.userId,
      isGroupPost: true
    });
    await post.save();
    // Agregar el post al grupo
    group.posts.push(post._id);
    await group.save();
  // Asegurar que el campo media siempre exista como array
  const postObj = post.toObject ? post.toObject() : post;
  if (!Array.isArray(postObj.media)) postObj.media = [];
  res.status(201).json({ success: true, data: postObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear la publicación en el grupo', error: error.message });
  }
};

// Obtener los grupos a los que pertenece el usuario
export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user.userId
    })
      .populate('creator', 'username email avatar')
      .populate('members.user', 'username email avatar')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener tus grupos', 
      error: error.message 
    });
  }
};

// Obtener las publicaciones de un grupo específico
export const getGroupPosts = async (req, res) => {
  try {
    const { groupId } = req.params;
    // Buscar el grupo
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    }
    // Verificar si el grupo es privado y el usuario no es miembro
    if (!group.isPublic) {
      const isMember = group.members.some(member => member.user.toString() === req.user.userId);
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'No tienes permiso para ver las publicaciones de este grupo privado' });
      }
    }
    // Obtener las publicaciones del grupo con sus autores y reacciones populadas
    const posts = await Post.find({ _id: { $in: group.posts } })
      .populate('author', 'username email avatar')
      .populate('reactions.user', 'username avatar')
      .populate('comments.user', 'username avatar')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener publicaciones del grupo', error: error.message });
  }
};

// Agregar reacción a un post de grupo
export const addGroupPostReaction = async (req, res) => {
  try {
    const { groupId, postId } = req.params;
    const { emoji } = req.body;
    // Buscar el grupo y verificar membresía
    const group = await Group.findById(groupId);
    const isMember = group.members.some(m => m.user.toString() === req.user.userId);
    if (!isMember) return res.status(403).json({ success: false, message: 'No eres miembro del grupo' });
    // Buscar el post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post no encontrado' });
    // Quitar reacción previa del mismo usuario con el mismo emoji (no duplicar)
    post.reactions = post.reactions.filter(r => !(r.user.toString() === req.user.userId && r.emoji === emoji));
    // Agregar nueva reacción
    post.reactions.push({ user: req.user.userId, emoji });
    await post.save();
    // Crear notificación para el autor del post
    if (post.author.toString() !== req.user.userId.toString()) {
      const { createNotification } = await import('../notifications/notification.controller.js');
      await createNotification(
        post.author,
        req.user.userId,
        'reaction',
        `${req.user.username} reaccionó a tu publicación en el grupo con ${emoji}`,
        post._id
      );
    }
    await post.populate('reactions.user', 'username avatar');
    res.status(200).json({ success: true, reactions: post.reactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al agregar reacción', error: error.message });
  }
};

// Eliminar reacción de un post de grupo
export const removeGroupPostReaction = async (req, res) => {
  try {
    const { groupId, postId } = req.params;
    const { emoji } = req.body;
    // Buscar el grupo y verificar membresía
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Grupo no encontrado' });
    const isMember = group.members.some(m => m.user.toString() === req.user.userId);
    if (!isMember) return res.status(403).json({ success: false, message: 'No eres miembro del grupo' });
    // Buscar el post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post no encontrado' });
    // Quitar reacción del usuario con ese emoji
    post.reactions = post.reactions.filter(r => !(r.user.toString() === req.user.userId && r.emoji === emoji));
    await post.save();
    await post.populate('reactions.user', 'username avatar');
    res.status(200).json({ success: true, reactions: post.reactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar reacción', error: error.message });
  }
};