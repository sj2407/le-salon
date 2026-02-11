import { useState } from 'react'
import { ParagraphComments } from './ParagraphComments'

/**
 * Splits review text into paragraphs with comment affordance.
 * Replaces the raw review_text rendering when comments are enabled.
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
  onReplyToComment
}) => {
  const [activeParagraph, setActiveParagraph] = useState(null)

  const paragraphs = (review.review_text || '').split('\n\n').filter(p => p.trim())

  const getCommentForParagraph = (index) => {
    if (isOwner) {
      // Owner sees all comments on this paragraph
      return comments.filter(c => c.paragraph_index === index)
    }
    // Friend sees only their own comment
    return comments.filter(c => c.paragraph_index === index && c.from_user_id === currentUserId)
  }

  const handleParagraphClick = (index) => {
    setActiveParagraph(activeParagraph === index ? null : index)
  }

  return (
    <div style={{ marginTop: '10px' }}>
      {paragraphs.map((text, index) => {
        const paragraphComments = getCommentForParagraph(index)
        const hasComments = paragraphComments.length > 0
        const isActive = activeParagraph === index

        return (
          <div key={index} style={{ marginBottom: index < paragraphs.length - 1 ? '12px' : '0' }}>
            {/* Paragraph text */}
            <div
              onClick={() => handleParagraphClick(index)}
              style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#2C2C2C',
                fontStyle: 'italic',
                whiteSpace: 'pre-wrap',
                cursor: 'pointer',
                paddingLeft: '10px',
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
              {text}
            </div>

            {/* Comment area */}
            {isActive && (
              isOwner ? (
                // Owner: show all comments from friends
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
                // Friend: show their single comment (or input)
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
