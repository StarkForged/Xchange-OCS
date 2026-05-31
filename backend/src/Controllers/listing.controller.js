const streamifier = require('streamifier')
const Listing    = require('../Models/Listing')
const ApiError   = require('../Utils/ApiError')
const cloudinary = require('../Config/cloudinary')

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

    const listings = await Listing.find(query).sort(sort).populate('seller', 'name').lean()

    res.json({ listings })
  } catch (err) {
    next(err)
  }
}

// GET /api/listings/:id
exports.getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'name profileImage createdAt trustScore profileCompletion badges sellerMetrics')
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
