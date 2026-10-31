import mongoose from 'mongoose';

const friendshipSchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id.toString();
      ret.user1Id = ret.user1?._id ? ret.user1._id.toString() : ret.user1?.toString();
      ret.user2Id = ret.user2?._id ? ret.user2._id.toString() : ret.user2?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

friendshipSchema.index({ user1: 1, user2: 1 });

export const Friendship = mongoose.model('Friendship', friendshipSchema);

