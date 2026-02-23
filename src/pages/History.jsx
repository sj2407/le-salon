import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FilePdf } from '@phosphor-icons/react'

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
              // Append to existing entries with same key (for multiple songs, articles, etc.)
              if (row.entries[key]) {
                row.entries[key] = row.entries[key] + '\n' + entry.content
              } else {
                row.entries[key] = entry.content
              }
            })

            return row
          })
        )

        setHistoryData(historyRows)
      }
    } catch (err) {
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

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('landscape')

      // Add title
      doc.setFontSize(20)
      doc.text('My History', 14, 20)

      // Add user info
      doc.setFontSize(10)
      doc.text(`${profile.display_name} (@${profile.username})`, 14, 28)
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 34)

      // Prepare table data
      const tableColumn = ['Date', ...allColumns]
      const tableRows = historyData.map(row => [
        formatDate(row.date) + (row.isCurrent ? ' (Current)' : ''),
        ...allColumns.map(column => row.entries[column] || '—')
      ])

      // Use autoTable as a standalone function
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [44, 44, 44],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [245, 241, 235],
          textColor: [44, 44, 44],
          fontStyle: 'bold',
          fontSize: 9
        },
        alternateRowStyles: {
          fillColor: [255, 254, 250]
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' }
        },
        margin: { top: 40 }
      })

      // Save the PDF
      const filename = `le-salon-history-${profile.username}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
    } catch (err) {
      alert(`Failed to export PDF: ${err.message}`)
    }
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
          top: '8px',
          right: '15%',
          width: '100px',
          height: 'auto',
          opacity: 0.75,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'bookFloat 4.5s ease-in-out infinite',
          filter: 'contrast(1.5) brightness(1.15)'
        }}
      />

      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '24px', marginTop: '8px', textAlign: 'left', marginLeft: '10px', position: 'relative', zIndex: 1 }}>
        My History
      </h1>

      {historyData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          No cards yet. Start by creating your first card!
        </div>
      ) : (
        <div className="activity-board-note" style={{ position: 'relative' }}>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#FFFEFA'
            }}>
              <thead>
                <tr style={{ background: '#F5F1EB' }}>
                  <th className="history-date-header" style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    background: '#F5F1EB',
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
                      borderRight: 'none'
                    }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyData.map((row, index) => (
                  <tr key={index} style={{
                    borderBottom: 'none',
                    background: row.isCurrent ? '#FFF9E6' : '#FFFEFA'
                  }}>
                    <td className="history-date-cell" style={{
                      padding: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: row.isCurrent ? '#FFF9E6' : '#FFFEFA',
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
                        borderRight: 'none',
                        lineHeight: '1.4',
                        whiteSpace: 'pre-line'
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

      {historyData.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '16px',
          marginRight: '8px'
        }}>
          <button
            onClick={exportToPDF}
            title="Export to PDF"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              opacity: 0.6,
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.6'}
          >
            <FilePdf size={28} weight="duotone" color="#7A3B2E" />
          </button>
        </div>
      )}

    </div>
  )
}
