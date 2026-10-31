import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id.toString();
      ret.senderId = ret.sender?._id ? ret.sender._id.toString() : ret.sender?.toString();
      ret.receiverId = ret.receiver?._id ? ret.receiver._id.toString() : ret.receiver?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

