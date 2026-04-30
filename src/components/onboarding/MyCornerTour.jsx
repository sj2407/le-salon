import { ScreenshotSequence } from '../ScreenshotSequence'
import { ScreenFrame } from './ScreenFrame'

// The five tab screenshots have varying aspects (some are cropped, e.g. the
// wishlist screenshot is nearly square). Wrap the ScreenFrame so the
// letterbox color matches the app background instead of the default black.
const CornerFrame = ({ children }) => (
  <ScreenFrame bg="#F5F1EB">{children}</ScreenFrame>
)

const FRAMES = [
  { src: '/onboarding/my-corner/01-card.png',
    caption: "Every week, fill your card with what you're reading, watching, listening to. See your friends' cards too." },
  { src: '/onboarding/my-corner/02-reviews.png',
    caption: "Rate books, films, shows, podcasts. Recommend them to the friends who'd love them." },
  { src: '/onboarding/my-corner/03-la-liste.png',
    caption: 'Your running list of everything to read, watch, listen to, and experience.' },
  { src: '/onboarding/my-corner/04-wishlist.png',
    caption: "What you'd love to receive. Friends can quietly claim items to gift you, no doubles." },
  { src: '/onboarding/my-corner/05-portrait.png',
    caption: 'Your cultural autobiography, assembled from your music, books, experiences, and creations.' },
]

// Step 1: tour of the five My Corner tabs (Card, Reviews, La Liste, Wishlist,
// Portrait). Same carousel mechanic as Share Extension demo and Scan access
// demos: auto-advance, dots are tappable, cross-fade between frames.
export const MyCornerTour = ({ onContinue }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
  }}>
    <h2 className="handwritten" style={{
      fontSize: '34px',
      marginBottom: '6px',
      color: '#2C2C2C',
    }}>
      Your Corner
    </h2>
    <p style={{
      fontSize: '14px',
      color: '#777',
      marginBottom: '20px',
      maxWidth: '320px',
      lineHeight: 1.5,
    }}>
      Five places that make Le Salon yours.
    </p>

    <ScreenshotSequence
      frames={FRAMES}
      advance="both"
      intervalMs={3500}
      imageFit="contain"
      captionMinHeight={75}
      WrapperComponent={CornerFrame}
    />

    <button
      onClick={onContinue}
      style={{
        marginTop: '32px',
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
  </div>
)
