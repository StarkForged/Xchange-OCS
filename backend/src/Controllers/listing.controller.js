const streamifier = require('streamifier')
const Listing    = require('../Models/Listing')
const User       = require('../Models/User')
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

    const query = {}

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
