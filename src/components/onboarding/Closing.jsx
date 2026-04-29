// Step 8: the third "bring friends in" feature (Post an activity) plus the
// closing send-off line, on its own page.

const ACTIVITY_CARD = {
  image: '/onboarding/share-features/activity.jpeg',
  title: 'Post an activity',
  body: 'Post something you want to do. Friends see it on the shared activity board and can join.',
}

export const Closing = ({ onContinue }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
  }}>
    <div style={{
      background: '#FFFEFA',
      borderRadius: '8px',
      boxShadow: '2px 3px 10px rgba(0,0,0,0.08)',
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      width: '100%',
      maxWidth: '500px',
      marginBottom: '40px',
    }}>
      <div style={{
        width: 'clamp(130px, 35vw, 200px)',
        height: 'clamp(130px, 35vw, 200px)',
        flexShrink: 0,
        borderRadius: '6px',
        overflow: 'hidden',
        background: '#F4F1EA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src={ACTIVITY_CARD.image}
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
          {ACTIVITY_CARD.title}
        </div>
        <div style={{
          fontSize: '14px',
          color: '#555',
          lineHeight: 1.5,
        }}>
          {ACTIVITY_CARD.body}
        </div>
      </div>
    </div>

    <p className="handwritten" style={{
      fontSize: '30px',
      color: '#2C2C2C',
      textAlign: 'center',
      lineHeight: 1.3,
      maxWidth: '420px',
      marginBottom: '32px',
      marginTop: 0,
    }}>
      We hope you enjoy your time in le Salon
    </p>

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
