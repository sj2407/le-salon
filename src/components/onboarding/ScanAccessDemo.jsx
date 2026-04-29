import { ScreenshotSequence } from '../ScreenshotSequence'

const ScreenFrame = ({ children }) => (
  <div style={{
    width: '240px',
    aspectRatio: '9 / 19.5',
    borderRadius: '14px',
    overflow: 'hidden',
    background: '#000',
    boxShadow: '0 12px 28px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08)',
  }}>
    {children}
  </div>
)

// Generic "how to find the scan in the app" step. Two configs live below
// in named exports, but the rendering is shared.
const ScanAccessDemo = ({ title, subtitle, frames, onContinue }) => (
  <div style={{
    minHeight: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
  }}>
    <h2 className="handwritten" style={{
      fontSize: '32px',
      marginBottom: '6px',
      color: '#2C2C2C',
    }}>
      {title}
    </h2>
    <p style={{
      fontSize: '14px',
      color: '#777',
      marginBottom: '20px',
      maxWidth: '320px',
      lineHeight: 1.5,
    }}>
      {subtitle}
    </p>

    <ScreenshotSequence
      frames={frames}
      advance="both"
      intervalMs={3500}
      WrapperComponent={ScreenFrame}
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

const PLAYBILL_FRAMES = [
  { src: '/onboarding/scans/playbill/1-click-quill.png',
    caption: 'In Portrait, tap the quill icon.' },
  { src: '/onboarding/scans/playbill/2-pick-scan.png',
    caption: "Pick 'Scan playbill'." },
  { src: '/onboarding/scans/playbill/3-take-photo.png',
    caption: 'Snap a program or ticket stub.' },
  { src: '/onboarding/scans/playbill/4-validate.png',
    caption: "Confirm the details. It's logged as an experience." },
]

const BOOKS_FRAMES = [
  { src: '/onboarding/scans/books/1-click-quill.png',
    caption: 'In Portrait, tap the quill icon.' },
  { src: '/onboarding/scans/books/2-pick-scan.png',
    caption: "Pick 'Scan bookshelf'." },
  { src: '/onboarding/scans/books/3-take-photo.png',
    caption: 'Snap a stack of spines.' },
  { src: '/onboarding/scans/books/4-end.png',
    caption: 'Le Salon reads them and adds them in.' },
]

export const ScanAccessExperience = ({ onContinue }) => (
  <ScanAccessDemo
    title="Logging an experience"
    subtitle="A quiet path to the playbill scanner."
    frames={PLAYBILL_FRAMES}
    onContinue={onContinue}
  />
)

export const ScanAccessBooks = ({ onContinue }) => (
  <ScanAccessDemo
    title="Adding books in bulk"
    subtitle="The bookshelf scanner is one tap away."
    frames={BOOKS_FRAMES}
    onContinue={onContinue}
  />
)
