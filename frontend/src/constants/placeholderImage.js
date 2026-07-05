// Generic "No Image Available" placeholder — used whenever a listing has no images.
// Inline SVG data URI so no extra asset/network request is needed.
export const NO_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
      <rect width="600" height="450" fill="#f3f4f6"/>
      <g fill="none" stroke="#9ca3af" stroke-width="3">
        <rect x="180" y="150" width="240" height="150" rx="8"/>
        <circle cx="228" cy="192" r="14"/>
        <path d="M180 270 L250 210 L300 250 L350 200 L420 270" />
      </g>
      <text x="300" y="330" font-family="Arial, sans-serif" font-size="20" fill="#9ca3af" text-anchor="middle">
        No Image Available
      </text>
    </svg>
  `)
