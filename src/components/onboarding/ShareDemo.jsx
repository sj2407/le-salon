import { ScreenshotSequence } from '../ScreenshotSequence'
import { ScreenFrame } from './ScreenFrame'

const FRAMES = [
  { src: '/onboarding/share/click_le_salon_icon.png',
    caption: "Saw something on Instagram? Share it to Le Salon." },
  { src: '/onboarding/share/success_message.png',
    caption: 'AI reads it instantly.' },
  { src: '/onboarding/share/catchup_screen.jpeg',
    caption: "Confirms it's classified: article, podcast, exhibition, book, event…" },
  { src: '/onboarding/share/la_liste_card.jpeg',
    caption: '…and lands in the right place. No typing.' },
]

// Step 3: animated demo of the iOS Share Extension flow.
export const ShareDemo = ({ onContinue }) => (
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
      Share from anywhere
    </h2>
    <p style={{
      fontSize: '14px',
      color: '#777',
      marginBottom: '20px',
      maxWidth: '320px',
      lineHeight: 1.5,
    }}>
      Le Salon lives in your iOS share sheet.
    </p>

    <ScreenshotSequence
      frames={FRAMES}
      advance="both"
      intervalMs={2000}
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
