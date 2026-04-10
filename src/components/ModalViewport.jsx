/**
 * Keyboard-aware inner viewport for modals.
 * Insert between a modal's backdrop div and its content box.
 * When the iOS keyboard is open, this div shrinks to the visible area
 * so the modal content centers above the keyboard.
 * When keyboard is closed, height is 100% — zero visual change.
 */
const ModalViewport = ({ children, padding = '20px', align = 'center', style }) => (
  <div
    style={{
      width: '100%',
      height: 'calc(100% - var(--keyboard-height, 0px))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: align === 'top' ? 'flex-start' : 'center',
      padding,
      overflow: align === 'top' ? 'auto' : 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
)

export default ModalViewport
