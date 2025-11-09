import mongoose from 'mongoose';

const groupMessageSchema = new mongoose.Schema({
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
    type: new mongoose.Schema({
      type: {
        type: String,
        enum: ['image', 'video', 'file'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      name: String,
      mimeType: String
    }, { _id: false })
  }],
  replyTo: {
    type: new mongoose.Schema({
      messageId: {
        type: mongoose.Schema.Types.ObjectId
      },
      content: {
        type: String,
        default: ''
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }, { _id: false })
  },
  reactions: [{
    type: new mongoose.Schema({
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reaction: {
        type: String,
        required: true
      }
    }, { _id: false })
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});


const groupChatSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  messages: [groupMessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const GroupChat = mongoose.model('GroupChat', groupChatSchema);
export default GroupChat;