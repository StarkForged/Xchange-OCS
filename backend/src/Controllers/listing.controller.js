const Listing = require('../Models/Listing')
const ApiError = require('../Utils/ApiError')

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
      .populate('seller', 'name profileImage createdAt')
      .lean()
    if (!listing) throw new ApiError(404, 'Listing not found')

    // Increment view count (fire-and-forget, doesn't block response)
    Listing.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } }).exec()

    res.json({ listing })
  } catch (err) {
    next(err)
  }
}

// POST /api/listings  (protected)
exports.createListing = async (req, res, next) => {
  try {
    const { title, description, category, condition, price, images, location, attributes, status } = req.body

    if (!title || !category?.id || !category?.name || price?.amount == null) {
      throw new ApiError(400, 'title, category (id + name), and price.amount are required')
    }

    const listing = await Listing.create({
      title,
      description: description || '',
      category,
      condition:   condition  || 'good',
      price,
      images:      images     || [],
      seller:      req.user._id,
      location:    location   || {},
      attributes:  attributes || {},
      status:      status     || 'active',
    })

    res.status(201).json({ listing })
  } catch (err) {
    next(err)
  }
}
