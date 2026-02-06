// Simple flip - shows front or back based on isFlipped state
export const FlippableSection = ({
  children,
  backContent,
  isFlipped,
  sectionClass = 'section-box'
}) => {
  if (isFlipped) {
    // Show back content
    return (
      <div
        className={sectionClass}
        style={{
          position: 'relative',
          minHeight: '180px'
        }}
      >
        {backContent}
      </div>
    )
  }

  // Show front content (children already has the section styling)
  return children
}
