import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Light-theme "⋮" action menu for buyer/seller-facing pages (marketplace
// listing page, public profile). Mirrors the admin ActionMenu's portal +
// outside-click + Esc + upward-flip behaviour so it never gets clipped by a
// scrolling ancestor and never blocks page scroll — see
// frontend/src/Components/ui/ActionMenu.jsx for the admin dark-theme twin.
export default function KebabMenu({ items, className = '', buttonClassName = '' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const menuHeight = items.length * 40 + 8
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < menuHeight && rect.top > spaceBelow
      setPos({
        right: window.innerWidth - rect.right,
        ...(openUpward ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      })
    }
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e) => {
      if (btnRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const handleKeyDown = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', () => setOpen(false), true)
    window.addEventListener('resize', () => setOpen(false))
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
          buttonClassName || 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="More options"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-48"
          style={pos}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => { setOpen(false); item.onClick() }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
