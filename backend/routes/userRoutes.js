const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateProfile,
  updateAvatar,
  changePassword,
  getOnlineUsers,
  deleteAccount,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/multer');

router.use(protect);

router.get('/', getUsers);
router.get('/online', getOnlineUsers);
router.get('/:id', getUserById);
router.put('/profile', updateProfile);
router.put('/avatar', uploadAvatar.single('avatar'), updateAvatar);
router.put('/change-password', changePassword);
router.delete('/delete-account', deleteAccount);

module.exports = router;