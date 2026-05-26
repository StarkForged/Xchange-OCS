import { Link } from 'react-router-dom'
import defaultImage from '../../assets/images/products/iphone13.jpg'

const formatPrice = (price) =>
  '₹' + (price?.amount?.toLocaleString('en-IN') ?? '0')

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

export default function ListingCard({ listing }) {
  if (!listing) return null

  const {
    _id,
    title,
    description,
    price,
    category,
    images,
    seller,
    location,
    status,
    viewsCount,
    favoritesCount,
    createdAt
  } = listing

  const image = images?.[0] ?? defaultImage

  const isSold = status === 'sold'
  const sellerId = typeof seller === 'string' ? seller.replace('user_', '#') : '?'

  return (
    <Link
      to={`/listings/${_id}`}
      className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={image}
          alt={title || 'Listing'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-sm font-semibold px-3 py-1 rounded-full">
              Sold
            </span>
          </div>
        )}

        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
          {category?.name || 'General'}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">
          {title || 'Untitled'}
        </p>

        {description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
            {description}
          </p>
        )}

        <div className="flex items-center gap-2 mb-2">
          <p className="text-lg font-bold text-indigo-600">
            {formatPrice(price)}
          </p>
          {price?.negotiable && (
            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">
              Negotiable
            </span>
          )}
        </div>

        {location?.city && (
          <p className="text-xs text-gray-400 mb-3">
            📍 {location.city}, {location.state}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span>Seller {sellerId}</span>
            <span>👁 {viewsCount ?? 0}</span>
            <span>♡ {favoritesCount ?? 0}</span>
          </div>
          <span className="flex-shrink-0">{timeAgo(createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}
