const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  deleteForMe,
  deleteForEveryone,
  updateMessageStatus,
  markChatAsSeen
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/multer');

router.use(protect);

router.post('/', upload.single('file'), sendMessage);
router.get('/:chatId', getMessages);
router.delete('/:id/delete-for-me', deleteForMe);
router.delete('/:id/delete-for-everyone', deleteForEveryone);
router.put('/:id/status', updateMessageStatus);
router.put('/chat/:chatId/seen', markChatAsSeen);

module.exports = router;