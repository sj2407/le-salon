import { useState } from 'react'
import { ParagraphComments } from './ParagraphComments'

/**
 * Splits review text into paragraphs with comment affordance.
 * When inReader=true, uses reader typography (larger, non-italic, drop cap).
 */
export const ExpandedReviewText = ({
  review,
  comments,
  isOwner,
  currentUserId,
  ownerName,
  commenterName,
  onLeaveComment,
  onUpdateComment,
  onDeleteComment,
  onReplyToComment,
  inReader
}) => {
  const [activeParagraph, setActiveParagraph] = useState(null)

  const paragraphs = (review.review_text || '').split('\n\n').filter(p => p.trim())

  const getCommentForParagraph = (index) => {
    if (isOwner) {
      return comments.filter(c => c.paragraph_index === index)
    }
    return comments.filter(c => c.paragraph_index === index && c.from_user_id === currentUserId)
  }

  const handleParagraphClick = (index) => {
    setActiveParagraph(activeParagraph === index ? null : index)
  }

  return (
    <div style={{ marginTop: inReader ? 0 : '10px' }}>
      {paragraphs.map((text, index) => {
        const paragraphComments = getCommentForParagraph(index)
        const hasComments = paragraphComments.length > 0
        const isActive = activeParagraph === index

        return (
          <div key={index} style={{ marginBottom: index < paragraphs.length - 1 ? (inReader ? '16px' : '12px') : '0' }}>
            {/* Paragraph text */}
            <div
              onClick={() => handleParagraphClick(index)}
              style={{
                fontSize: inReader ? '15px' : '14px',
                lineHeight: inReader ? 1.8 : 1.6,
                color: '#2C2C2C',
                fontStyle: 'italic',
                whiteSpace: 'pre-wrap',
                cursor: 'pointer',
                paddingLeft: '10px',
                textIndent: inReader && index > 0 ? '1.5em' : undefined,
                borderLeft: isActive
                  ? '2px solid #4A7BA7'
                  : hasComments
                    ? '2px solid #D0D0D0'
                    : '2px solid transparent',
                transition: 'border-color 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isActive && !hasComments) {
                  e.currentTarget.style.borderLeftColor = '#D0D0D0'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && !hasComments) {
                  e.currentTarget.style.borderLeftColor = 'transparent'
                }
              }}
            >
              {/* Dot indicator for paragraphs with comments */}
              {hasComments && !isActive && (
                <span style={{
                  position: 'absolute',
                  left: '-4px',
                  top: '8px',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: '#C0B8A8'
                }} />
              )}
              {/* Drop cap for first paragraph in reader mode */}
              {inReader && index === 0 && text.length > 0 ? (
                <>
                  <span style={{
                    float: 'left',
                    fontSize: '48px',
                    fontWeight: 700,
                    lineHeight: 1,
                    marginRight: '8px',
                    marginTop: '4px',
                    color: '#622722',
                    fontFamily: "'Source Serif 4', Georgia, serif"
                  }}>
                    {text[0]}
                  </span>
                  {text.slice(1)}
                </>
              ) : text}
            </div>

            {/* Comment area */}
            {isActive && (
              isOwner ? (
                paragraphComments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {paragraphComments.map((comment) => (
                      <ParagraphComments
                        key={comment.id}
                        reviewId={review.id}
                        paragraphIndex={index}
                        comment={comment}
                        isOwner={true}
                        ownerName={ownerName}
                        commenterName={comment.from_user?.display_name || comment.commenter_name || 'Friend'}
                        onReplyToComment={onReplyToComment}
                        onClose={() => setActiveParagraph(null)}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{
                    marginTop: '8px',
                    marginLeft: '12px',
                    paddingLeft: '12px',
                    borderLeft: '2px solid #D0D0D0',
                    fontSize: '13px',
                    color: '#999',
                    fontStyle: 'italic',
                    padding: '8px 12px'
                  }}>
                    No comments on this passage yet.
                  </div>
                )
              ) : (
                <ParagraphComments
                  reviewId={review.id}
                  paragraphIndex={index}
                  comment={paragraphComments[0] || null}
                  isOwner={false}
                  ownerName={ownerName}
                  commenterName={commenterName}
                  onLeaveComment={onLeaveComment}
                  onUpdateComment={onUpdateComment}
                  onDeleteComment={onDeleteComment}
                  onClose={() => setActiveParagraph(null)}
                />
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
