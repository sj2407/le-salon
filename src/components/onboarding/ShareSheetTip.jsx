// Step 4: text-only setup tip for the iOS Share Sheet. No animation.
export const ShareSheetTip = ({ onContinue }) => (
  <div style={{
    minHeight: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 28px',
    textAlign: 'center',
  }}>
    <h2 className="handwritten" style={{
      fontSize: '32px',
      marginBottom: '20px',
      color: '#2C2C2C',
    }}>
      One quick setup
    </h2>
    <div style={{
      background: '#FFFEFA',
      borderRadius: '4px',
      padding: '24px',
      maxWidth: '380px',
      boxShadow: '2px 3px 10px rgba(0,0,0,0.08)',
      marginBottom: '32px',
    }}>
      <p style={{
        fontSize: '15px',
        color: '#2C2C2C',
        lineHeight: 1.6,
        margin: 0,
      }}>
        First time sharing to Le Salon? You may need to add it to your iOS Share Sheet.
        Tap <strong>More</strong> in any share menu, then <strong>Edit</strong>, then toggle Le Salon on.
        You only do this once.
      </p>
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
