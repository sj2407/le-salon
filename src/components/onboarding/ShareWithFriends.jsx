import { ScreenshotSequence } from '../ScreenshotSequence'

// Bring friends in: three ways to share with friends, presented as a
// carousel matching the My Corner tour mechanic (3500ms, dots tappable,
// cross-fade, sticky Continue).
//
// No visible card: the wrapper is a borderless invisible box (just gives
// the carousel a sized parent for absolute-positioned cross-fading slides).
// Each image renders at its natural aspect via objectFit: contain — full
// image, no cropping, no distortion. The wrapper's leftover area shows the
// page background directly.
const FriendsFrame = ({ children }) => (
  <div style={{
    height: 'min(280px, 32vh)',
    aspectRatio: '4 / 3',
    overflow: 'hidden',
  }}>
    {children}
  </div>
)

const FRAMES = [
  {
    src: '/onboarding/share-features/marginalia.jpeg',
    caption: "Scribble in the margins. Open a friend's card, leave a note. A fold appears on the corner; they get a notification.",
  },
  {
    src: '/onboarding/share-features/review.jpeg',
    caption: "Recommend a review. Tag the friend who'd love that movie or book.",
  },
  {
    src: '/onboarding/share-features/activity.jpeg',
    caption: 'Post an activity. Friends see it on the shared activity board and can join.',
  },
]

export const ShareWithFriends = ({ onContinue }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
  }}>
    <h2 className="handwritten" style={{
      fontSize: '34px',
      marginBottom: '6px',
      color: '#2C2C2C',
      textAlign: 'center',
    }}>
      Bring friends in
    </h2>
    <p style={{
      fontSize: '14px',
      color: '#777',
      marginBottom: '24px',
      maxWidth: '320px',
      textAlign: 'center',
      lineHeight: 1.5,
    }}>
      Three small ways to share what you love.
    </p>

    <ScreenshotSequence
      frames={FRAMES}
      advance="both"
      intervalMs={3500}
      imageFit="contain"
      captionMinHeight={75}
      WrapperComponent={FriendsFrame}
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
