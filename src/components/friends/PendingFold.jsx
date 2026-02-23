import { useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'

export const PendingFold = ({ pendingRequests, sentRequests, onAccept, onDecline }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const totalCount = pendingRequests.length + sentRequests.length

  if (totalCount === 0) return null

  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFEFA',
        borderRadius: '3px',
        boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        marginBottom: '8px'
      }}
    >
      {/* Dog-ear fold — top right */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '28px',
          height: '28px',
          background: 'linear-gradient(225deg, #F5F1EB 50%, #E8E0D0 50%)',
          boxShadow: '-1px 1px 2px rgba(0, 0, 0, 0.08)',
          zIndex: 2
        }}
      />

      {/* Collapsed header — tap to expand */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span
          style={{
            fontFamily: "'Caveat', cursive",
            fontSize: '22px',
            fontWeight: 600,
            color: '#7A3B2E'
          }}
        >
          Pending ({totalCount})
        </span>
        <span
          style={{
            fontSize: '14px',
            color: '#7A3B2E',
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            display: 'inline-block'
          }}
        >
          &#9656;
        </span>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 20px 16px' }}>
              {/* Incoming requests */}
              {pendingRequests.length > 0 && (
                <div>
                  {pendingRequests.map((req, i) => {
                    const displayName = req.friendProfile.display_name
                    const initial = displayName.charAt(0).toUpperCase()
                    const photoUrl = req.friendProfile.profile_photo_url

                    return (
                      <div
                        key={req.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 0',
                          borderBottom: i < pendingRequests.length - 1 || sentRequests.length > 0
                            ? '1px dashed #E8E8E8'
                            : 'none'
                        }}
                      >
                        {/* Avatar */}
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={displayName}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#E8DCC8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: "'Caveat', cursive",
                              fontSize: '18px',
                              fontWeight: 600,
                              color: '#2C2C2C',
                              flexShrink: 0
                            }}
                          >
                            {initial}
                          </div>
                        )}

                        {/* Name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{displayName}</div>
                          <div style={{ fontSize: '13px', color: '#777' }}>@{req.friendProfile.username}</div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); onAccept(req.id) }}
                            className="primary"
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDecline(req.id) }}
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Sent requests */}
              {sentRequests.length > 0 && (
                <div>
                  {sentRequests.map((req, i) => {
                    const displayName = req.friendProfile.display_name
                    const initial = displayName.charAt(0).toUpperCase()
                    const photoUrl = req.friendProfile.profile_photo_url

                    return (
                      <div
                        key={req.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 0',
                          borderBottom: i < sentRequests.length - 1
                            ? '1px dashed #E8E8E8'
                            : 'none'
                        }}
                      >
                        {/* Avatar */}
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={displayName}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#E8DCC8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: "'Caveat', cursive",
                              fontSize: '18px',
                              fontWeight: 600,
                              color: '#2C2C2C',
                              flexShrink: 0
                            }}
                          >
                            {initial}
                          </div>
                        )}

                        {/* Name + status */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{displayName}</div>
                          <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>Pending...</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
