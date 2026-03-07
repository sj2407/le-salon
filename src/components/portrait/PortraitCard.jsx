import { motion } from 'framer-motion'

/**
 * Portrait Card — hero section with dark background, mood word, generated prose,
 * and an editorial-style image collage.
 *
 * Hidden entirely if no data (no spotifyProfile AND no books).
 * Text-only if no images available.
 */
export const PortraitCard = ({ spotifyProfile, books, onImageClick, isOwner }) => {
  const moodLabel = spotifyProfile?.mood_label
  const portraitText = spotifyProfile?.portrait_text

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Nothing to show
  if (!moodLabel && !portraitText) return null

  // Collect available images for the collage (artist images + book covers)
  const collageImages = []
  if (spotifyProfile?.top_artists) {
    spotifyProfile.top_artists.forEach((artist, i) => {
      if (artist.image_url) {
        collageImages.push({ url: artist.image_url, type: 'artist', index: i, label: artist.name })
      }
    })
  }
  if (books) {
    books.forEach((book, i) => {
      if (book.cover_url) {
        collageImages.push({ url: book.cover_url, type: 'book', index: i, label: book.title })
      }
    })
  }

  // Take up to 3 images for the collage
  const displayImages = collageImages.slice(0, 3)
  const hasImages = displayImages.length > 0

  // Collage positioning — unequal grid cells, cropped at edges
  const imagePositions = [
    { top: '12px', right: '-8px', width: '110px', height: '140px', zIndex: 1 },
    { top: '60px', right: '80px', width: '90px', height: '110px', zIndex: 2 },
    { bottom: '8px', right: '30px', width: '80px', height: '100px', zIndex: 1 },
  ]

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.5, ease: 'easeOut' }}
      style={{
        background: 'linear-gradient(135deg, #3D1C14 0%, #7A3B2E 50%, #5C2D23 100%)',
        borderRadius: '12px',
        padding: '28px 24px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: hasImages ? '200px' : 'auto',
      }}
    >
      {/* Text content */}
      <div style={{ position: 'relative', zIndex: 3, maxWidth: hasImages ? '60%' : '100%' }}>
        {moodLabel && (
          <motion.h2
            initial={prefersReduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.5, delay: 0, ease: 'easeOut' }}
            style={{
              margin: '0 0 12px 0',
              fontSize: '48px',
              fontStyle: 'italic',
              fontWeight: 400,
              color: '#FFFEFA',
              lineHeight: 1.1,
              letterSpacing: '-0.5px',
              fontFamily: 'Source Serif 4, Georgia, serif',
            }}
          >
            {moodLabel}
          </motion.h2>
        )}

        {portraitText && (
          <motion.p
            initial={prefersReduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.5, delay: 0, ease: 'easeOut' }}
            style={{
              margin: 0,
              fontSize: '15px',
              lineHeight: 1.65,
              color: 'rgba(255, 254, 250, 0.82)',
              fontFamily: 'Source Serif 4, Georgia, serif',
            }}
          >
            {portraitText}
          </motion.p>
        )}
      </div>

      {/* Image collage — editorial poster style */}
      {hasImages && displayImages.map((img, i) => (
        <div
          key={`${img.type}-${img.index}`}
          onClick={() => onImageClick && onImageClick(img)}
          style={{
            position: 'absolute',
            ...imagePositions[i],
            borderRadius: '4px',
            overflow: 'hidden',
            cursor: onImageClick ? 'pointer' : 'default',
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
        >
          <img
            src={img.url}
            alt={img.label}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      ))}

      {/* Refreshed monthly label */}
      {isOwner && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '14px',
          fontSize: '11px',
          color: 'rgba(255, 254, 250, 0.35)',
          fontStyle: 'italic',
          zIndex: 4,
        }}>
          Refreshed monthly
        </div>
      )}
    </motion.div>
  )
}
