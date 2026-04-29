// Step 0: locked welcome copy + Begin / "I'll explore on my own" skip.
export const Welcome = ({ onBegin, onSkip }) => (
  <div style={{
    minHeight: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
  }}>
    <h1 className="handwritten" style={{
      fontSize: '46px',
      marginBottom: '24px',
      color: '#2C2C2C',
    }}>
      Welcome to Le Salon
    </h1>
    <p style={{
      fontSize: '17px',
      lineHeight: 1.55,
      color: '#2C2C2C',
      maxWidth: '380px',
      marginBottom: '40px',
    }}>
      A cultural room of your own. Share books you're reading, music you're listening to, shows you're watching with the people you love.
    </p>
    <button
      onClick={onBegin}
      style={{
        padding: '12px 36px',
        background: '#622722',
        color: '#FFFEFA',
        border: 'none',
        borderRadius: '3px',
        fontSize: '16px',
        cursor: 'pointer',
        marginBottom: '16px',
        fontFamily: 'inherit',
      }}
    >
      Begin
    </button>
    <button
      onClick={onSkip}
      style={{
        background: 'none',
        border: 'none',
        color: '#777',
        fontSize: '13px',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      I'll explore on my own
    </button>
  </div>
)
