import { useState } from 'react'
import { BookshelfScanModal } from '../portrait/BookshelfScanModal'
import { PlaybillScanModal } from '../portrait/PlaybillScanModal'
import { GoodreadsImportModal } from '../portrait/GoodreadsImportModal'
import { startSpotifyConnect } from '../../lib/spotifyAuth'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// Portrait Tour: surface the four hidden Portrait features. Each tile opens the
// existing modal in place. Spotify is OAuth and persists onboarding_step before
// redirecting (sessionStorage doesn't survive Capacitor WKWebView reliably).
//
// All four tiles share one layout: faint blurred image bg, centered title + body.
// Spotify and Goodreads use brand fonts and palette; bookshelf and playbill use
// the default app type on a darkened photo.

const TILES = [
  {
    key: 'bookshelf',
    image: '/onboarding/tiles/bookshelf.jpeg',
    bg: '#3B2417',
    fg: '#FFFEFA',
    title: 'Scan your bookshelf',
    body: 'Point your camera at a stack. Le Salon reads the spines.',
    bgOpacity: 0.55,
    bgFilter: 'brightness(0.55)',
  },
  {
    key: 'spotify',
    image: '/onboarding/tiles/spotify-bg.jpeg',
    bg: '#191414',
    fg: '#1DB954',
    title: 'Spotify',
    titleFont: "'Helvetica Neue', Inter, system-ui, Arial, sans-serif",
    titleWeight: 700,
    titleSize: '28px',
    titleLetterSpacing: '-0.02em',
    body: 'Surface your top artists, tracks, and the mood of your week.',
    bodyColor: '#FFFEFA',
    bgOpacity: 0.22,
    bgFilter: 'grayscale(0.5) brightness(0.7)',
  },
  {
    key: 'playbill',
    image: '/onboarding/tiles/playbill.png',
    bg: '#3B2417',
    fg: '#FFFEFA',
    title: 'Scan a playbill',
    body: 'Snap a program, ticket, or museum stub to log it as an experience.',
    bgOpacity: 0.5,
    bgFilter: 'brightness(0.5)',
  },
  {
    key: 'goodreads',
    image: '/onboarding/tiles/goodreads-bg.jpeg',
    bg: '#F4F1EA',
    fg: '#553B14',
    title: 'goodreads',
    titleFont: "'Merriweather', Georgia, 'Times New Roman', serif",
    titleWeight: 700,
    titleSize: '26px',
    body: 'Bring your reading history with you in one CSV.',
    bgOpacity: 0.18,
    bgFilter: 'sepia(0.15)',
  },
]

export const PortraitTour = ({ onContinue, onResumeStepBeforeRedirect }) => {
  const { user } = useAuth()
  const [openModal, setOpenModal] = useState(null)

  const handleTileTap = async (key) => {
    if (key === 'spotify') {
      try {
        await onResumeStepBeforeRedirect?.()
        await supabase
          .from('profiles')
          .update({ onboarding_step: 4 })
          .eq('id', user.id)
      } catch {
        // Non-fatal, connect anyway
      }
      await startSpotifyConnect()
      return
    }
    setOpenModal(key)
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 20px',
    }}>
      <h2 className="handwritten" style={{
        fontSize: '34px',
        marginBottom: '6px',
        color: '#2C2C2C',
        textAlign: 'center',
      }}>
        Build your Portrait
      </h2>
      <p style={{
        fontSize: '14px',
        color: '#777',
        marginBottom: '24px',
        maxWidth: '320px',
        textAlign: 'center',
        lineHeight: 1.5,
      }}>
        Four ways to bring your cultural life in. Try one now or come back later.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        width: '100%',
        maxWidth: '420px',
        marginBottom: '32px',
      }}>
        {TILES.map(tile => (
          <button
            key={tile.key}
            onClick={() => handleTileTap(tile.key)}
            style={{
              position: 'relative',
              aspectRatio: '1 / 1.15',
              borderRadius: '6px',
              overflow: 'hidden',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              background: tile.bg,
              boxShadow: '2px 3px 10px rgba(0,0,0,0.10)',
              fontFamily: 'inherit',
              textAlign: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <img
              src={tile.image}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: tile.bgOpacity,
                filter: tile.bgFilter,
              }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px',
              color: tile.fg,
            }}>
              <div style={{
                fontFamily: tile.titleFont || 'inherit',
                fontWeight: tile.titleWeight || 700,
                fontSize: tile.titleSize || '17px',
                letterSpacing: tile.titleLetterSpacing || '0',
                marginBottom: '8px',
                lineHeight: 1.1,
              }}>
                {tile.title}
              </div>
              <div style={{
                fontSize: '12px',
                lineHeight: 1.45,
                opacity: 0.92,
                color: tile.bodyColor || tile.fg,
              }}>
                {tile.body}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onContinue}
        style={{
          padding: '12px 36px',
          background: '#622722',
          color: '#FFFEFA',
          border: 'none',
          borderRadius: '3px',
          fontSize: '16px',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Continue
      </button>

      <BookshelfScanModal
        isOpen={openModal === 'bookshelf'}
        onClose={() => setOpenModal(null)}
        onBooksAdded={() => setOpenModal(null)}
      />
      <PlaybillScanModal
        isOpen={openModal === 'playbill'}
        onClose={() => setOpenModal(null)}
        onExperiencesAdded={() => setOpenModal(null)}
      />
      <GoodreadsImportModal
        isOpen={openModal === 'goodreads'}
        onClose={() => setOpenModal(null)}
        onImported={() => setOpenModal(null)}
      />
    </div>
  )
}
