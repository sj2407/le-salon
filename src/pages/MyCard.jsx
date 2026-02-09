import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { CardDisplay } from '../components/CardDisplay'
import { CardEdit } from '../components/CardEdit'
import { SectionEditModal } from '../components/SectionEditModal'

export const MyCard = () => {
  const { profile } = useAuth()
  const [card, setCard] = useState(null)
  const [entries, setEntries] = useState([])
  const [notes, setNotes] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
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

        // Fetch notes for this card
        await fetchNotes(cardData.id)
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

  const fetchNotes = async (cardId) => {
    try {
      const { data, error } = await supabase
        .from('card_notes')
        .select('*, from_user:profiles!card_notes_from_user_id_fkey(display_name)')
        .eq('card_id', cardId)
        .eq('to_user_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) {
        // Table might not exist yet, just log and continue
        console.log('Notes fetch error (table may not exist):', error.message)
        setNotes([])
        return
      }

      setNotes(data || [])
    } catch (err) {
      console.log('Error fetching notes:', err)
      setNotes([])
    }
  }

  const handleMarkNotesRead = async (sectionName) => {
    if (!card) return

    try {
      const { error } = await supabase
        .from('card_notes')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('card_id', card.id)
        .eq('card_section', sectionName)
        .eq('to_user_id', profile.id)

      if (error) throw error

      // Refresh notes
      await fetchNotes(card.id)
    } catch (err) {
      console.error('Error marking notes as read:', err)
    }
  }

  const handleReplyToNote = async (noteId, replyText) => {
    if (!card) return

    try {
      // Find the note to get the author's info
      const note = notes.find(n => n.id === noteId)
      if (!note) return

      const { error } = await supabase
        .from('card_notes')
        .update({
          reply: replyText,
          replied_at: new Date().toISOString()
        })
        .eq('id', noteId)

      if (error) throw error

      // Create notification for the note author
      await supabase.from('notifications').insert({
        user_id: note.from_user_id,
        type: 'card_note',
        actor_id: profile.id,
        message: `${profile.display_name} replied to your note`,
        reference_id: card.id,
        reference_name: 'reply'
      })

      // Refresh notes
      await fetchNotes(card.id)
    } catch (err) {
      console.error('Error replying to note:', err)
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
      setNotes([]) // New card has no notes
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

  const handleSectionSave = async (category, newCategoryEntries) => {
    try {
      // Don't set loading=true here - it causes the page to flash blank
      // The save happens quickly and we update state directly after

      // Keep entries from other categories (strip id field), replace this category's entries
      const otherEntries = entries
        .filter(e => e.category !== category)
        .map(({ id, card_id, ...rest }) => rest)
      const allEntries = [...otherEntries, ...newCategoryEntries]

      // Use the same save logic as handleSave
      const today = new Date().toDateString()
      const cardCreatedToday = card && new Date(card.created_at).toDateString() === today

      if (cardCreatedToday) {
        await supabase
          .from('entries')
          .delete()
          .eq('card_id', card.id)

        if (allEntries.length > 0) {
          const entriesWithCardId = allEntries.map((entry, index) => ({
            ...entry,
            card_id: card.id,
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
      } else {
        if (card) {
          await archiveCurrentCard()
        }
        await createNewCard(allEntries)
      }

      setEditingSection(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSave = async (newEntries) => {
    try {
      setLoading(true)

      // Check if current card was created today
      const today = new Date().toDateString()
      const cardCreatedToday = card && new Date(card.created_at).toDateString() === today

      if (cardCreatedToday) {
        // Update today's card instead of creating a new one
        // Delete old entries
        await supabase
          .from('entries')
          .delete()
          .eq('card_id', card.id)

        // Insert new entries
        if (newEntries.length > 0) {
          const entriesWithCardId = newEntries.map((entry, index) => ({
            ...entry,
            card_id: card.id,
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
      } else {
        // Different day - archive current card and create new one
        if (card) {
          await archiveCurrentCard()
        }
        await createNewCard(newEntries)
      }

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
        <>
          <CardDisplay
            card={card}
            entries={entries}
            displayName={profile.display_name}
            photoUrl={profile.profile_photo_url}
            isEditable={true}
            onEdit={() => setIsEditing(true)}
            onSectionEdit={(category) => setEditingSection(category)}
            notes={notes}
            currentUserId={profile.id}
            onMarkNotesRead={handleMarkNotesRead}
            onReplyToNote={handleReplyToNote}
          />
          {editingSection && (
            <SectionEditModal
              category={editingSection}
              entries={entries}
              onSave={handleSectionSave}
              onClose={() => setEditingSection(null)}
            />
          )}
        </>
      )}
    </div>
  )
}
