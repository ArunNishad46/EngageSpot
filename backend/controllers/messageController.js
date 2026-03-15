const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { getIO } = require('../sockets/socket');

// @desc    Send message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { chatId, content, replyTo } = req.body;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }
    
    // Check if chat exists and user is part of it
    const chat = await Chat.findOne({
      _id: chatId,
      users: { $elemMatch: { $eq: req.user._id } }
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or you are not a member'
      });
    }
    
    let messageData = {
      sender: req.user._id,
      chat: chatId,
      content: content || '',
      messageType: 'text'
    };
    
    // Handle file upload
    if (req.file) {
      const mimeType = req.file.mimetype;
      let folder = 'files';
      let resourceType = 'raw';
      let messageType = 'file';
      
      if (mimeType.startsWith('image/')) {
        folder = 'images';
        resourceType = 'image';
        messageType = 'image';
      } else if (mimeType.startsWith('video/')) {
        folder = 'videos';
        resourceType = 'video';
        messageType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        folder = 'audio';
        resourceType = 'video';
        messageType = 'audio';
      }
      
      const result = await uploadToCloudinary(req.file.buffer, folder, resourceType);
      
      messageData.messageType = messageType;
      messageData.file = {
        public_id: result.public_id,
        url: result.secure_url,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: mimeType
      };
    }
    
    if (!messageData.content && !messageData.file) {
      return res.status(400).json({
        success: false,
        message: 'Message content or file is required'
      });
    }
    
    if (replyTo) {
      messageData.replyTo = replyTo;
    }
    
    // Create message
    let message = await Message.create(messageData);
    
    // Populate message
    message = await Message.findById(message._id)
      .populate('sender', 'name email avatar')
      .populate('chat')
      .populate('replyTo');
    
    message = await Chat.populate(message, {
      path: 'chat.users',
      select: 'name email avatar isOnline'
    });
    
    // Update latest message in chat
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id
    });
    
    // Emit socket event
    const io = getIO();
    chat.users.forEach(user => {
      if (user.toString() !== req.user._id.toString()) {
        io.to(user.toString()).emit('newMessage', message);
      }
    });
    
    res.status(201).json({
      success: true,
      message
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Check if user is part of chat
    const chat = await Chat.findOne({
      _id: chatId,
      users: { $elemMatch: { $eq: req.user._id } }
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or you are not a member'
      });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const messages = await Message.find({
      chat: chatId,
      deletedFor: { $ne: req.user._id },
      deletedForEveryone: { $ne: true }
    })
    .populate('sender', 'name email avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
    
    const total = await Message.countDocuments({
      chat: chatId,
      deletedFor: { $ne: req.user._id },
      deletedForEveryone: { $ne: true }
    });
    
    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      messages: messages.reverse()
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message for me
// @route   DELETE /api/messages/:id/delete-for-me
// @access  Private
const deleteForMe = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Add user to deletedFor array
    if (!message.deletedFor.includes(req.user._id)) {
      message.deletedFor.push(req.user._id);
      await message.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Message deleted'
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message for everyone
// @route   DELETE /api/messages/:id/delete-for-everyone
// @access  Private
const deleteForEveryone = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const message = await Message.findById(id).populate('chat');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only sender can delete for everyone
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages for everyone'
      });
    }
    
    // Check if message is within 1 hour
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - message.createdAt > oneHour) {
      return res.status(400).json({
        success: false,
        message: 'You can only delete messages within 1 hour of sending'
      });
    }
    
    // Delete file from cloudinary if exists
    if (message.file && message.file.public_id) {
      const resourceType = message.messageType === 'image' ? 'image' : message.messageType === 'video' || message.messageType === 'audio' ? 'video' : 'raw';
      await deleteFromCloudinary(message.file.public_id, resourceType);
    }
    
    message.deletedForEveryone = true;
    message.content = 'This message was deleted';
    message.file = undefined;
    await message.save();
    
    // Emit socket event
    const io = getIO();
    message.chat.users.forEach(user => {
      io.to(user.toString()).emit('messageDeleted', {
        messageId: id,
        chatId: message.chat._id
      });
    });
    
    res.status(200).json({
      success: true,
      message: 'Message deleted for everyone'
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Update message status (delivered/seen)
// @route   PUT /api/messages/:id/status
// @access  Private
const updateMessageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['delivered', 'seen'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const message = await Message.findById(id).populate('chat');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Cannot update own message status
    if (message.sender.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update status for your own message'
      });
    }
    
    if (status === 'delivered') {
      const alreadyDelivered = message.deliveredTo.some(
        d => d.user.toString() === req.user._id.toString()
      );
      
      if (!alreadyDelivered) {
        message.deliveredTo.push({
          user: req.user._id,
          deliveredAt: new Date()
        });
        message.status = 'delivered';
      }
    } else if (status === 'seen') {
      const alreadySeen = message.seenBy.some(
        s => s.user.toString() === req.user._id.toString()
      );
      
      if (!alreadySeen) {
        message.seenBy.push({
          user: req.user._id,
          seenAt: new Date()
        });
        message.status = 'seen';
      }
    }
    
    await message.save();
    
    // Emit socket event to sender
    const io = getIO();
    io.to(message.sender.toString()).emit('messageStatusUpdated', {
      messageId: id,
      status: message.status,
      chatId: message.chat._id
    });
    
    res.status(200).json({
      success: true,
      message: 'Status updated'
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all messages as seen in a chat
// @route   PUT /api/messages/chat/:chatId/seen
// @access  Private
const markChatAsSeen = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    
    // Check if user is part of chat
    const chat = await Chat.findOne({
      _id: chatId,
      users: { $elemMatch: { $eq: req.user._id } }
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Update all unread messages
    const result = await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: req.user._id },
        'seenBy.user': { $ne: req.user._id }
      },
      {
        $push: {
          seenBy: {
            user: req.user._id,
            seenAt: new Date()
          }
        },
        $set: { status: 'seen' }
      }
    );
    
    // Emit socket event
    const io = getIO();
    chat.users.forEach(user => {
      if (user.toString() !== req.user._id.toString()) {
        io.to(user.toString()).emit('chatSeen', {
          chatId,
          userId: req.user._id
        });
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Messages marked as seen',
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getMessages,
  deleteForMe,
  deleteForEveryone,
  updateMessageStatus,
  markChatAsSeen
};