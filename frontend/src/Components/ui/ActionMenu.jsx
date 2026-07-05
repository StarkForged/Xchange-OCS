import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Generic dark-theme admin action menu: single instance controlled by the
// parent (isOpen/onToggle/onClose) so a page can enforce "only one menu open
// at a time". Portals to document.body with position:fixed so it is never
// clipped by a scrolling table container, and flips upward when there isn't
// room below. Closing is done via a document mousedown/Escape listener —
// deliberately NOT a full-screen overlay, which would also swallow page
// scroll (see admin Users page fix).
export default function ActionMenu({ isOpen, onToggle, onClose, items, disabled }) {
  const [pos, setPos] = useState(null)
  const btnRef  = useRef(null)
  const menuRef = useRef(null)

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const menuHeight = items.length * 38 + 8
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < menuHeight && rect.top > spaceBelow
      setPos({
        right: window.innerWidth - rect.right,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      })
    }
    onToggle()
  }

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (e) => {
      if (btnRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      onClose()
    }
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [isOpen, onClose])

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleToggle}
        disabled={disabled}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>

      {isOpen && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 w-44"
          style={pos}
        >
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => { onClose(); item.onClick() }}
              disabled={item.disabled}
              className={`w-full text-left px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                item.colorClass || 'text-slate-300 hover:bg-slate-700'
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
