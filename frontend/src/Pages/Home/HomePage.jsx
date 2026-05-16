import useAuthStore from '../../Store/authStore'

export default function HomePage() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Welcome to Xchange
        </h1>
        <p className="text-gray-500 text-lg mb-1">
          Hello, {user?.name}!
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Listings, search, and more coming in Phase 2.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-indigo-500 rounded-full" />
            Role: {user?.role}
          </span>
          <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Trust Score: {user?.trustScore ?? 0}
          </span>
        </div>
      </div>
    </div>
  )
}
