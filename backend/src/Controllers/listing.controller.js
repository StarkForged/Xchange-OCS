const streamifier = require('streamifier')
const mongoose   = require('mongoose')
const Listing    = require('../Models/Listing')
const User       = require('../Models/User')
const Chat       = require('../Models/Chat')
const ApiError   = require('../Utils/ApiError')
const cloudinary = require('../Config/cloudinary')

// ── Trust-aware quality score (0–100) ─────────────────────────────────────────
// Used for the "Best Match" sort and the recommended endpoint.

function qualityScore(listing) {
  const seller   = listing.seller ?? {}
  const trust    = (seller.trustScore ?? 0) / 100
  const rr       = (seller.sellerMetrics?.responseRate ?? 0) / 100
  const noGhost  = (seller.ghostRisk?.flagged ?? false) ? 0 : 1

  const ageDays  = (Date.now() - new Date(listing.createdAt)) / 86_400_000
  const fresh    = ageDays < 1 ? 1.0 : ageDays < 7 ? 0.8 : ageDays < 30 ? 0.5 : ageDays < 90 ? 0.2 : 0.0

  return trust * 40 + rr * 25 + fresh * 20 + noGhost * 15
}

// FormData sends every field as a string — safely parse JSON fields
const parse = (val) => {
  if (typeof val !== 'string') return val
  try { return JSON.parse(val) } catch { return val }
}

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'xchange/listings', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    )
    streamifier.createReadStream(buffer).pipe(stream)
  })

// GET /api/listings?search=&category=&minPrice=&maxPrice=&sortBy=
exports.getListings = async (req, res, next) => {
  try {
    const {
      search   = '',
      category = 'all',
      minPrice = '',
      maxPrice = '',
      sortBy   = 'latest',
    } = req.query

    const query = { status: 'active' }

    if (category && category !== 'all') {
      query['category.id'] = category
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i')
      query.$or = [
        { title: regex },
        { description: regex },
        { 'category.name': regex },
      ]
    }

    const priceFilter = {}
    if (minPrice !== '' && !isNaN(Number(minPrice))) priceFilter.$gte = Number(minPrice)
    if (maxPrice !== '' && !isNaN(Number(maxPrice))) priceFilter.$lte = Number(maxPrice)
    if (Object.keys(priceFilter).length) query['price.amount'] = priceFilter

    let sort = { createdAt: -1 }
    if (sortBy === 'price_asc')  sort = { 'price.amount': 1 }
    if (sortBy === 'price_desc') sort = { 'price.amount': -1 }

    // Quality sort needs sellerMetrics to compute response rate
    const sellerFields = sortBy === 'quality'
      ? 'name trustScore badges ghostRisk sellerMetrics'
      : 'name trustScore badges ghostRisk'

    let listings = await Listing.find(query).sort(sort).populate('seller', sellerFields).lean()

    if (sortBy === 'quality') {
      listings = listings
        .map((l) => ({ ...l, _qualityScore: qualityScore(l) }))
        .sort((a, b) => b._qualityScore - a._qualityScore)
        .map(({ _qualityScore, ...l }) => l)
    }

    res.json({ listings })
  } catch (err) {
    next(err)
  }
}

// GET /api/listings/:id
exports.getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'name profileImage createdAt trustScore profileCompletion badges sellerMetrics ghostRisk')
      .lean()
    if (!listing) throw new ApiError(404, 'Listing not found')

    Listing.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } }).exec()

    res.json({ listing })
  } catch (err) {
    next(err)
  }
}

// GET /api/listings/mine  (protected)
exports.getMyListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ seller: req.user._id })
      .populate('transaction.buyer', 'name profileImage')
      .sort({ createdAt: -1 })
      .lean()
    res.json({ listings })
  } catch (err) {
    next(err)
  }
}

// POST /api/listings  (protected + multipart)
exports.createListing = async (req, res, next) => {
  try {
    const title      = req.body.title
    const description = req.body.description || ''
    const condition  = req.body.condition || 'good'
    const status     = req.body.status    || 'active'
    const category   = parse(req.body.category)
    const price      = parse(req.body.price)
    const location   = parse(req.body.location)   || {}
    const attributes = parse(req.body.attributes) || {}

    if (!title || !category?.id || !category?.name || price?.amount == null) {
      throw new ApiError(400, 'title, category (id + name), and price.amount are required')
    }

    // Upload each image buffer to Cloudinary in parallel
    let imageUrls = []
    if (req.files?.length > 0) {
      imageUrls = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer))
      )
    }

    const listing = await Listing.create({
      title,
      description,
      category,
      condition,
      price,
      images:     imageUrls,
      seller:     req.user._id,
      location,
      attributes,
      status,
    })

    res.status(201).json({ listing })
  } catch (err) {
    next(err)
  }
}

// GET /api/listings/similar/:id ────────────────────────────────────────────────

exports.getSimilarListings = async (req, res, next) => {
  try {
    const source = await Listing.findById(req.params.id).lean()
    if (!source) return res.json({ listings: [] })

    const price    = source.price?.amount ?? 0
    const catId    = source.category?.id
    const SELLER_FIELDS = 'name trustScore badges ghostRisk'

    // Primary: same category + price within ±50%
    const priceFilter = price > 0
      ? { 'price.amount': { $gte: price * 0.5, $lte: price * 1.5 } }
      : {}

    let similar = await Listing.find({
      _id:           { $ne: source._id },
      'category.id': catId,
      status:        'active',
      ...priceFilter,
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate('seller', SELLER_FIELDS)
      .lean()

    // Fill remaining slots with same-category listings (any price)
    if (similar.length < 4) {
      const exclude = [source._id, ...similar.map((l) => l._id)]
      const extra   = await Listing.find({
        _id:           { $nin: exclude },
        'category.id': catId,
        status:        'active',
      })
        .sort({ createdAt: -1 })
        .limit(4 - similar.length)
        .populate('seller', SELLER_FIELDS)
        .lean()
      similar.push(...extra)
    }

    res.json({ listings: similar })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/listings/:id/status  (protected, owner only) ─────────────────────

const ALLOWED_TRANSITIONS = {
  active: ['paused', 'sold'],
  paused: ['active', 'sold'],
  sold:   [],
}

exports.updateListingStatus = async (req, res, next) => {
  try {
    const { status: newStatus, buyerId } = req.body
    if (!newStatus) throw new ApiError(400, 'status is required')

    const listing = await Listing.findById(req.params.id)
    if (!listing) throw new ApiError(404, 'Listing not found')

    if (String(listing.seller) !== String(req.user._id)) {
      throw new ApiError(403, 'Only the listing owner can update status')
    }

    const allowed = ALLOWED_TRANSITIONS[listing.status] ?? []
    if (!allowed.includes(newStatus)) {
      throw new ApiError(400, `Cannot transition from "${listing.status}" to "${newStatus}"`)
    }

    listing.status = newStatus

    // When marking as sold, attach buyer if provided
    if (newStatus === 'sold' && buyerId) {
      if (!mongoose.Types.ObjectId.isValid(buyerId)) {
        throw new ApiError(400, 'Invalid buyerId')
      }
      // Verify buyer actually chatted about this listing
      const chatExists = await Chat.exists({
        listing:      listing._id,
        participants: buyerId,
      })
      if (!chatExists) {
        throw new ApiError(400, 'Selected buyer did not participate in chats for this listing')
      }
      listing.transaction = {
        buyer:            buyerId,
        sellerConfirmed:  false,
        buyerConfirmed:   false,
        completedAt:      null,
      }
    }

    await listing.save()

    res.json({ listing })
  } catch (err) {
    next(err)
  }
}

// GET /api/listings/:id/chat-participants  (protected, owner only) ─────────────
// Returns unique buyers who have chatted about this listing — for the sold flow.

exports.getChatParticipants = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id).lean()
    if (!listing) throw new ApiError(404, 'Listing not found')

    if (String(listing.seller) !== String(req.user._id)) {
      throw new ApiError(403, 'Only the listing owner can view chat participants')
    }

    const chats = await Chat.find({ listing: listing._id })
      .populate('participants', 'name profileImage')
      .lean()

    const sellerStr = String(req.user._id)
    const buyerMap  = new Map()

    for (const chat of chats) {
      for (const p of chat.participants) {
        const pid = String(p._id)
        if (pid !== sellerStr && !buyerMap.has(pid)) {
          buyerMap.set(pid, { _id: p._id, name: p.name, profileImage: p.profileImage })
        }
      }
    }

    res.json({ participants: [...buyerMap.values()] })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/listings/:id/transaction/confirm  (protected) ────────────────────
// Either the seller or buyer confirms their side of the transaction.
// When both confirm, completedAt is set and reviews are unlocked.

exports.confirmTransaction = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
    if (!listing) throw new ApiError(404, 'Listing not found')

    if (listing.status !== 'sold') {
      throw new ApiError(400, 'Listing must be marked sold before confirming a transaction')
    }

    if (!listing.transaction?.buyer) {
      throw new ApiError(400, 'No transaction buyer set for this listing')
    }

    if (listing.transaction.completedAt) {
      return res.json({ listing, alreadyCompleted: true })
    }

    const meStr     = String(req.user._id)
    const sellerStr = String(listing.seller)
    const buyerStr  = String(listing.transaction.buyer)

    if (meStr !== sellerStr && meStr !== buyerStr) {
      throw new ApiError(403, 'Only the transaction participants can confirm')
    }

    if (meStr === sellerStr) listing.transaction.sellerConfirmed = true
    if (meStr === buyerStr)  listing.transaction.buyerConfirmed  = true

    // Unlock reviews when both sides confirm
    if (listing.transaction.sellerConfirmed && listing.transaction.buyerConfirmed) {
      listing.transaction.completedAt = new Date()
      // Increment completedDeals counter on both participants (non-blocking)
      User.updateOne({ _id: listing.seller },            { $inc: { completedDeals: 1 } }).exec()
      User.updateOne({ _id: listing.transaction.buyer }, { $inc: { completedDeals: 1 } }).exec()
    }

    await listing.save()

    res.json({
      listing,
      dealCompleted: !!listing.transaction.completedAt,
    })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/listings/:id/transaction/cancel  (protected) ─────────────────────
// Either participant can cancel a pending (not-yet-completed) transaction.
// Only the party who initiates the cancellation receives a reliability penalty.
// Listing moves to paused — seller must explicitly resume before it is public again.

exports.cancelTransaction = async (req, res, next) => {
  try {
    const { reason = '' } = req.body
    const listing = await Listing.findById(req.params.id)
    if (!listing) throw new ApiError(404, 'Listing not found')

    if (listing.status !== 'sold') {
      throw new ApiError(400, 'No active transaction to cancel')
    }
    if (!listing.transaction?.buyer) {
      throw new ApiError(400, 'No transaction buyer set')
    }
    if (listing.transaction.completedAt) {
      throw new ApiError(400, 'Cannot cancel a completed transaction')
    }
    if (listing.transaction.cancelled) {
      throw new ApiError(400, 'Transaction is already cancelled')
    }

    const meStr     = String(req.user._id)
    const sellerStr = String(listing.seller)
    const buyerStr  = String(listing.transaction.buyer)

    if (meStr !== sellerStr && meStr !== buyerStr) {
      throw new ApiError(403, 'Only transaction participants can cancel')
    }

    // Record cancellation — store who cancelled and why
    listing.transaction.cancelled          = true
    listing.transaction.cancelledAt        = new Date()
    listing.transaction.cancelledBy        = req.user._id
    listing.transaction.cancellationReason = reason.trim()

    // Paused, not active: the seller must explicitly resume before the listing
    // re-enters the public marketplace. Cancellation ≠ ready to sell immediately.
    listing.status = 'paused'

    await listing.save()

    // Only the party responsible for the cancellation receives a penalty.
    // The innocent party's completion rate is unaffected.
    if (meStr === sellerStr) {
      User.updateOne({ _id: listing.seller }, { $inc: { sellerCancelledDeals: 1 } }).exec()
    } else {
      User.updateOne({ _id: listing.transaction.buyer }, { $inc: { buyerCancelledDeals: 1 } }).exec()
    }

    res.json({ listing, cancelled: true })
  } catch (err) {
    next(err)
  }
}

// GET /api/listings/recommended  (requires auth) ──────────────────────────────

exports.getRecommended = async (req, res, next) => {
  try {
    const SELLER_FIELDS = 'name trustScore badges ghostRisk sellerMetrics'

    const user = await User.findById(req.user._id)
      .select('recentlyViewed savedListings recentSearches')
      .populate('recentlyViewed.listing', 'category')
      .populate('savedListings', 'category')
      .lean()

    if (!user) return res.json({ listings: [] })

    // Collect category signals (recently viewed + saved, most recent first)
    const catIds = new Set()
    ;(user.recentlyViewed ?? []).slice(0, 5).forEach((v) => {
      if (v.listing?.category?.id) catIds.add(v.listing.category.id)
    })
    ;(user.savedListings ?? []).forEach((l) => {
      if (l?.category?.id) catIds.add(l.category.id)
    })

    // IDs to exclude from results (already seen or saved)
    const excludeIds = [
      ...(user.recentlyViewed ?? []).map((v) => v.listing?._id).filter(Boolean),
      ...(user.savedListings  ?? []).filter(Boolean),
    ]

    let pool = []

    // Category-based candidates
    if (catIds.size > 0) {
      pool = await Listing.find({
        _id:           { $nin: excludeIds },
        'category.id': { $in: [...catIds] },
        status:        'active',
      })
        .sort({ createdAt: -1 })
        .limit(24)
        .populate('seller', SELLER_FIELDS)
        .lean()
    }

    // Search-term candidates (text match on title)
    const searchTerms = (user.recentSearches ?? []).slice(0, 3).map((s) => s.query)
    if (searchTerms.length > 0) {
      const regex  = new RegExp(searchTerms.join('|'), 'i')
      const termEx = [...excludeIds, ...pool.map((l) => l._id)]
      const byTerm = await Listing.find({
        _id:    { $nin: termEx },
        title:  regex,
        status: 'active',
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('seller', SELLER_FIELDS)
        .lean()
      pool.push(...byTerm)
    }

    // Top-up with latest listings when pool is thin
    if (pool.length < 8) {
      const topEx = [...excludeIds, ...pool.map((l) => l._id)]
      const topUp = await Listing.find({ _id: { $nin: topEx }, status: 'active' })
        .sort({ createdAt: -1 })
        .limit(8 - pool.length)
        .populate('seller', SELLER_FIELDS)
        .lean()
      pool.push(...topUp)
    }

    // Sort by quality score and return top 8
    const ranked = pool
      .map((l)    => ({ ...l, _qs: qualityScore(l) }))
      .sort((a, b) => b._qs - a._qs)
      .slice(0, 8)
      .map(({ _qs, ...l }) => l)

    res.json({ listings: ranked })
  } catch (err) {
    next(err)
  }
}
