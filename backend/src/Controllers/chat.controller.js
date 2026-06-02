const Chat    = require('../Models/Chat')
const Message = require('../Models/Message')
const Listing = require('../Models/Listing')
const ApiError = require('../Utils/ApiError')

// POST /api/chats — atomic upsert: one document per (buyer + seller + listing)
exports.getOrCreateChat = async (req, res, next) => {
  try {
    const { listingId } = req.body
    if (!listingId) throw new ApiError(400, 'listingId is required')

    const listing = await Listing.findById(listingId).lean()
    if (!listing) throw new ApiError(404, 'Listing not found')

    if (listing.status === 'sold') {
      throw new ApiError(400, 'This item is no longer available')
    }

    const sellerId = String(listing.seller)
    const buyerId  = String(req.user._id)

    if (sellerId === buyerId) {
      throw new ApiError(400, 'You cannot chat with yourself on your own listing')
    }

    // Stable key: listingId + sorted participant IDs — order-independent
    const chatKey = String(listingId) + ':' + [buyerId, sellerId].sort().join(':')

    // Atomic: find-or-create in one round trip using the unique chatKey
    const chat = await Chat.findOneAndUpdate(
      { chatKey },
      { $setOnInsert: { listing: listingId, participants: [buyerId, sellerId], chatKey } },
      { upsert: true, new: true }
    ).populate('participants', 'name _id')

    res.json({ chat })
  } catch (err) {
    next(err)
  }
}

// GET /api/chats — all chats the logged-in user participates in
exports.getChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('listing', 'title images price seller status')
      .populate('participants', 'name _id')
      .sort({ updatedAt: -1 })
      .lean()

    res.json({ chats })
  } catch (err) {
    next(err)
  }
}

// GET /api/chats/:chatId/messages
exports.getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id })
    if (!chat) throw new ApiError(404, 'Chat not found')

    const messages = await Message.find({ chat: chatId })
      .sort({ createdAt: 1 })
      .lean()

    const normalized = messages.map((m) => ({
      id:        String(m._id),
      senderId:  String(m.sender),
      text:      m.isDeleted ? 'This message was deleted' : m.text,
      timestamp: m.createdAt,
      isDeleted: m.isDeleted || false,
    }))

    res.json({ messages: normalized })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/chats/:chatId/messages/:messageId — soft delete, sender only
exports.deleteMessage = async (req, res, next) => {
  try {
    const { chatId, messageId } = req.params

    const message = await Message.findOne({ _id: messageId, chat: chatId })
    if (!message) throw new ApiError(404, 'Message not found')

    if (String(message.sender) !== String(req.user._id)) {
      throw new ApiError(403, 'You can only delete your own messages')
    }

    if (message.isDeleted) return res.json({ success: true })

    message.isDeleted = true
    message.deletedAt = new Date()
    message.text      = 'This message was deleted'
    await message.save()

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
