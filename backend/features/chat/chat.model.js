import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
    auto: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'file'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }],
  timestamp: {
    type: Date,
    default: Date.now
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat.messages',
    default: null
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reaction: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
});

const chatSchema = new mongoose.Schema({
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  ],
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Método para encontrar un mensaje por su ID
messageSchema.statics.findMessageById = function(messageId) {
  return this.model('Chat').findOne({
    'messages._id': messageId
  }, {
    'messages.$': 1
  });
};

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;