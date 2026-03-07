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

  // Collage positioning — 3D cluster overflowing top-right, bottom card on top
  const imagePositions = [
    { top: '-48px', right: '-10px', width: '72px', height: '90px', zIndex: 2, rotate: 4 },
    { top: '-42px', right: '54px', width: '64px', height: '80px', zIndex: 1, rotate: -3 },
    { top: '0px', right: '22px', width: '60px', height: '74px', zIndex: 3, rotate: 2 },
  ]

  // Gentle sway parameters per image (different durations so they feel organic)
  const swayParams = [
    { duration: 4.5, delay: 0 },
    { duration: 5, delay: 0.8 },
    { duration: 4, delay: 0.4 },
  ]

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.5, ease: 'easeOut' }}
      style={{
        background: 'linear-gradient(135deg, #4A1D19 0%, #622722 45%, #7A332D 100%)',
        borderRadius: '12px',
        padding: '24px 20px',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Text content — full width, text wraps around nothing */}
      <div style={{ position: 'relative', zIndex: 4 }}>
        {moodLabel && (
          <motion.h2
            initial={prefersReduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.5, delay: 0, ease: 'easeOut' }}
            style={{
              margin: '0 0 10px 0',
              fontSize: '42px',
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
              lineHeight: 1.6,
              color: 'rgba(255, 254, 250, 0.85)',
              fontFamily: 'Source Serif 4, Georgia, serif',
            }}
          >
            {portraitText}
          </motion.p>
        )}
      </div>

      {/* Image collage — 3D cluster with gentle sway */}
      {hasImages && displayImages.map((img, i) => {
        const pos = imagePositions[i]
        const sway = swayParams[i]
        const baseRotate = pos.rotate
        return (
          <motion.div
            key={`${img.type}-${img.index}`}
            onClick={() => onImageClick && onImageClick(img)}
            initial={{ rotate: baseRotate }}
            animate={prefersReduced ? { rotate: baseRotate } : {
              rotate: [baseRotate - 1.5, baseRotate + 1.5, baseRotate - 1.5],
            }}
            transition={prefersReduced ? {} : {
              duration: sway.duration,
              delay: sway.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              top: pos.top,
              right: pos.right,
              width: pos.width,
              height: pos.height,
              zIndex: pos.zIndex,
              borderRadius: '6px',
              overflow: 'hidden',
              cursor: onImageClick ? 'pointer' : 'default',
              opacity: 0.85,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
            whileHover={{ opacity: 1, scale: 1.05 }}
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
          </motion.div>
        )
      })}

      {/* Refreshed monthly label */}
      {isOwner && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          fontSize: '11px',
          color: 'rgba(255, 254, 250, 0.35)',
          fontStyle: 'italic',
          zIndex: 5,
        }}>
          Refreshed monthly
        </div>
      )}
    </motion.div>
  )
}
