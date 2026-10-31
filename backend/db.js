import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './models/User.js';
import { FriendRequest } from './models/FriendRequest.js';
import { Friendship } from './models/Friendship.js';
import { Message } from './models/Message.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatapp';

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`🍃 Connected to MongoDB: ${MONGO_URI}`);
    await seedInitialDataIfEmpty();
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
}

async function seedInitialDataIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) return;

  console.log('🌱 Seeding initial demo users into MongoDB...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const rahul = await User.create({
    username: 'rahul',
    name: 'Rahul Sharma',
    bio: 'Fullstack developer & tech enthusiast 🚀',
    avatarColor: '#4f46e5',
    password: passwordHash
  });

  const priya = await User.create({
    username: 'priya',
    name: 'Priya Patel',
    bio: 'UI/UX Designer who loves minimalism 🎨',
    avatarColor: '#ec4899',
    password: passwordHash
  });

  const amit = await User.create({
    username: 'amit',
    name: 'Amit Kumar',
    bio: 'Cricket fan & open source contributor 🏏',
    avatarColor: '#10b981',
    password: passwordHash
  });

  const sneha = await User.create({
    username: 'sneha',
    name: 'Sneha Roy',
    bio: 'Coffee lover & avid reader ☕📚',
    avatarColor: '#f59e0b',
    password: passwordHash
  });

  // Rahul and Priya are friends
  await Friendship.create({
    user1: rahul._id,
    user2: priya._id
  });

  // Messages between Rahul and Priya
  await Message.create({
    sender: rahul._id,
    receiver: priya._id,
    content: 'Hey Priya! Welcome to the chat app 👋',
    read: true,
    createdAt: new Date(Date.now() - 3600000)
  });

  await Message.create({
    sender: priya._id,
    receiver: rahul._id,
    content: 'Hey Rahul! Looks amazing, love the clean UI!',
    read: true,
    createdAt: new Date(Date.now() - 1800000)
  });

  // Pending friend request from Amit to Rahul
  await FriendRequest.create({
    sender: amit._id,
    receiver: rahul._id,
    status: 'pending'
  });

  console.log('✅ Demo users seeded successfully in MongoDB!');
}

class MongoDatabase {
  async findUserByUsername(username) {
    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) return null;
    const json = user.toJSON();
    json.passwordHash = user.password;
    return json;
  }

  async findUserById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const user = await User.findById(id);
    if (!user) return null;
    const json = user.toJSON();
    json.passwordHash = user.password;
    return json;
  }

  async getAllUsers() {
    const users = await User.find();
    return users.map(u => u.toJSON());
  }

  async createUser({ username, name, passwordHash, bio, avatarColor }) {
    const user = await User.create({
      username: username.toLowerCase().trim(),
      name: name.trim(),
      password: passwordHash,
      bio: bio || 'Hey there! I am using ChatApp.',
      avatarColor: avatarColor || '#4f46e5'
    });
    const json = user.toJSON();
    json.passwordHash = user.password;
    return json;
  }

  async areFriends(user1Id, user2Id) {
    if (!mongoose.Types.ObjectId.isValid(user1Id) || !mongoose.Types.ObjectId.isValid(user2Id)) {
      return false;
    }
    const count = await Friendship.countDocuments({
      $or: [
        { user1: user1Id, user2: user2Id },
        { user1: user2Id, user2: user1Id }
      ]
    });
    return count > 0;
  }

  async getFriends(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];

    const friendships = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }]
    }).populate('user1 user2');

    return friendships.map(f => {
      const isUser1 = f.user1._id.toString() === userId.toString();
      const friend = isUser1 ? f.user2 : f.user1;
      return friend.toJSON();
    });
  }

  async addFriendship(user1Id, user2Id) {
    const already = await this.areFriends(user1Id, user2Id);
    if (!already) {
      await Friendship.create({
        user1: user1Id,
        user2: user2Id
      });
    }
  }

  async removeFriendship(user1Id, user2Id) {
    await Friendship.deleteMany({
      $or: [
        { user1: user1Id, user2: user2Id },
        { user1: user2Id, user2: user1Id }
      ]
    });
  }

  async findRequest(senderId, receiverId) {
    return await FriendRequest.findOne({
      status: 'pending',
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });
  }

  async createFriendRequest(senderId, receiverId) {
    const req = await FriendRequest.create({
      sender: senderId,
      receiver: receiverId,
      status: 'pending'
    });
    return req.toJSON();
  }

  async getFriendRequestsForUser(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { incoming: [], outgoing: [] };
    }

    const incomingDocs = await FriendRequest.find({
      receiver: userId,
      status: 'pending'
    }).populate('sender');

    const incoming = incomingDocs
      .filter(r => r.sender)
      .map(r => ({
        id: r._id.toString(),
        senderId: r.sender._id.toString(),
        receiverId: userId,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        user: r.sender.toJSON()
      }));

    const outgoingDocs = await FriendRequest.find({
      sender: userId,
      status: 'pending'
    }).populate('receiver');

    const outgoing = outgoingDocs
      .filter(r => r.receiver)
      .map(r => ({
        id: r._id.toString(),
        senderId: userId,
        receiverId: r.receiver._id.toString(),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        user: r.receiver.toJSON()
      }));

    return { incoming, outgoing };
  }

  async respondToRequest(requestId, userId, accept) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) return null;

    const request = await FriendRequest.findOne({
      _id: requestId,
      receiver: userId,
      status: 'pending'
    });
    if (!request) return null;

    if (accept) {
      request.status = 'accepted';
      await request.save();
      await this.addFriendship(request.sender, request.receiver);
    } else {
      request.status = 'rejected';
      await request.save();
    }

    return request.toJSON();
  }

  async cancelRequest(requestId, userId) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) return false;

    const res = await FriendRequest.deleteOne({
      _id: requestId,
      sender: userId,
      status: 'pending'
    });
    return res.deletedCount > 0;
  }

  async saveMessage({ senderId, receiverId, content }) {
    const msg = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content
    });
    return msg.toJSON();
  }

  async getMessagesBetween(user1Id, user2Id) {
    if (!mongoose.Types.ObjectId.isValid(user1Id) || !mongoose.Types.ObjectId.isValid(user2Id)) {
      return [];
    }

    const msgs = await Message.find({
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id }
      ]
    }).sort({ createdAt: 1 });

    return msgs.map(m => m.toJSON());
  }

  async getLastMessageBetween(user1Id, user2Id) {
    if (!mongoose.Types.ObjectId.isValid(user1Id) || !mongoose.Types.ObjectId.isValid(user2Id)) {
      return null;
    }

    const msg = await Message.findOne({
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id }
      ]
    }).sort({ createdAt: -1 });

    return msg ? msg.toJSON() : null;
  }

  async markMessagesAsRead(senderId, receiverId) {
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return;
    }

    await Message.updateMany(
      { sender: senderId, receiver: receiverId, read: false },
      { $set: { read: true } }
    );
  }
}

export const db = new MongoDatabase();
