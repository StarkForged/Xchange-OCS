const express = require('express')
const router  = express.Router()

const {
  getOrCreateChat,
  getChats,
  getMessages,
  deleteMessage,
  cleanupDuplicates,
} = require('../Controllers/chat.controller')
const { protect } = require('../Middleware/auth.middleware')

router.post('/',                                  protect, getOrCreateChat)
router.get('/',                                   protect, getChats)
router.get('/:chatId/messages',                   protect, getMessages)
router.delete('/:chatId/messages/:messageId',     protect, deleteMessage)

// Run once after deploying to clear pre-existing duplicate conversations
router.post('/admin/cleanup-duplicates',          protect, cleanupDuplicates)

module.exports = router
