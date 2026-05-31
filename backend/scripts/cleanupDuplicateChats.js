/**
 * Migration + cleanup script for Chat collection.
 *
 * Run once after deploying the chatKey index:
 *   node backend/scripts/cleanupDuplicateChats.js
 *
 * What it does (in order):
 *   1. Detects and merges any duplicate conversations (same listing + same pair of participants).
 *      Keeps the oldest chat; re-points all messages from duplicates to the keeper.
 *   2. Backfills chatKey on every chat that is missing it.
 *      Once complete, the unique index protects all future documents.
 */

require('dotenv').config()
const mongoose = require('mongoose')

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1) }

// ── Inline schemas (avoid importing full models to stay script-independent) ──

const Chat = mongoose.model('Chat', new mongoose.Schema({
  participants: [mongoose.Schema.Types.ObjectId],
  listing:      mongoose.Schema.Types.ObjectId,
  chatKey:      String,
  lastMessage:  {
    text:      String,
    sender:    mongoose.Schema.Types.ObjectId,
    createdAt: Date,
  },
}, { timestamps: true }))

const Message = mongoose.model('Message', new mongoose.Schema({
  chat:      mongoose.Schema.Types.ObjectId,
  sender:    mongoose.Schema.Types.ObjectId,
  text:      String,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
}, { timestamps: true }))

// ── Helpers ──────────────────────────────────────────────────────────────────

const buildChatKey = (listingId, participants) =>
  String(listingId) + ':' + [...participants].map(String).sort().join(':')

// ── Step 1: Merge duplicates ──────────────────────────────────────────────────

async function mergeDuplicates() {
  const allChats = await Chat.find({}, '_id listing participants createdAt').lean()

  const groups = {}
  for (const chat of allChats) {
    const key = buildChatKey(chat.listing, chat.participants)
    if (!groups[key]) groups[key] = []
    groups[key].push(chat)
  }

  const dupeGroups = Object.values(groups).filter((g) => g.length > 1)

  if (dupeGroups.length === 0) {
    console.log('[step 1] No duplicate chats found.')
    return
  }

  let chatsDeleted = 0
  let messagesMoved = 0

  for (const group of dupeGroups) {
    group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    const keeper  = group[0]
    const dupeIds = group.slice(1).map((c) => c._id)

    const moved = await Message.updateMany(
      { chat: { $in: dupeIds } },
      { $set: { chat: keeper._id } }
    )
    messagesMoved += moved.modifiedCount

    const latest = await Message.findOne({ chat: keeper._id }).sort({ createdAt: -1 }).lean()
    if (latest) {
      await Chat.findByIdAndUpdate(keeper._id, {
        lastMessage: {
          text:      latest.isDeleted ? 'This message was deleted' : latest.text,
          sender:    latest.sender,
          createdAt: latest.createdAt,
        },
      })
    }

    await Chat.deleteMany({ _id: { $in: dupeIds } })
    chatsDeleted += dupeIds.length
    console.log(`[step 1] Merged ${dupeIds.length} duplicate(s) into chat ${keeper._id}`)
  }

  console.log(`[step 1] Done — ${chatsDeleted} duplicate(s) removed, ${messagesMoved} message(s) re-pointed.`)
}

// ── Step 2: Backfill chatKey ──────────────────────────────────────────────────

async function backfillChatKeys() {
  const chats = await Chat.find({ chatKey: { $exists: false } }, '_id listing participants').lean()

  if (chats.length === 0) {
    console.log('[step 2] All chats already have chatKey — nothing to backfill.')
    return
  }

  let updated = 0
  for (const chat of chats) {
    const chatKey = buildChatKey(chat.listing, chat.participants)
    await Chat.updateOne({ _id: chat._id }, { $set: { chatKey } })
    updated++
  }

  console.log(`[step 2] Backfilled chatKey on ${updated} chat(s).`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB.')

  await mergeDuplicates()
  await backfillChatKeys()

  console.log('Migration complete.')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
