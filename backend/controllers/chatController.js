const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// ✅ HELPER: Check if user is admin
const isUserAdmin = (chat, userId) => {
  return chat.groupAdmins.some(admin => 
    admin.toString() === userId.toString()
  );
};

// @desc    Create or access one-on-one chat
// @route   POST /api/chats
// @access  Private
const accessChat = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }
    
    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Find existing chat
    let chat = await Chat.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } }
      ]
    })
    .populate('users', 'name email avatar isOnline lastSeen')
    .populate('latestMessage');
    
    if (chat) {
      // Populate sender of latest message
      chat = await User.populate(chat, {
        path: 'latestMessage.sender',
        select: 'name email avatar'
      });
      
      return res.status(200).json({
        success: true,
        chat
      });
    }
    
    // Create new chat
    const newChat = await Chat.create({
      chatName: 'sender',
      isGroupChat: false,
      users: [req.user._id, userId]
    });
    
    const fullChat = await Chat.findById(newChat._id)
      .populate('users', 'name email avatar isOnline lastSeen');
    
    res.status(201).json({
      success: true,
      chat: fullChat
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get all chats for user
// @route   GET /api/chats
// @access  Private
const getChats = async (req, res, next) => {
  try {
    let chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } }
    })
    .populate('users', 'name email avatar isOnline lastSeen')
    .populate('groupAdmins', 'name email avatar')
    .populate('latestMessage')
    .sort({ updatedAt: -1 });
    
    // Populate sender of latest message
    chats = await User.populate(chats, {
      path: 'latestMessage.sender',
      select: 'name email avatar'
    });
    
    res.status(200).json({
      success: true,
      count: chats.length,
      chats
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Create group chat
// @route   POST /api/chats/group
// @access  Private
const createGroupChat = async (req, res, next) => {
  try {
    const { name, users, description } = req.body;
    
    if (!name || !users || users.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Group name and at least 1 user are required'
      });
    }
    
    // Parse users if string
    const usersList = typeof users === 'string' ? JSON.parse(users) : users;
    
    // Add current user to the group
    usersList.push(req.user._id);
    
    // Remove duplicates
    const uniqueUsers = [...new Set(usersList.map(u => u.toString()))];
    
    const groupChat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      users: uniqueUsers,
      groupAdmins: [req.user._id],
      description: description || ''
    });
    
    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('users', 'name email avatar isOnline lastSeen')
      .populate('groupAdmins', 'name email avatar');
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      chat: fullGroupChat
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Update group chat
// @route   PUT /api/chats/group/:id
// @access  Private
const updateGroupChat = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;
    
    const chat = await Chat.findById(id);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    if (!chat.isGroupChat) {
      return res.status(400).json({
        success: false,
        message: 'This is not a group chat'
      });
    }
    
    // Only admin can update group
    if (!isUserAdmin(chat, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can update group details'
      });
    }
    
    if (name) chat.chatName = name;
    if (description !== undefined) chat.description = description;
    
    await chat.save();
    
    const updatedChat = await Chat.findById(id)
      .populate('users', 'name email avatar isOnline lastSeen')
      .populate('groupAdmins', 'name email avatar');
    
    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      chat: updatedChat
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Update group avatar
// @route   PUT /api/chats/group/:id/avatar
// @access  Private
const updateGroupAvatar = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }
    
    const chat = await Chat.findById(id);
    
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Only admin can update avatar
    if (!isUserAdmin(chat, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can update group avatar'
      });
    }
    
    // Delete old avatar
    if (chat.groupAvatar.public_id) {
      await deleteFromCloudinary(chat.groupAvatar.public_id);
    }
    
    // Upload new avatar
    const result = await uploadToCloudinary(req.file.buffer, 'group-avatars', 'image');
    
    chat.groupAvatar = {
      public_id: result.public_id,
      url: result.secure_url
    };
    
    await chat.save();
    
    res.status(200).json({
      success: true,
      message: 'Group avatar updated successfully',
      avatar: chat.groupAvatar
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Add user to group
// @route   PUT /api/chats/group/:id/add
// @access  Private
const addToGroup = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const { id } = req.params;
    
    const chat = await Chat.findById(id);
    
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Only admin can add users
    if (!isUserAdmin(chat, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can add users'
      });
    }
    
    // Check if user already in group
    if (chat.users.some(u => u.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'User already in group'
      });
    }
    
    chat.users.push(userId);
    await chat.save();
    
    const updatedChat = await Chat.findById(id)
      .populate('users', 'name email avatar isOnline lastSeen')
      .populate('groupAdmins', 'name email avatar');
    
    res.status(200).json({
      success: true,
      message: 'User added to group',
      chat: updatedChat
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Remove user from group
// @route   PUT /api/chats/group/:id/remove
// @access  Private
const removeFromGroup = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const { id } = req.params;
    
    const chat = await Chat.findById(id);
    
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Admin or self can remove
    const isAdmin = isUserAdmin(chat, req.user._id);
    const isSelf = userId === req.user._id.toString();
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove users'
      });
    }

    const isTargetAdmin = isUserAdmin(chat, userId);

    // Only admins can remove other admins
    if (isTargetAdmin && !isSelf && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Only admins can remove other admins'
      });
    }
    
    // Remove from users
    chat.users = chat.users.filter(u => u.toString() !== userId);

     // Also remove from admins if they were an admin
    chat.groupAdmins = chat.groupAdmins.filter(a => a.toString() !== userId);

    // If no admins left, promote the first user
    if (chat.groupAdmins.length === 0 && chat.users.length > 0) {
      chat.groupAdmins.push(chat.users[0]);
    }

    // If no users left, delete the group
    if (chat.users.length === 0) {
      await Chat.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: 'Group deleted as last member left'
      });
    }

    await chat.save();

    const updatedChat = await Chat.findById(id)
      .populate('users', 'name email avatar isOnline lastSeen')
      .populate('groupAdmins', 'name email avatar');
    
    res.status(200).json({
      success: true,
      message: isSelf ? 'Left group successfully' : 'User removed from group',
      chat: updatedChat
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Promote user to admin
// @route   PUT /api/chats/group/:id/add-admin
// @access  Private
const addAdmin = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const chat = await Chat.findById(id);
    
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Only existing admins can add new admins
    if (!isUserAdmin(chat, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can promote members'
      });
    }
    
    // Check if user is a member
    if (!chat.users.some(u => u.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this group'
      });
    }
    
    // Check if already admin
    if (isUserAdmin(chat, userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already an admin'
      });
    }
    
    chat.groupAdmins.push(userId);
    await chat.save();
    
    const updatedChat = await Chat.findById(id)
      .populate('users', 'name email avatar isOnline lastSeen')
      .populate('groupAdmins', 'name email avatar');
    
    // Emit socket event for real-time update
    if (req.io) {
      chat.users.forEach(user => {
        req.io.to(user.toString()).emit('groupUpdated', updatedChat);
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User promoted to admin',
      chat: updatedChat
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Demote admin to member
// @route   PUT /api/chats/group/:id/remove-admin
// @access  Private
const removeAdmin = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const chat = await Chat.findById(id);
    
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Only admins can demote
    if (!isUserAdmin(chat, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can demote admins'
      });
    }
    
    // Check if target is actually an admin
    if (!isUserAdmin(chat, userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not an admin'
      });
    }
    
    // Prevent removing the last admin
    if (chat.groupAdmins.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the last admin. Promote another member first.'
      });
    }
    
    chat.groupAdmins = chat.groupAdmins.filter(a => a.toString() !== userId);
    await chat.save();
    
    const updatedChat = await Chat.findById(id)
      .populate('users', 'name email avatar isOnline lastSeen')
      .populate('groupAdmins', 'name email avatar');
    
    // Emit socket event
    if (req.io) {
      chat.users.forEach(user => {
        req.io.to(user.toString()).emit('groupUpdated', updatedChat);
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Admin demoted to member',
      chat: updatedChat
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Delete chat
// @route   DELETE /api/chats/:id
// @access  Private
const deleteChat = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const chat = await Chat.findById(id);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    if (chat.isGroupChat) {
      // Any admin can delete the group
      if (!isUserAdmin(chat, req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can delete group'
        });
      }
    } else {
      const isParticipant = chat.users.some(u => u.toString() === req.user._id.toString());
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized'
        });
      }
    }
    
    // Delete all messages in the chat
    await Message.deleteMany({ chat: id });
    
    // Delete chat
    await Chat.findByIdAndDelete(id);

    if (req.io) {
      chat.users.forEach((user) => {
        req.io.to(user._id.toString()).emit('chatDeleted', { 
          chatId: id,
          deletedBy: req.user._id
        });
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  accessChat,
  getChats,
  createGroupChat,
  updateGroupChat,
  updateGroupAvatar,
  addToGroup,
  removeFromGroup,
  addAdmin,
  removeAdmin,
  deleteChat
};