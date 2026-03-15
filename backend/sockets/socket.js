const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });
  
  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Join personal room
    socket.join(socket.userId);
    
    // Update user status to online
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      socketId: socket.id
    });
    
    // Broadcast online status to all connected users
    socket.broadcast.emit('userOnline', {
      userId: socket.userId,
      isOnline: true
    });

    try {
      const onlineUsers = await User.find({ isOnline: true }).select('_id');
      const onlineUserIds = onlineUsers.map(user => user._id.toString());
      
      // Send list to the specific user who just connected
      io.to(socket.userId).emit('onlineUsersList', onlineUserIds);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
    
    // Join chat room
    socket.on('joinChat', (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat: ${chatId}`);
    });
    
    // Leave chat room
    socket.on('leaveChat', (chatId) => {
      socket.leave(chatId);
      console.log(`User ${socket.userId} left chat: ${chatId}`);
    });
    
    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('typing', {
        chatId: data.chatId,
        userId: socket.userId,
        userName: socket.user.name
      });
    });
    
    // Stop typing
    socket.on('stopTyping', (data) => {
      socket.to(data.chatId).emit('stopTyping', {
        chatId: data.chatId,
        userId: socket.userId
      });
    });
    
    // Message delivered
    socket.on('messageDelivered', (data) => {
      socket.to(data.senderId).emit('messageDelivered', {
        messageId: data.messageId,
        chatId: data.chatId
      });
    });
    
    // Message seen
    socket.on('messageSeen', (data) => {
      socket.to(data.senderId).emit('messageSeen', {
        messageId: data.messageId,
        chatId: data.chatId,
        seenBy: socket.userId
      });
    });

    // ✅ NEW: Handle Group Updates (Promote/Demote/Add/Remove)
    socket.on('groupUpdated', (chat) => {
      // Re-emit to all members of the chat
      if (chat && chat.users) {
        chat.users.forEach(user => {
          // Send to everyone except the sender (optional, but usually safer to send to all)
          // or just emit to the user's room
          io.to(user._id ? user._id.toString() : user.toString()).emit('groupUpdated', chat);
        });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Update user status to offline
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: null
      });
      
      // Broadcast offline status
      socket.broadcast.emit('userOffline', {
        userId: socket.userId,
        isOnline: false,
        lastSeen: new Date()
      });
    });
    
    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
  
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };