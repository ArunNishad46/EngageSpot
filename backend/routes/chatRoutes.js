const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/multer');

router.use(protect);

router.route('/')
  .get(getChats)
  .post(accessChat);

router.post('/group', createGroupChat);

router.route('/group/:id')
  .put(updateGroupChat)
  .delete(deleteChat);

router.put('/group/:id/avatar', uploadAvatar.single('avatar'), updateGroupAvatar);
router.put('/group/:id/add', addToGroup);
router.put('/group/:id/remove', removeFromGroup);
router.put('/group/:id/add-admin', addAdmin);
router.put('/group/:id/remove-admin', removeAdmin);
router.delete('/:id', deleteChat);

module.exports = router;