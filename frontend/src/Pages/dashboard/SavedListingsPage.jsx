import { Link } from 'react-router-dom'

export default function SavedListingsPage() {
  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Saved Listings</h1>
        <p className="text-sm text-gray-400 mt-1">Your wishlist — items you've saved for later</p>
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-24 text-center">

        {/* Illustration */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
          <div className="absolute inset-0 bg-rose-50 rounded-2xl rotate-6" />
          <div className="absolute inset-0 bg-rose-100 rounded-2xl -rotate-3" />
          <div className="relative w-full h-full bg-white rounded-2xl border border-rose-100 flex items-center justify-center shadow-sm">
            <svg className="w-9 h-9 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>

        <p className="text-base font-bold text-gray-800 mb-1.5">Your wishlist is empty</p>
        <p className="text-sm text-gray-400 mb-2 max-w-xs mx-auto leading-relaxed">
          Browse the marketplace and tap the heart icon on any listing to save it here.
        </p>

        {/* Coming soon pill */}
        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200 mb-6">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Persistent saves coming soon
        </div>

        <div className="block" />
        <Link
          to="/listings"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Browse Marketplace
        </Link>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            icon: (
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            ),
            title: 'Price Drop Alerts',
            desc: 'Get notified when saved items drop in price',
            soon: true,
          },
          {
            icon: (
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            ),
            title: 'Collections',
            desc: 'Organise your saved items into folders',
            soon: true,
          },
        ].map((card) => (
          <div key={card.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              {card.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                {card.soon && (
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Soon</span>
                )}
              </div>
              <p className="text-xs text-gray-400">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
