const Chat    = require('../Models/Chat')
const Message = require('../Models/Message')
const Listing = require('../Models/Listing')
const ApiError = require('../Utils/ApiError')

// POST /api/chats  — get existing or create new chat for (buyer, seller, listing)
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

    let chat = await Chat.findOne({
      listing:      listingId,
      participants: { $all: [buyerId, sellerId] },
    })

    if (!chat) {
      chat = await Chat.create({
        listing:      listingId,
        participants: [buyerId, sellerId],
      })
    }

    res.json({ chat })
  } catch (err) {
    next(err)
  }
}

// GET /api/chats  — all chats the logged-in user participates in
exports.getChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('listing', 'title images price seller')
      .sort({ updatedAt: -1 })
      .lean()

    res.json({ chats })
  } catch (err) {
    next(err)
  }
}

// GET /api/chats/:chatId/messages  — paginated message history for a chat
exports.getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params

    // Verify the requester is a participant
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id })
    if (!chat) throw new ApiError(404, 'Chat not found')

    const messages = await Message.find({ chat: chatId })
      .sort({ createdAt: 1 })
      .lean()

    const normalized = messages.map((m) => ({
      id:        String(m._id),
      senderId:  String(m.sender),
      text:      m.text,
      timestamp: m.createdAt,
    }))

    res.json({ messages: normalized })
  } catch (err) {
    next(err)
  }
}
