import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db, connectDB } from './db.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'chat_app_jwt_secret_token_12345';

// Avatar color palette for newly registered users
const AVATAR_COLORS = [
  '#4f46e5', // Indigo
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#ea580c', // Orange
  '#059669', // Emerald
  '#0284c7', // Sky
  '#d97706', // Amber
  '#dc2626'  // Red
];

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Online users tracking: userId -> Set of socket.id
const onlineUsers = new Map();

function isUserOnline(userId) {
  const sockets = onlineUsers.get(userId);
  return !!sockets && sockets.size > 0;
}

function getOnlineUserIds() {
  const ids = [];
  for (const [userId, sockets] of onlineUsers.entries()) {
    if (sockets.size > 0) {
      ids.push(userId);
    }
  }
  return ids;
}

// Auth Middleware for Express
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

// ---------------- AUTH ROUTES ----------------

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, name, password, bio } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Username, name, and password are required.' });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters.' });
    }

    const existingUser = await db.findUserByUsername(username.trim());
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const newUser = await db.createUser({
      username: username.trim().toLowerCase(),
      name: name.trim(),
      bio: bio ? bio.trim() : 'Hey there! I am using ChatApp.',
      avatarColor: randomColor,
      passwordHash
    });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userPayload = {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      bio: newUser.bio,
      avatarColor: newUser.avatarColor
    };

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await db.findUserByUsername(username.trim());
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatarColor: user.avatarColor
    };

    res.json({
      message: 'Logged in successfully',
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Current User profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatarColor: user.avatarColor
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ---------------- USERS & EXPLORE ROUTES ----------------

// Get all users (with friendship status relative to req.user)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const allUsers = await db.getAllUsers();
    const requests = await db.getFriendRequestsForUser(currentUserId);
    const friends = await db.getFriends(currentUserId);
    const friendIdSet = new Set(friends.map(f => f.id));

    const incomingMap = new Map();
    requests.incoming.forEach(r => incomingMap.set(r.senderId, r.id));

    const outgoingMap = new Map();
    requests.outgoing.forEach(r => outgoingMap.set(r.receiverId, r.id));

    const usersWithStatus = allUsers
      .filter(u => u.id !== currentUserId)
      .map(u => {
        let friendshipStatus = 'none';
        let requestId = null;

        if (friendIdSet.has(u.id)) {
          friendshipStatus = 'friends';
        } else if (incomingMap.has(u.id)) {
          friendshipStatus = 'pending_received';
          requestId = incomingMap.get(u.id);
        } else if (outgoingMap.has(u.id)) {
          friendshipStatus = 'pending_sent';
          requestId = outgoingMap.get(u.id);
        }

        return {
          id: u.id,
          username: u.username,
          name: u.name,
          bio: u.bio,
          avatarColor: u.avatarColor,
          friendshipStatus,
          requestId,
          isOnline: isUserOnline(u.id)
        };
      });

    res.json(usersWithStatus);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Failed to retrieve users.' });
  }
});

// ---------------- FRIEND ROUTES ----------------

// Get user's friends list with last message and online status
app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const friends = await db.getFriends(currentUserId);

    // Attach last message and online status
    const friendsWithDetails = await Promise.all(
      friends.map(async f => {
        const lastMsg = await db.getLastMessageBetween(currentUserId, f.id);
        const messages = await db.getMessagesBetween(currentUserId, f.id);
        const unreadCount = messages.filter(m => m.senderId === f.id && !m.read).length;

        return {
          ...f,
          isOnline: isUserOnline(f.id),
          lastMessage: lastMsg ? {
            content: lastMsg.content,
            timestamp: lastMsg.timestamp,
            senderId: lastMsg.senderId
          } : null,
          unreadCount
        };
      })
    );

    // Sort friends by most recent message or name
    friendsWithDetails.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    res.json(friendsWithDetails);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Failed to retrieve friends.' });
  }
});

// Get incoming and outgoing friend requests
app.get('/api/friends/requests', authenticateToken, async (req, res) => {
  try {
    const requests = await db.getFriendRequestsForUser(req.user.id);
    res.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Failed to retrieve friend requests.' });
  }
});

// Send a friend request
app.post('/api/friends/request/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { targetUserId } = req.params;

    if (senderId === targetUserId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
    }

    const targetUser = await db.findUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user does not exist.' });
    }

    const alreadyFriends = await db.areFriends(senderId, targetUserId);
    if (alreadyFriends) {
      return res.status(400).json({ message: 'You are already friends with this user.' });
    }

    const existingRequest = await db.findRequest(senderId, targetUserId);
    if (existingRequest) {
      return res.status(400).json({ message: 'A pending friend request already exists.' });
    }

    const request = await db.createFriendRequest(senderId, targetUserId);
    const senderUser = await db.findUserById(senderId);

    // Real-time notify the receiver
    io.to(`room_${targetUserId}`).emit('friend_request_received', {
      requestId: request.id,
      request,
      sender: {
        id: senderUser.id,
        username: senderUser.username,
        name: senderUser.name,
        bio: senderUser.bio,
        avatarColor: senderUser.avatarColor
      }
    });

    res.status(201).json({
      message: 'Friend request sent successfully.',
      request
    });
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ message: 'Failed to send friend request.' });
  }
});

// Accept a friend request
app.post('/api/friends/accept/:requestId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = await db.respondToRequest(requestId, userId, true);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found or already processed.' });
    }

    const otherUserId = request.senderId;
    const currentUser = await db.findUserById(userId);
    const otherUser = await db.findUserById(otherUserId);

    // Notify both users via socket
    io.to(`room_${userId}`).emit('friend_request_accepted', {
      requestId,
      friend: {
        id: otherUser.id,
        username: otherUser.username,
        name: otherUser.name,
        bio: otherUser.bio,
        avatarColor: otherUser.avatarColor,
        isOnline: isUserOnline(otherUser.id)
      }
    });

    io.to(`room_${otherUserId}`).emit('friend_request_accepted', {
      requestId,
      friend: {
        id: currentUser.id,
        username: currentUser.username,
        name: currentUser.name,
        bio: currentUser.bio,
        avatarColor: currentUser.avatarColor,
        isOnline: isUserOnline(currentUser.id)
      }
    });

    res.json({ message: 'Friend request accepted!', request });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ message: 'Failed to accept friend request.' });
  }
});

// Reject a friend request
app.post('/api/friends/reject/:requestId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = await db.respondToRequest(requestId, userId, false);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found.' });
    }

    // Notify sender that request was rejected/handled
    io.to(`room_${request.senderId}`).emit('friend_request_rejected', { requestId });
    io.to(`room_${userId}`).emit('friend_request_handled', { requestId });

    res.json({ message: 'Friend request declined.' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Failed to reject friend request.' });
  }
});

// Cancel a sent friend request
app.post('/api/friends/cancel/:requestId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const cancelled = await db.cancelRequest(requestId, userId);
    if (!cancelled) {
      return res.status(404).json({ message: 'Friend request not found or cannot be cancelled.' });
    }

    // Broadcast cancel to any potential receiver room
    io.emit('friend_request_cancelled', { requestId });

    res.json({ message: 'Friend request cancelled.' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ message: 'Failed to cancel request.' });
  }
});

// Remove / Unfriend
app.delete('/api/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    await db.removeFriendship(userId, friendId);

    // Notify both
    io.to(`room_${userId}`).emit('friend_removed', { friendId });
    io.to(`room_${friendId}`).emit('friend_removed', { friendId: userId });

    res.json({ message: 'Friend removed successfully.' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Failed to remove friend.' });
  }
});

// ---------------- MESSAGE ROUTES ----------------

// Get messages between current user and friend
app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.params;

    const areFriends = await db.areFriends(currentUserId, otherUserId);
    if (!areFriends) {
      return res.status(403).json({ message: 'You can only view messages with your friends.' });
    }

    const messages = await db.getMessagesBetween(currentUserId, otherUserId);
    await db.markMessagesAsRead(otherUserId, currentUserId);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Failed to retrieve messages.' });
  }
});

// Post message via REST endpoint (fallback or alternative to socket)
app.post('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { otherUserId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    const areFriends = await db.areFriends(senderId, otherUserId);
    if (!areFriends) {
      return res.status(403).json({ message: 'You must be friends to chat.' });
    }

    const message = await db.saveMessage({
      senderId,
      receiverId: otherUserId,
      content: content.trim()
    });

    // Real-time broadcast
    io.to(`room_${otherUserId}`).emit('receive_message', message);
    io.to(`room_${senderId}`).emit('message_sent', message);

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message.' });
  }
});

// ---------------- SOCKET.IO REALTIME ENGINE ----------------

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid socket authentication'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  const userRoom = `room_${userId}`;
  socket.join(userRoom);

  // Track online status
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Broadcast online status to everyone
  io.emit('user_status_change', {
    userId,
    isOnline: true,
    onlineUsers: getOnlineUserIds()
  });

  // Handle real-time messaging
  socket.on('send_message', async ({ receiverId, content }, callback) => {
    try {
      if (!content || !content.trim()) {
        if (callback) callback({ error: 'Message cannot be empty.' });
        return;
      }

      const areFriends = await db.areFriends(userId, receiverId);
      if (!areFriends) {
        if (callback) callback({ error: 'You can only message accepted friends.' });
        return;
      }

      const message = await db.saveMessage({
        senderId: userId,
        receiverId,
        content: content.trim()
      });

      // Deliver to receiver's room
      io.to(`room_${receiverId}`).emit('receive_message', message);

      // Deliver to sender's sockets
      io.to(userRoom).emit('message_sent', message);

      if (callback) callback({ success: true, message });
    } catch (err) {
      console.error('Socket send_message error:', err);
      if (callback) callback({ error: 'Failed to deliver message' });
    }
  });

  // Typing indicators
  socket.on('typing_start', ({ receiverId }) => {
    io.to(`room_${receiverId}`).emit('user_typing', {
      senderId: userId,
      isTyping: true
    });
  });

  socket.on('typing_stop', ({ receiverId }) => {
    io.to(`room_${receiverId}`).emit('user_typing', {
      senderId: userId,
      isTyping: false
    });
  });

  // ---------------- WEBRTC VIDEO / AUDIO CALL SIGNALING ----------------
  socket.on('call_user', ({ userToCall, signalData, isVideo, fromName, fromAvatarColor }) => {
    io.to(`room_${userToCall}`).emit('incoming_call', {
      from: userId,
      signal: signalData,
      fromName: fromName || socket.user.name,
      fromAvatarColor: fromAvatarColor || '#4f46e5',
      isVideo: isVideo !== false
    });
  });

  socket.on('answer_call', ({ to, signal }) => {
    io.to(`room_${to}`).emit('call_accepted', { signal, from: userId });
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    io.to(`room_${to}`).emit('ice_candidate', { candidate, from: userId });
  });

  socket.on('end_call', ({ to }) => {
    if (to) {
      io.to(`room_${to}`).emit('call_ended', { from: userId });
    }
  });

  socket.on('reject_call', ({ to }) => {
    if (to) {
      io.to(`room_${to}`).emit('call_rejected', { from: userId });
    }
  });

  // Disconnection
  socket.on('disconnect', () => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit('user_status_change', {
          userId,
          isOnline: false,
          onlineUsers: getOnlineUserIds()
        });
      }
    }
  });
});

// Start Server
async function startServer() {
  await connectDB();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ChatApp Backend running on http://localhost:${PORT}`);
  });
}

startServer();
