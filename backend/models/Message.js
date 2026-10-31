import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id.toString();
      ret.senderId = ret.sender?._id ? ret.sender._id.toString() : ret.sender?.toString();
      ret.receiverId = ret.receiver?._id ? ret.receiver._id.toString() : ret.receiver?.toString();
      ret.timestamp = ret.createdAt ? ret.createdAt.toISOString() : new Date().toISOString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);

