const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat')
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get all users (for searching)
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    
    let query = { _id: { $ne: req.user._id } };
    
    if (search) {
      query = {
        ...query,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const users = await User.find(query)
      .select('name email avatar bio isOnline lastSeen')
      .limit(20)
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email avatar bio isOnline lastSeen createdAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;
    
    const updateData = {};
    
    if (name) {
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 2 and 50 characters'
        });
      }
      updateData.name = name.trim();
    }
    
    if (bio !== undefined) {
      if (bio.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 200 characters'
        });
      }
      updateData.bio = bio.trim();
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('name email avatar bio isOnline');
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Update avatar
// @route   PUT /api/users/avatar
// @access  Private
const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    // Delete old avatar if exists
    if (user.avatar.public_id) {
      await deleteFromCloudinary(user.avatar.public_id);
    }
    
    // Upload new avatar
    const result = await uploadToCloudinary(req.file.buffer, 'avatars', 'image');
    
    user.avatar = {
      public_id: result.public_id,
      url: result.secure_url
    };
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }
    
    const user = await User.findById(req.user._id).select('+password');
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get online users
// @route   GET /api/users/online
// @access  Private
const getOnlineUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      isOnline: true
    }).select('name avatar isOnline');
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Account
// @route   PUT /api/users/delete-account
// @access  Private
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;
    
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    // 1. Verify Password
    const user = await User.findById(userId).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    // 2. Proceed with Deletion Logic 
    if (user.avatar?.public_id) await deleteFromCloudinary(user.avatar.public_id);

    // Clean up Groups
    const groupChats = await Chat.find({ isGroupChat: true, users: userId });
    for (const chat of groupChats) {
      // Remove user from users array
      chat.users = chat.users.filter(u => u.toString() !== userId.toString());

      // Remove user from admins array
      chat.groupAdmins = chat.groupAdmins.filter(a => a.toString() !== userId.toString());

      // If no users left, delete the group
      if (chat.users.length === 0) {
        await Chat.findByIdAndDelete(chat._id);
        await Message.deleteMany({ chat: chat._id });
      } else {
        // If no admins left, promote first user
        if (chat.groupAdmins.length === 0) {
          chat.groupAdmins.push(chat.users[0]);
        }
        await chat.save();
      }
    }
      
    // Clean up 1-on-1 Chats
    await Chat.updateMany(
      { isGroupChat: false, users: userId },
      { $pull: { users: userId } }
    );

    // Delete User
    await User.findByIdAndDelete(userId);

    if (req.io) req.io.emit('userOffline', { userId });

    res.status(200).json({ success: true, message: 'Account deleted successfully' });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateProfile,
  updateAvatar,
  changePassword,
  getOnlineUsers,
  deleteAccount,
};