import { useLocation } from 'react-router-dom'

export default function AdminComingSoon() {
  const location = useLocation()
  const name = location.pathname.split('/').filter(Boolean).pop()
  const label = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Page'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
        <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">{label} Management</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">
          This section is under construction and will be available in a future release.
        </p>
      </div>
      <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-500 uppercase tracking-widest">
        Coming Soon
      </span>
    </div>
  )
}
