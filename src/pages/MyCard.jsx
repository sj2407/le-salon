import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { CardDisplay } from '../components/CardDisplay'
import { CardEdit } from '../components/CardEdit'
import { SectionEditModal } from '../components/SectionEditModal'
import { DictationModal } from '../components/DictationModal'
import { isSpeechSupported } from '../lib/useSpeechRecognition'

export const MyCard = () => {
  const { profile } = useAuth()
  const toast = useToast()
  const [card, setCard] = useState(null)
  const [entries, setEntries] = useState([])
  const [notes, setNotes] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [showDictation, setShowDictation] = useState(false)
  const [pendingDictation, setPendingDictation] = useState(null)
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

        // Fetch entries and notes in parallel (both depend on card ID)
        const [entriesResult, notesResult] = await Promise.all([
          supabase.from('entries').select('*').eq('card_id', cardData.id).order('display_order'),
          supabase.from('card_notes').select('*, from_user:profiles!card_notes_from_user_id_fkey(display_name)')
            .eq('card_id', cardData.id).eq('to_user_id', profile.id).order('created_at', { ascending: false })
        ])

        if (entriesResult.error) throw entriesResult.error
        setEntries(entriesResult.data || [])

        if (notesResult.error) {
          setNotes([])
        } else {
          setNotes(notesResult.data || [])
        }
      } else {
        // No current card exists, create one
        await createNewCard([])
      }
    } catch (err) {
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
        setNotes([])
        return
      }

      setNotes(data || [])
    } catch (_err) {
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
    } catch (_err) {
      // silently handled
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
    } catch (_err) {
      // silently handled
    }
  }

  const createNewCard = async (newEntries) => {
    try {
      // Create new card — carry forward hidden_sections preference
      const { data: newCard, error: cardError } = await supabase
        .from('cards')
        .insert({
          user_id: profile.id,
          is_current: true,
          hidden_sections: card?.hidden_sections || [],
          section_order: card?.section_order || []
        })
        .select()
        .single()

      if (cardError) throw cardError

      // Insert entries (strip DB-managed fields so defaults apply)
      if (newEntries.length > 0) {
        const entriesWithCardId = newEntries.map((entry, index) => {
          const { id: _id, card_id: _cid, created_at: _ca, ...fields } = entry
          return { ...fields, card_id: newCard.id, display_order: index }
        })

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
      setError(err.message)
      throw err
    }
  }

  const archiveCurrentCard = async () => {
    if (!card) return

    const { error } = await supabase
      .from('cards')
      .update({ is_current: false })
      .eq('id', card.id)

    if (error) throw error
  }

  const handleSectionSave = async (category, newCategoryEntries) => {
    try {
      // Don't set loading=true here - it causes the page to flash blank
      // The save happens quickly and we update state directly after

      // Keep entries from other categories (strip DB-managed fields), replace this category's entries
      const otherEntries = entries
        .filter(e => e.category !== category)
        .map(({ id, card_id, created_at, ...rest }) => rest)
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
          const entriesWithCardId = allEntries.map((entry, index) => {
            const { id: _id, card_id: _cid, created_at: _ca, ...fields } = entry
            return { ...fields, card_id: card.id, display_order: index }
          })

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
      toast.success('Card updated')
    } catch (err) {
      setError(err.message)
      toast.error('Failed to save changes')
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

        // Insert new entries (strip DB-managed fields so defaults apply)
        if (newEntries.length > 0) {
          const entriesWithCardId = newEntries.map((entry, index) => {
            const { id: _id, card_id: _cid, created_at: _ca, ...fields } = entry
            return { ...fields, card_id: card.id, display_order: index }
          })

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
      toast.success('Card saved')
    } catch (err) {
      setError(err.message)
      toast.error('Failed to save card')
    } finally {
      setLoading(false)
    }
  }

  const handleDictationAccepted = (newEntries) => {
    setPendingDictation(newEntries)
    setIsEditing(true)
  }

  const handleToggleHidden = async (categoryName) => {
    if (!card) return
    const current = card.hidden_sections || []
    const next = current.includes(categoryName)
      ? current.filter(s => s !== categoryName)
      : [...current, categoryName]

    // Optimistic update
    setCard(prev => ({ ...prev, hidden_sections: next }))

    const { error } = await supabase
      .from('cards')
      .update({ hidden_sections: next })
      .eq('id', card.id)

    if (error) {
      // Revert on failure
      setCard(prev => ({ ...prev, hidden_sections: current }))
    }
  }

  const handleSectionOrderChange = async (newOrder) => {
    if (!card) return
    const previous = card.section_order || []
    setCard(prev => ({ ...prev, section_order: newOrder }))
    const { error } = await supabase
      .from('cards')
      .update({ section_order: newOrder })
      .eq('id', card.id)
    if (error) setCard(prev => ({ ...prev, section_order: previous }))
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    setPendingDictation(null)
  }

  const handleEditSave = async (newEntries) => {
    setPendingDictation(null)
    await handleSave(newEntries)
  }

  // Merge pending dictation entries with existing DB entries for the edit form
  const editEntries = pendingDictation
    ? [...entries, ...pendingDictation]
    : entries

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
          entries={editEntries}
          displayName={profile.display_name}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
        />
      ) : (
        <>
          <CardDisplay
            card={card}
            entries={entries}
            displayName={profile.display_name}
            photoUrl={profile.profile_photo_url}
            photoPosition={profile.profile_photo_position}
            bio={profile.bio}
            isEditable={true}
            onEdit={() => setIsEditing(true)}
            onDictate={() => setShowDictation(true)}
            showDictateButton={isSpeechSupported}
            onSectionEdit={(category) => setEditingSection(category)}
            hiddenSections={card?.hidden_sections || []}
            onToggleHidden={handleToggleHidden}
            sectionOrder={card?.section_order || []}
            onSectionOrderChange={handleSectionOrderChange}
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
          <DictationModal
            isOpen={showDictation}
            onClose={() => setShowDictation(false)}
            onAcceptEntries={handleDictationAccepted}
          />
        </>
      )}
    </div>
  )
}
