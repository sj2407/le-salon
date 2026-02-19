import { useState } from 'react'
import { TAG_ICONS } from '../../lib/reviewConstants'

/**
 * Small cover image thumbnail with emoji fallback.
 * Used in ReviewsDisplay, LaListe item rows, WishlistDisplay.
 *
 * @param {string} imageUrl - External cover image URL (or null/empty)
 * @param {string} tag - Review/item tag for emoji fallback (e.g., 'book', 'movie')
 * @param {'small'|'medium'} size - 'small' (40px) for list views, 'medium' (60px) for forms
 */
export const CoverThumbnail = ({ imageUrl, tag, size = 'small' }) => {
  const [imgError, setImgError] = useState(false)

  const isSquare = tag === 'album' || tag === 'podcast'
  const w = size === 'small' ? 40 : 60
  const h = isSquare ? w : Math.round(w * 1.4) // 5:7 portrait for books/movies

  if (!imageUrl || imgError) {
    const emoji = TAG_ICONS[tag]
    if (!emoji) return null
    return (
      <span style={{ fontSize: size === 'small' ? '18px' : '24px', flexShrink: 0, lineHeight: 1 }}>
        {emoji}
      </span>
    )
  }

  return (
    <img
      src={imageUrl}
      alt=""
      onError={() => setImgError(true)}
      style={{
        width: `${w}px`,
        height: `${h}px`,
        objectFit: 'cover',
        borderRadius: '3px',
        flexShrink: 0,
        background: '#eee',
      }}
    />
  )
}
