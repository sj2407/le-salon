import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CardDisplay } from '../components/CardDisplay'

export const History = () => {
  const { profile } = useAuth()
  const [cards, setCards] = useState([])
  const [cardsWithEntries, setCardsWithEntries] = useState([])
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

      // Get all non-current cards (archived)
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_current', false)
        .order('created_at', { ascending: false })

      if (cardsError) throw cardsError

      if (cardsData && cardsData.length > 0) {
        // Fetch entries for each card
        const cardsWithEntriesData = await Promise.all(
          cardsData.map(async (card) => {
            const { data: entriesData, error: entriesError } = await supabase
              .from('entries')
              .select('*')
              .eq('card_id', card.id)
              .order('display_order')

            if (entriesError) throw entriesError

            return {
              card,
              entries: entriesData || []
            }
          })
        )

        setCardsWithEntries(cardsWithEntriesData)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="container">
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px', textAlign: 'center' }}>
        My History
      </h1>

      {cardsWithEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontStyle: 'italic', color: '#777' }}>
          No past cards yet. When you update your card, the previous version will appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {cardsWithEntries.map(({ card, entries }) => (
            <CardDisplay
              key={card.id}
              card={card}
              entries={entries}
              displayName={profile.display_name}
              isEditable={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}
