import { useState } from 'react'
import UserProfileImg from '../../assets/images/UserProfile.png'

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-base',
}

export default function Avatar({ src, name, size = 'md' }) {
  const [imgError, setImgError] = useState(false)

  const sizeClass = SIZES[size] || SIZES.md

  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  // Priority: user profileImage → placeholder → initials fallback
  const imgSrc = src || UserProfileImg

  if (imgError) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold border-2 border-indigo-200 shrink-0`}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt={name || 'User avatar'}
      className={`${sizeClass} rounded-full object-cover border-2 border-indigo-200 shrink-0`}
      onError={() => setImgError(true)}
    />
  )
}
