import { useState } from 'react'
import { renderSimpleMarkdown } from '../../lib/markdownUtils'

const dividerStyle = {
  borderTop: '1px dashed #D4C9B8',
  margin: '32px 0'
}

/**
 * Renders the full parlor entry with reading-optimized typography.
 * The text IS the page — no collapse, no truncation.
 */
export const ParlorText = ({ salonWeek, hideTitle = false, textSize = 13 }) => {
  const [sourcesExpanded, setSourcesExpanded] = useState(false)

  const furtherReading = salonWeek.parlor_further_reading || []
  const sources = salonWeek.parlor_sources || []

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 5%' }}>
      {/* Title */}
      {!hideTitle && (
        <h2
          className="handwritten"
          style={{
            fontSize: '26px',
            textAlign: 'left',
            marginTop: '0',
            marginBottom: '16px',
            color: '#2C2C2C'
          }}
        >
          {salonWeek.parlor_title}
        </h2>
      )}

      {/* Body text — literary typography */}
      <div
        style={{
          fontSize: `${textSize}px`,
          lineHeight: 1.8,
          color: '#2C2C2C',
          fontStyle: 'italic'
        }}
      >
        {renderSimpleMarkdown(salonWeek.parlor_body)}
      </div>

      {/* Divider */}
      {salonWeek.parlor_quote && <div style={dividerStyle} />}

      {/* Quote */}
      {salonWeek.parlor_quote && (
        <blockquote
          style={{
            paddingLeft: '24px',
            borderLeft: '2px solid #E8DCC8',
            margin: '0 0 8px 0',
            fontStyle: 'italic',
            fontSize: '12px',
            lineHeight: 1.7,
            color: '#2C2C2C'
          }}
        >
          "{salonWeek.parlor_quote}"
        </blockquote>
      )}

      {/* Quote attribution */}
      {salonWeek.parlor_quote_attribution && (
        <div
          style={{
            paddingLeft: '24px',
            fontSize: '10px',
            color: '#A89F91',
            fontStyle: 'normal'
          }}
        >
          — {salonWeek.parlor_quote_attribution}
        </div>
      )}

      {/* Divider */}
      {furtherReading.length > 0 && <div style={dividerStyle} />}

      {/* Further reading */}
      {furtherReading.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#6B6156',
              marginBottom: '12px',
              fontWeight: 500
            }}
          >
            Further reading
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {furtherReading.map((item, index) => (
              <li
                key={index}
                style={{
                  fontSize: '11px',
                  lineHeight: 1.5,
                  marginBottom: '8px',
                  paddingLeft: '16px',
                  position: 'relative'
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: '#8C8578'
                  }}
                >
                  ·
                </span>
                <span style={{ fontStyle: 'italic' }}>
                  {item.title}
                </span>
                {item.author && (
                  <span style={{ color: '#6B6156' }}>, {item.author}</span>
                )}
                {item.description && (
                  <span style={{ color: '#8C8578', fontSize: '9px' }}> — {item.description}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources — small, collapsible */}
      {sources.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <button
            onClick={() => setSourcesExpanded(!sourcesExpanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: '9px',
              color: '#8C8578',
              letterSpacing: '0.04em',
              textDecoration: 'underline',
              textDecorationColor: '#D4C9B8'
            }}
          >
            Sources {sourcesExpanded ? '▾' : '▸'}
          </button>
          {sourcesExpanded && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
              {sources.map((source, index) => (
                <li key={index} style={{ fontSize: '9px', lineHeight: 1.5, marginBottom: '4px', color: '#8C8578' }}>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#5C6B4A', textDecoration: 'none' }}
                    >
                      {source.label}
                    </a>
                  ) : (
                    source.label
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
