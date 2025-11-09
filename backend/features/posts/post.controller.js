import Post from './post.model.js';
import mongoose from 'mongoose';

// Crear post
export const createPost = async (req, res) => {
  try {
    const { title = '', content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'El contenido es obligatorio' });
    }
    let media = [];
    if (req.files && req.files.length > 0) {
      media = req.files.map(f => ({
        url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`,
        type: f.mimetype.startsWith('image/') ? 'image' : f.mimetype.startsWith('video/') ? 'video' : 'file',
        name: f.originalname,
        mimetype: f.mimetype
      }));
    }
    const post = new Post({
      title,
      content,
      media,
      author: req.user.userId
    });
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el post', error: error.message });
  }
};

// Obtener posts con paginación (excluyendo los posts de grupos)
export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Importar el modelo Group para obtener los posts de grupos
    const Group = mongoose.model('Group');
    
    // Obtener todos los IDs de posts que pertenecen a grupos
    const groups = await Group.find({}, 'posts');
    const groupPostIds = groups.reduce((ids, group) => {
      return ids.concat(group.posts);
    }, []);
    
    // Filtrar para excluir los posts que pertenecen a grupos
    const filter = { _id: { $nin: groupPostIds } };
    
    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .populate('author', 'username email avatar')
      .populate('reactions.user', 'username email avatar')
      .populate('comments.user', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      posts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los posts', error: error.message });
  }
};

// Obtener posts de un usuario específico
export const getPostsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

  const total = await Post.countDocuments({ author: userId, isGroupPost: { $ne: true } });
  const posts = await Post.find({ author: userId, isGroupPost: { $ne: true } })
      .populate('author', 'username email avatar')
      .populate('reactions.user', 'username email avatar')
      .populate('comments.user', 'username email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      posts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los posts del usuario', error });
  }
};

// Obtener un post por ID
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username email avatar')
      .populate('reactions.user', 'username email avatar')
      .populate('comments.user', 'username email avatar');
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el post', error });
  }
};

// Editar post
export const updatePost = async (req, res) => {
  try {
    const { title = '', content } = req.body;
    let media = [];
    if (req.files && req.files.length > 0) {
      media = req.files.map(f => ({
        url: `${req.protocol}://${req.get('host')}/uploads/${f.filename}`,
        type: f.mimetype.startsWith('image/') ? 'image' : f.mimetype.startsWith('video/') ? 'video' : 'file',
        name: f.originalname,
        mimetype: f.mimetype
      }));
    }
    // Archivos existentes (urls y metadatos)
    let existingMedia = req.body.existingMedia;
    if (existingMedia) {
      if (typeof existingMedia === 'string') {
        try {
          existingMedia = JSON.parse(existingMedia);
        } catch {
          existingMedia = [existingMedia];
        }
      }
    } else {
      existingMedia = [];
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    if (post.author.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'No autorizado para editar este post' });
    }

    if (title !== undefined) post.title = title;
    if (content) post.content = content;
    // Combinar media existente + nueva
    post.media = [...existingMedia, ...media];

    await post.save();
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al editar el post', error });
  }
};

// Eliminar post
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    if (post.author.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: 'No autorizado para eliminar este post' });
    }

    await post.deleteOne();
    res.status(200).json({ message: 'Post eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el post', error: error.message });
  }
};

// Agregar comentario
export const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    // Permitir comentario solo con imagen o solo con texto
    if (!content && !req.file) {
      return res.status(400).json({ message: 'El contenido o la imagen es obligatoria' });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    post.comments.push({
      user: req.user.userId,
      content,
      imageUrl,
      createdAt: new Date()
    });

    await post.save();
    await post.populate('comments.user', 'username email avatar');
    
    // Crear notificación para el autor del post
    if (post.author.toString() !== req.user.userId.toString()) {
      const { createNotification } = await import('../notifications/notification.controller.js');
      await createNotification(
        post.author,
        req.user.userId,
        'comment',
        `${req.user.username} comentó en tu publicación`,
        post._id
      );
    }
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar comentario', error });
  }
};

// Editar comentario
export const updateComment = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;
    const { content } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'No autorizado para editar este comentario' });
    }

    comment.content = content;
    await post.save();
    res.status(200).json({ message: 'Comentario editado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al editar comentario', error });
  }
};

// Eliminar comentario
export const deleteComment = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'No autorizado para eliminar este comentario' });
    }

    comment.deleteOne();
    await post.save();
    res.status(200).json({ message: 'Comentario eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar comentario', error });
  }
};

// Agregar reacción
export const reactToPost = async (req, res) => {
  try {
    const { emoji } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    // Evita duplicados
    const alreadyReacted = post.reactions.find(
      r => r.user.toString() === req.user.userId && r.emoji === emoji
    );
    if (alreadyReacted) {
      return res.status(400).json({ message: 'Ya reaccionaste con ese emoji' });
    }

    post.reactions.push({ user: req.user.userId, emoji });
    await post.save();
    
    // Crear notificación para el autor del post
    if (post.author.toString() !== req.user.userId.toString()) {
      const { createNotification } = await import('../notifications/notification.controller.js');
      await createNotification(
        post.author,
        req.user.userId,
        'reaction',
        `${req.user.username} reaccionó a tu publicación con ${emoji}`,
        post._id
      );
    }
    
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Error al reaccionar' });
  }
};

// Quitar reacción
export const removeReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    post.reactions = post.reactions.filter(
      r => !(r.user.toString() === req.user.userId && r.emoji === emoji)
    );
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Error al quitar reacción' });
  }
};

