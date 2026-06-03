import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyReviewsAPI } from '../../api/review.api'
import useAuthStore from '../../store/auth.Store'
import defaultAvatar from '../../assets/images/default-avatar.jpg'

const timeAgo = (d) => {
  if (!d) return ''
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 flex-shrink-0 ${star <= rating ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function RatingBreakdown({ reviews }) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of reviews) counts[r.rating] = (counts[r.rating] || 0) + 1
  const total = reviews.length || 1
  const avg = reviews.length
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10
    : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-6 flex-wrap">
        {/* Big number */}
        <div className="text-center">
          <div className="text-5xl font-black text-gray-900 leading-none">{avg || '—'}</div>
          <StarRating rating={avg} />
          <p className="text-xs text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Bar breakdown */}
        <div className="flex-1 min-w-[180px] space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const pct = Math.round((counts[star] / total) * 100)
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 w-2">{star}</span>
                <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-7 text-right">{counts[star]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ReviewsPage() {
  const { user }  = useAuthStore()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getMyReviewsAPI()
      .then((d) => { if (!cancelled) setReviews(d.reviews || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reviews</h1>
        <p className="text-sm text-gray-400 mt-1">Reviews received from completed transactions</p>
      </div>

      {/* View public profile link */}
      {user?._id && (
        <Link
          to={`/users/${user._id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View my public profile
        </Link>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-32" />
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {reviews.length > 0 && <RatingBreakdown reviews={reviews} />}

          {reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
              <div className="text-5xl mb-4">⭐</div>
              <p className="text-base font-semibold text-gray-700 mb-1">No reviews yet</p>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                Reviews unlock after completing a transaction — both you and the buyer must confirm.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start gap-3">
                    <img
                      src={review.reviewer?.profileImage || defaultAvatar}
                      alt={review.reviewer?.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-gray-900">{review.reviewer?.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {review.role === 'buyer' ? 'Buyer' : 'Seller'}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{timeAgo(review.createdAt)}</span>
                      </div>
                      <StarRating rating={review.rating} />
                      {review.listing && (
                        <Link
                          to={`/listings/${review.listing._id}`}
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium mt-1 block truncate"
                        >
                          {review.listing.title}
                        </Link>
                      )}
                      {review.comment && (
                        <p className="text-sm text-gray-600 leading-relaxed mt-2">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
