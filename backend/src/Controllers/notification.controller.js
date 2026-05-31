const Notification = require('../Models/Notification')
const ApiError     = require('../Utils/ApiError')

// GET /api/notifications — latest 50, with unread count
exports.getNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ])

    res.json({ notifications, unreadCount })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/notifications/:id/read — mark one as read
exports.markRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, user: req.user._id })
    if (!notif) throw new ApiError(404, 'Notification not found')

    notif.read = true
    await notif.save()

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/notifications/read-all — mark all unread as read
exports.markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    )

    res.json({ success: true, modifiedCount: result.modifiedCount })
  } catch (err) {
    next(err)
  }
}
