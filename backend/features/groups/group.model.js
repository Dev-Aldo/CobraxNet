import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del grupo es obligatorio'],
    trim: true,
    minlength: [3, 'El nombre del grupo debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre del grupo no debe exceder los 50 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción del grupo es obligatoria'],
    trim: true,
    maxlength: [500, 'La descripción no debe exceder los 500 caracteres']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['admin', 'member'], default: 'member' },
      joinedAt: { type: Date, default: Date.now }
    }
  ],
  avatar: {
    type: String,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    }
  ]
});

// Middleware para asegurar que el creador sea automáticamente un miembro admin
groupSchema.pre('save', function(next) {
  if (this.isNew) {
    // Si el grupo es nuevo, agregar al creador como admin
    const creatorExists = this.members.some(member => 
      member.user.toString() === this.creator.toString()
    );
    
    if (!creatorExists) {
      this.members.push({
        user: this.creator,
        role: 'admin',
        joinedAt: Date.now()
      });
    }
  }
  next();
});

const Group = mongoose.model('Group', groupSchema);
export default Group;