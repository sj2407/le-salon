// Step 8: surface the three ways a Le Salon user shares with friends.
// Layout per user mockup: stacked cards, image on the left, title + body on the
// right, decorative "See how" / "Try it" link. Reference images live at
// /onboarding/share-features/.

const CARDS = [
  {
    key: 'marginalia',
    image: '/onboarding/share-features/marginalia.jpeg',
    title: 'Marginalia',
    body: "Open a friend's card and write a note. A fold appears on the corner of their card and they get a notification.",
  },
  {
    key: 'review',
    image: '/onboarding/share-features/review.jpeg',
    title: 'Recommend a review',
    body: "Write a review and tag the friend who'd love that movie or book.",
  },
  {
    key: 'activity',
    image: '/onboarding/share-features/activity.jpeg',
    title: 'Post an activity',
    body: 'Post something you want to do. Friends see it on the shared activity board and can join.',
  },
]

export const ShareWithFriends = ({ onContinue }) => (
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

    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
      maxWidth: '500px',
      marginBottom: '32px',
    }}>
      {CARDS.map(card => (
        <div
          key={card.key}
          style={{
            background: '#FFFEFA',
            borderRadius: '8px',
            boxShadow: '2px 3px 10px rgba(0,0,0,0.08)',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{
            width: '200px',
            height: '200px',
            flexShrink: 0,
            borderRadius: '6px',
            overflow: 'hidden',
            background: '#F4F1EA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src={card.image}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
                display: 'block',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '17px',
              fontWeight: 600,
              color: '#2C2C2C',
              marginBottom: '6px',
            }}>
              {card.title}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#555',
              lineHeight: 1.5,
            }}>
              {card.body}
            </div>
          </div>
        </div>
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
  </div>
)
