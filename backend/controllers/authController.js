const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken, clearToken } = require('../utils/generateToken');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/sendEmail');
const { body, validationResult } = require('express-validator');

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }
    
    const { name, email, password } = req.body;

    if(!name || !email || !password){
      return res.status(400).json({
        success: false,
        message: 'All Fields are required'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists. Please login.'
      });
    }
    
    // Create user
    const user = await User.create({
      name,
      email,
      password
    });
    
    // Generate email verification code
    const verificationCode = user.generateOTP();
    user.emailVerificationCode = require('bcryptjs').hashSync(verificationCode, 10);
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    
    // Send verification email
    try {
      await sendOTPEmail(email, verificationCode, 'verify');
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }
    
    // Response - NO TOKEN GENERATED HERE
    // Requirement: "if not verify then not go to home"

    res.status(201).json({
      success: true,
      requireVerification: true,
      message: 'Registration successful. Verification code sent to your email.',
      userId: user._id, // Send ID so frontend can use it for the verify request
      email: user.email
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }
    
    const { email, password } = req.body;

    if(!email || !password){
      return res.status(400).json({
        success: false,
        message: 'All Fields are required'
      });
    }
    
    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Send new verification code
      const verificationCode = user.generateOTP();
      user.emailVerificationCode = bcrypt.hashSync(verificationCode, 10);
      user.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      try {
        await sendOTPEmail(user.email, verificationCode, 'verify');
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }

      // NO TOKEN GENERATED HERE
      return res.status(200).json({
        success: true,
        requireVerification: true,
        message: 'Email not verified. A new verification code has been sent.',
        userId: user._id,
        email: user.email
      });
    }
    
    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      const otpCode = user.set2FACode();
      await user.save();
      
      // Send 2FA code via email
      try {
        await sendOTPEmail(user.email, otpCode, '2fa');
      } catch (emailError) {
        console.error('Failed to send 2FA email:', emailError);
      }
      
      return res.status(200).json({
        success: true,
        require2FA: true,
        userId: user._id,
        message: '2FA code sent to your email'
      });
    }
    
    // Generate token
    const token = generateToken(user._id, res);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 2FA code
// @route   POST /api/auth/verify-2fa
// @access  Public
const verify2FA = async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: 'User ID and code are required'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify 2FA code
    const isValid = user.verify2FACode(code);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }
    
    // Clear 2FA code
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();
    
    // Generate token
    const token = generateToken(user._id, res);
    
    res.status(200).json({
      success: true,
      message: 'Verification successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Private
const verifyEmail = async (req, res, next) => {
  try {
    // We need userId or email because the user is not logged in yet (no req.user)
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: 'User ID and verification code are required'
      });
    }
    
    const user = await User.findById(userId);
    
    if(!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }
    
    // Check if code is valid
    if (!user.emailVerificationCode || Date.now() > user.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired.'
      });
    }
    
    const isValid = require('bcryptjs').compareSync(code, user.emailVerificationCode);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
    
    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // ✅ Send welcome email 
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    // GENERATE TOKEN NOW (Auto-login after verification)
    const token = generateToken(user._id, res);
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Resend email verification code
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = async (req, res, next) => {
  try {
    // CHANGE: Get userId from body instead of req.user
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // If the previous code expires in more than 9 minutes (meaning they generated it < 1 min ago)
    // Then don't send a new one yet.
    const oneMinute = 60 * 1000;
    const timeRemaining = user.emailVerificationExpires - Date.now();
    const totalDuration = 10 * 60 * 1000; // 10 mins

    // If code was generated less than 1 minute ago (9 mins remaining)
    if (timeRemaining > (totalDuration - oneMinute)) {
      return res.status(429).json({
        success: false,
        message: 'Please wait a minute before requesting a new code'
      });
    }
    
    // Generate new code
    const verificationCode = user.generateOTP();
    user.emailVerificationCode = require('bcryptjs').hashSync(verificationCode, 10);
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    
     // Send email
    try {
      await sendOTPEmail(user.email, verificationCode, 'verify');
    } catch (emailError) {
      console.error('Email send failed', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send email'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email'
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }
    
    // Generate reset token
    const resetToken = user.setResetPasswordToken();
    await user.save();
    
    // Send email
    await sendOTPEmail(user.email, resetToken, 'reset');
    
    res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email'
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }
    
    // Verify reset token
    const isValid = user.verifyResetToken(code);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }
    
    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle 2FA
// @route   POST /api/auth/toggle-2fa
// @access  Private
const toggle2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    user.twoFactorEnabled = !user.twoFactorEnabled;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: `Two-factor authentication ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`,
      twoFactorEnabled: user.twoFactorEnabled
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    // Update user status
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: Date.now(),
      socketId: null
    });
    
    // Clear cookie
    clearToken(res);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        isOnline: user.isOnline,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  registerValidation,
  login,
  loginValidation,
  verify2FA,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  toggle2FA,
  logout,
  getMe
};