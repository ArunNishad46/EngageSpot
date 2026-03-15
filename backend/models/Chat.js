const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatName: {
    type: String,
    trim: true
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  latestMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  groupAdmins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  groupAvatar: {
    public_id: String,
    url: {
      type: String,
      default: 'https://res.cloudinary.com/dcwqfh5f9/image/upload/v1771095910/user_icon_006_hswer1.webp'
    }
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, { timestamps: true });

// Index for better query performance
chatSchema.index({ users: 1 });
chatSchema.index({ updatedAt: -1 });

// Helper method to check if user is admin
chatSchema.methods.isAdmin = function(userId) {
  return this.groupAdmins.some(admin => 
    admin.toString() === userId.toString()
  );
};

module.exports = mongoose.model('Chat', chatSchema);