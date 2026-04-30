// Reusable framed container for onboarding image carousels.
// Defaults to a phone-screen-shaped frame (9:19.5) so ShareDemo and
// ScanAccessDemo render iPhone screenshots naturally. ShareWithFriends and
// any other carousel can override `height` and `aspectRatio` to suit their
// source images, and `bg` for the letterbox color when imageFit is 'contain'.
export const ScreenFrame = ({
  children,
  bg = '#000',
  height = 'min(520px, 50vh)',
  aspectRatio = '9 / 19.5',
}) => (
  <div style={{
    height,
    aspectRatio,
    borderRadius: '14px',
    overflow: 'hidden',
    background: bg,
    boxShadow: '0 12px 28px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08)',
  }}>
    {children}
  </div>
)
