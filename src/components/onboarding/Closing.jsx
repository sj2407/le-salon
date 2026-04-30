// Closing: Parlor screenshot scaled to fit, then caption, send-off, Continue.
// Image keeps its natural aspect; max-height + max-width let the browser
// shrink it as needed without cropping or letterboxing.
export const Closing = ({ onContinue }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
    textAlign: 'center',
  }}>
    <img
      src="/onboarding/closing/parlor.jpeg?v=2"
      alt=""
      style={{
        maxHeight: 'min(420px, 50vh)',
        maxWidth: '100%',
        width: 'auto',
        height: 'auto',
        display: 'block',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    />

    <p style={{
      fontSize: '15px',
      color: '#2C2C2C',
      margin: '0 auto 20px',
      maxWidth: '340px',
      lineHeight: 1.5,
    }}>
      Every Monday, a new essay in the Parlor. Your friends gather around the same one.
    </p>

    <p className="handwritten" style={{
      fontSize: '32px',
      color: '#2C2C2C',
      lineHeight: 1.25,
      maxWidth: '420px',
      margin: '0 auto 28px',
    }}>
      I hope you enjoy your time in le Salon, Soumi
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
