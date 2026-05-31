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

    const sellerId = String(listing.seller)
    const buyerId  = String(req.user._id)

    if (sellerId === buyerId) {
      throw new ApiError(400, 'You cannot chat with yourself on your own listing')
    }

    // Atomic: find-or-create in one round trip, no race-condition duplicates
    const chat = await Chat.findOneAndUpdate(
      { listing: listingId, participants: { $all: [buyerId, sellerId] } },
      { $setOnInsert: { listing: listingId, participants: [buyerId, sellerId] } },
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
      .populate('listing', 'title images price seller')
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

// POST /api/chats/cleanup — one-time dedup: merge messages into the oldest chat,
// delete the extras.  Run once after deploying the atomic upsert fix.
exports.cleanupDuplicates = async (req, res, next) => {
  try {
    // Load every chat (just ids + participants + listing) — no message data yet
    const allChats = await Chat.find({}, '_id listing participants createdAt').lean()

    // Group by canonical key = sorted(participantIds) + listingId
    const groups = {}
    for (const chat of allChats) {
      const sorted = [...chat.participants].map(String).sort().join('|')
      const key    = `${chat.listing}_${sorted}`
      if (!groups[key]) groups[key] = []
      groups[key].push(chat)
    }

    const duplicateGroups = Object.values(groups).filter((g) => g.length > 1)

    let chatsDeleted   = 0
    let messagesMerged = 0

    for (const group of duplicateGroups) {
      // Keep the oldest chat (first created) — it may already hold messages
      group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      const keeper    = group[0]
      const dupeIds   = group.slice(1).map((c) => c._id)

      // Re-point all messages from duplicates to the keeper
      const moved = await Message.updateMany(
        { chat: { $in: dupeIds } },
        { $set: { chat: keeper._id } }
      )
      messagesMerged += moved.modifiedCount

      // Recompute lastMessage on the keeper from its (now merged) messages
      const latest = await Message.findOne({ chat: keeper._id })
        .sort({ createdAt: -1 })
        .lean()
      if (latest) {
        await Chat.findByIdAndUpdate(keeper._id, {
          lastMessage: {
            text:      latest.isDeleted ? 'This message was deleted' : latest.text,
            sender:    latest.sender,
            createdAt: latest.createdAt,
          },
        })
      }

      // Delete the duplicate shells
      await Chat.deleteMany({ _id: { $in: dupeIds } })
      chatsDeleted += dupeIds.length
    }

    res.json({
      duplicateGroups: duplicateGroups.length,
      chatsDeleted,
      messagesMerged,
      message: chatsDeleted === 0 ? 'No duplicates found.' : 'Cleanup complete.',
    })
  } catch (err) {
    next(err)
  }
}
