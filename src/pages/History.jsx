import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const History = () => {
  const { profile } = useAuth()
  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      fetchHistory()
    }
  }, [profile])

  const fetchHistory = async () => {
    try {
      setLoading(true)

      // Get all cards (including current)
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (cardsError) throw cardsError

      if (cardsData && cardsData.length > 0) {
        // Group cards by date (only keep latest from each day)
        const cardsByDate = new Map()

        cardsData.forEach(card => {
          const dateKey = new Date(card.created_at).toDateString()
          const existing = cardsByDate.get(dateKey)

          // Keep the latest card from each day
          if (!existing || new Date(card.created_at) > new Date(existing.created_at)) {
            cardsByDate.set(dateKey, card)
          }
        })

        // Convert to array of unique daily cards
        const uniqueCards = Array.from(cardsByDate.values())
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

        // Fetch entries for each unique card and organize into table rows
        const historyRows = await Promise.all(
          uniqueCards.map(async (card) => {
            const { data: entriesData, error: entriesError } = await supabase
              .from('entries')
              .select('*')
              .eq('card_id', card.id)

            if (entriesError) throw entriesError

            // Organize entries by category and subcategory
            const row = {
              date: card.created_at,
              isCurrent: card.is_current,
              entries: {}
            }

            entriesData?.forEach(entry => {
              const key = entry.subcategory
                ? `${entry.category} - ${entry.subcategory}`
                : entry.category
              row.entries[key] = entry.content
            })

            return row
          })
        )

        setHistoryData(historyRows)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get all unique column headers
  const allColumns = [...new Set(
    historyData.flatMap(row => Object.keys(row.entries))
  )].sort()

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading your history...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', position: 'relative' }}>
      {/* Writing hand collage */}
      <img
        src="/images/writing-ready.png"
        alt=""
        style={{
          position: 'absolute',
          top: '0px',
          left: '280px',
          width: '120px',
          height: 'auto',
          opacity: 0.75,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'bookFloat 4.5s ease-in-out infinite',
          filter: 'contrast(1.5) brightness(1.15)'
        }}
      />

      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px', textAlign: 'left', marginLeft: '60px', position: 'relative', zIndex: 1 }}>
        My History
      </h1>

      {historyData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          No cards yet. Start by creating your first card!
        </div>
      ) : (
        <div className="activity-board-note" style={{ position: 'relative' }}>
          {/* SVG Pushpin at -45deg */}
          <svg
            width="50"
            height="50"
            viewBox="0 0 50 50"
            style={{
              position: 'absolute',
              top: '-20px',
              left: '-5px',
              zIndex: 10,
              transform: 'rotate(-45deg)'
            }}
          >
            <ellipse cx="25" cy="8" rx="8" ry="6" fill="#C41E3A"/>
            <path d="M 20 8 L 22 25 L 28 25 L 30 8 Z" fill="#8B1A2D"/>
            <circle cx="25" cy="8" r="4" fill="#E63946"/>
            <line x1="25" y1="25" x2="25" y2="38" stroke="#A0A0A0" strokeWidth="1.5"/>
            <path d="M 23 37 L 25 42 L 27 37 Z" fill="#808080"/>
          </svg>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#FFFEFA'
            }}>
              <thead>
                <tr style={{ background: '#F5F1EB', borderBottom: '1px dashed #2C2C2C' }}>
                  <th className="history-date-header" style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    background: '#F5F1EB',
                    borderRight: '1px dashed #2C2C2C',
                    minWidth: '100px'
                  }}>
                    Date
                  </th>
                  {allColumns.map(column => (
                    <th key={column} style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 600,
                      minWidth: '180px',
                      borderRight: '1px dashed #E0E0E0'
                    }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyData.map((row, index) => (
                  <tr key={index} style={{
                    borderBottom: index < historyData.length - 1 ? '1px dashed #E8E8E8' : 'none',
                    background: row.isCurrent ? '#FFF9E6' : '#FFFEFA'
                  }}>
                    <td className="history-date-cell" style={{
                      padding: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: row.isCurrent ? '#FFF9E6' : '#FFFEFA',
                      borderRight: '1px dashed #2C2C2C',
                      whiteSpace: 'nowrap'
                    }}>
                      <div>{formatDate(row.date)}</div>
                      {row.isCurrent && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '9px',
                          color: '#F4A460',
                          fontWeight: 600
                        }}>
                          ●
                        </div>
                      )}
                    </td>
                    {allColumns.map(column => (
                      <td key={column} style={{
                        padding: '16px',
                        fontSize: '14px',
                        fontStyle: 'italic',
                        color: row.entries[column] ? '#2C2C2C' : '#CCC',
                        borderRight: '1px dashed #E0E0E0',
                        lineHeight: '1.4'
                      }}>
                        {row.entries[column] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
