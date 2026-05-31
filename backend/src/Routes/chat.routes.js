const express = require('express')
const router  = express.Router()

const {
  getOrCreateChat,
  getChats,
  getMessages,
  deleteMessage,
} = require('../Controllers/chat.controller')
const { protect } = require('../Middleware/auth.middleware')

router.post('/',                              protect, getOrCreateChat)
router.get('/',                               protect, getChats)
router.get('/:chatId/messages',               protect, getMessages)
router.delete('/:chatId/messages/:messageId', protect, deleteMessage)

module.exports = router
