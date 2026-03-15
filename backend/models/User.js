const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  avatar: {
    public_id: String,
    url: {
      type: String,
      default: 'https://res.cloudinary.com/dcwqfh5f9/image/upload/v1771015088/default-user_rw49n9.jpg'
    }
  },
  bio: {
    type: String,
    maxlength: [200, 'Bio cannot exceed 200 characters'],
    default: 'Hey there! I am using EngageSpot'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  socketId: String,
  
  // 2FA fields
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorCode: String,
  twoFactorExpires: Date,
  
  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: String,
  emailVerificationExpires: Date
  
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate 6-digit OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

// Set 2FA code
userSchema.methods.set2FACode = function() {
  const code = this.generateOTP();
  this.twoFactorCode = bcrypt.hashSync(code, 10);
  this.twoFactorExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return code;
};

// Verify 2FA code
userSchema.methods.verify2FACode = function(code) {
  if (!this.twoFactorCode || !this.twoFactorExpires) {
    return false;
  }
  if (Date.now() > this.twoFactorExpires) {
    return false;
  }
  return bcrypt.compareSync(code, this.twoFactorCode);
};

// Set password reset token
userSchema.methods.setResetPasswordToken = function() {
  const token = this.generateOTP();
  this.resetPasswordToken = bcrypt.hashSync(token, 10);
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  return token;
};

// Verify reset token
userSchema.methods.verifyResetToken = function(token) {
  if (!this.resetPasswordToken || !this.resetPasswordExpires) {
    return false;
  }
  if (Date.now() > this.resetPasswordExpires) {
    return false;
  }
  return bcrypt.compareSync(token, this.resetPasswordToken);
};

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1 });

module.exports = mongoose.model('User', userSchema);