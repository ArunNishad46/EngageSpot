const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts
  message: {
    success: false,
    message: 'Too many attempts, try again later'
  }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many attempts, try again later'
  }
});

router.post('/register', registerValidation, register);
router.post('/login', loginLimiter, loginValidation, login);
router.post('/verify-2fa', otpLimiter, verify2FA);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', otpLimiter,  resendVerification);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/toggle-2fa', protect, toggle2FA);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;