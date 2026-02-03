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
    <div className="container" style={{ maxWidth: '1200px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px', textAlign: 'center' }}>
        My History
      </h1>

      {historyData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          No cards yet. Start by creating your first card!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#FFFEFA',
            border: '2px solid #2C2C2C',
            borderRadius: '4px',
            boxShadow: '4px 4px 0 #2C2C2C'
          }}>
            <thead>
              <tr style={{ background: '#F5F1EB', borderBottom: '2px solid #2C2C2C' }}>
                <th className="history-date-header" style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                  background: '#F5F1EB',
                  borderRight: '1.5px solid #2C2C2C',
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
                    borderRight: '1px solid #E8E8E8'
                  }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyData.map((row, index) => (
                <tr key={index} style={{
                  borderBottom: index < historyData.length - 1 ? '1px solid #E8E8E8' : 'none',
                  background: row.isCurrent ? '#FFF9E6' : '#FFFEFA'
                }}>
                  <td className="history-date-cell" style={{
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: row.isCurrent ? '#FFF9E6' : '#FFFEFA',
                    borderRight: '1.5px solid #2C2C2C',
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
                      borderRight: '1px solid #E8E8E8',
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
      )}

    </div>
  )
}
