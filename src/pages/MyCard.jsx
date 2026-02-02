import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CardDisplay } from '../components/CardDisplay'
import { CardEdit } from '../components/CardEdit'

export const MyCard = () => {
  const { profile } = useAuth()
  const [card, setCard] = useState(null)
  const [entries, setEntries] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      fetchCurrentCard()
    }
  }, [profile])

  const fetchCurrentCard = async () => {
    try {
      setLoading(true)

      // Get current card
      const { data: cardData, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_current', true)
        .single()

      if (cardError && cardError.code !== 'PGRST116') {
        throw cardError
      }

      if (cardData) {
        setCard(cardData)

        // Get entries for current card
        const { data: entriesData, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .eq('card_id', cardData.id)
          .order('display_order')

        if (entriesError) throw entriesError
        setEntries(entriesData || [])
      } else {
        // No current card exists, create one
        await createNewCard([])
      }
    } catch (err) {
      console.error('Error fetching card:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createNewCard = async (newEntries) => {
    try {
      // Create new card
      const { data: newCard, error: cardError } = await supabase
        .from('cards')
        .insert({
          user_id: profile.id,
          is_current: true
        })
        .select()
        .single()

      if (cardError) throw cardError

      // Insert entries
      if (newEntries.length > 0) {
        const entriesWithCardId = newEntries.map((entry, index) => ({
          ...entry,
          card_id: newCard.id,
          display_order: index
        }))

        const { data: insertedEntries, error: entriesError } = await supabase
          .from('entries')
          .insert(entriesWithCardId)
          .select()

        if (entriesError) throw entriesError
        setEntries(insertedEntries)
      } else {
        setEntries([])
      }

      setCard(newCard)
    } catch (err) {
      console.error('Error creating card:', err)
      setError(err.message)
      throw err
    }
  }

  const archiveCurrentCard = async () => {
    if (!card) return

    try {
      const { error } = await supabase
        .from('cards')
        .update({ is_current: false })
        .eq('id', card.id)

      if (error) throw error
    } catch (err) {
      console.error('Error archiving card:', err)
      throw err
    }
  }

  const handleSave = async (newEntries) => {
    try {
      setLoading(true)

      // Archive current card
      if (card) {
        await archiveCurrentCard()
      }

      // Create new card with entries
      await createNewCard(newEntries)

      setIsEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading your card...</div>
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
      {isEditing ? (
        <CardEdit
          entries={entries}
          displayName={profile.display_name}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <CardDisplay
          card={card}
          entries={entries}
          displayName={profile.display_name}
          isEditable={true}
          onEdit={() => setIsEditing(true)}
        />
      )}
    </div>
  )
}
