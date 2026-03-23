import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { ReviewsDisplay } from '../components/ReviewsDisplay'
import { TAG_ICONS, TAG_OPTIONS, TAG_LABELS } from '../lib/reviewConstants'
import { TagAutocomplete } from '../components/TagAutocomplete'
import { ExpandedReviewText } from '../components/review-comments/ExpandedReviewText'
import { DictationModal } from '../components/DictationModal'
import { isSpeechSupported } from '../lib/useSpeechRecognition'
import { CoverSearchModal } from '../components/cover-search/CoverSearchModal'
import { CoverThumbnail } from '../components/cover-search/CoverThumbnail'
import { scrollLock } from '../lib/scrollLock'
import { TAG_TO_MEDIA_TYPE } from '../lib/coverSearchApis'
import { Microphone, Plus } from '@phosphor-icons/react'
import { ReviewNotesSection } from '../components/review-notes/ReviewNotesSection'
import { AspirationalPreview } from '../components/AspirationalPreview'

// Module-level caches — survive unmount, instant render on return
let _reviewsCache = null
let _friendsCache = null
let _commentsCache = null
let _notesCache = null

export const Reviews = () => {
  const { profile } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [reviews, setReviews] = useState(_reviewsCache || [])
  const [friends, setFriends] = useState(_friendsCache || [])
  const [loading, setLoading] = useState(!_reviewsCache)
  const [showModal, setShowModal] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [showDictation, setShowDictation] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState('other')
  const [rating, setRating] = useState(7.0)
  const [reviewText, setReviewText] = useState('')
  const [recommendToFriends, setRecommendToFriends] = useState([])
  const [friendQuery, setFriendQuery] = useState('')
  const [error, setError] = useState('')
  const [reviewComments, setReviewComments] = useState(_commentsCache || [])
  const [reviewNotes, setReviewNotes] = useState(_notesCache || [])
  const [imageUrl, setImageUrl] = useState('')
  const [showCoverSearch, setShowCoverSearch] = useState(false)
  const [modalNotes, setModalNotes] = useState([])
  const [modalNoteContent, setModalNoteContent] = useState('')
  const [modalNoteIsQuote, setModalNoteIsQuote] = useState(false)
  const [modalNotePageRef, setModalNotePageRef] = useState('')
  const [showModalNoteForm, setShowModalNoteForm] = useState(false)

  // Track initial form values to detect dirty state
  const initialFormRef = useRef(null)

  useEffect(() => {
    if (profile) {
      fetchReviews()
      fetchFriends()
      fetchReviewComments()
      fetchReviewNotes()
    }
  }, [profile])

  // Sync book covers from the books table (Portrait's enriched covers)
  const coversRefreshed = useRef(false)
  useEffect(() => {
    if (coversRefreshed.current || reviews.length === 0) return
    coversRefreshed.current = true

    const bookReviews = reviews.filter(r => r.tag === 'book')
    if (bookReviews.length === 0) return

    ;(async () => {
      // Fetch covers from the books table (populated by book-enrich edge function)
      const { data: books } = await supabase
        .from('books')
        .select('review_id, cover_url')
        .in('review_id', bookReviews.map(r => r.id))
        .not('cover_url', 'is', null)

      if (!books || books.length === 0) return

      const coverMap = Object.fromEntries(books.map(b => [b.review_id, b.cover_url]))
      let updated = 0

      for (const review of bookReviews) {
        const betterUrl = coverMap[review.id]
        // Never overwrite a manually-set cover; never overwrite with null
        if (betterUrl && betterUrl !== review.image_url && !review.cover_manual) {
          await supabase
            .from('reviews')
            .update({ image_url: betterUrl })
            .eq('id', review.id)
          updated++
        }
      }

      if (updated > 0) {
        // Silent refresh — update state without spinner flash
        const { data } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
        if (data) {
          _reviewsCache = data
          setReviews(data)
        }
      }
    })()
  }, [reviews])

  // Scroll to a specific review if ?review=<id> is in the URL
  useEffect(() => {
    const reviewId = searchParams.get('review')
    if (reviewId && reviews.length > 0) {
      const el = document.getElementById(`review-${reviewId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.boxShadow = '0 0 0 2px #4A7BA7, 2px 3px 8px rgba(0,0,0,0.1)'
        setTimeout(() => { el.style.boxShadow = '2px 3px 8px rgba(0,0,0,0.1)' }, 2000)
        searchParams.delete('review')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [reviews, searchParams])

  // Pre-fill add modal from URL params (e.g., from La Liste "Write a review?" link)
  useEffect(() => {
    const prefillTitle = searchParams.get('prefill_title')
    const prefillTag = searchParams.get('prefill_tag')
    const prefillImage = searchParams.get('prefill_image')
    const prefillUrl = searchParams.get('prefill_url')
    if (prefillTitle) {
      const fullTitle = prefillUrl ? `${prefillTitle} ${prefillUrl}` : prefillTitle
      setEditingReview(null)
      setTitle(fullTitle)
      setTag(prefillTag || 'other')
      setRating(7.0)
      setReviewText('')
      setRecommendToFriends([])
      setFriendQuery('')
      setError('')
      setImageUrl(prefillImage || '')
      initialFormRef.current = { title: fullTitle, tag: prefillTag || 'other', rating: 7.0, reviewText: '', recommendToFriends: [] }
      setShowModal(true)
      // Clear prefill params from URL
      searchParams.delete('prefill_title')
      searchParams.delete('prefill_tag')
      searchParams.delete('prefill_image')
      searchParams.delete('prefill_url')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams])

  const isFormDirty = () => {
    if (!initialFormRef.current) return false
    const init = initialFormRef.current
    return title !== init.title || tag !== init.tag ||
      parseFloat(rating) !== parseFloat(init.rating) ||
      reviewText !== init.reviewText ||
      JSON.stringify(recommendToFriends) !== JSON.stringify(init.recommendToFriends)
  }

  // Lock body scroll while modal is active (prevents iOS keyboard viewport shift)
  useEffect(() => {
    if (showModal) scrollLock.enable()
    else scrollLock.disable()
    return () => scrollLock.disable()
  }, [showModal])

  // Escape key handler for modal - only close if form is clean
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal && !isFormDirty()) setShowModal(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showModal, title, tag, rating, reviewText, recommendToFriends])

  const fetchReviews = async () => {
    try {
      if (!_reviewsCache) setLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      _reviewsCache = data || []
      setReviews(_reviewsCache)
    } catch (_err) {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  const fetchFriends = async () => {
    try {
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)

      if (friendshipsError) throw friendshipsError

      const friendIds = friendshipsData.map(f =>
        f.requester_id === profile.id ? f.recipient_id : f.requester_id
      )

      if (friendIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', friendIds)

        if (profilesError) throw profilesError
        _friendsCache = profilesData || []
        setFriends(_friendsCache)
      }
    } catch (_err) {
      // silently handled
    }
  }

  const fetchReviewComments = async () => {
    try {
      const { data, error } = await supabase
        .from('review_comments')
        .select('*, from_user:profiles!review_comments_from_user_id_fkey(display_name)')
        .eq('to_user_id', profile.id)
        .order('created_at', { ascending: true })

      if (error) {
        setReviewComments([])
        return
      }
      // Flatten the join for easier use
      _commentsCache = (data || []).map(c => ({
        ...c,
        commenter_name: c.from_user?.display_name || 'Friend'
      }))
      setReviewComments(_commentsCache)
    } catch (_err) {
      setReviewComments([])
    }
  }

  const fetchReviewNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('review_notes')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      _notesCache = data || []
      setReviewNotes(_notesCache)
    } catch (_err) {
      setReviewNotes([])
    }
  }

  const handleAddNote = async (reviewId, { content, is_quote, page_ref }) => {
    try {
      const { error } = await supabase.from('review_notes').insert({
        review_id: reviewId,
        user_id: profile.id,
        content,
        is_quote: is_quote || false,
        page_ref: page_ref || null
      })
      if (error) throw error
      await fetchReviewNotes()
      toast.success('Note saved')
    } catch (_err) {
      toast.error('Failed to save note')
    }
  }

  const handleEditNote = async (noteId, { content, is_quote, page_ref }) => {
    try {
      const { error } = await supabase.from('review_notes')
        .update({
          content,
          is_quote: is_quote || false,
          page_ref: page_ref || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
      if (error) throw error
      await fetchReviewNotes()
      toast.success('Note updated')
    } catch (_err) {
      toast.error('Failed to update note')
    }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      const { error } = await supabase.from('review_notes')
        .delete()
        .eq('id', noteId)
      if (error) throw error
      await fetchReviewNotes()
      toast.success('Note deleted')
    } catch (_err) {
      toast.error('Failed to delete note')
    }
  }

  const handleReplyToComment = async (commentId, replyText) => {
    try {
      const comment = reviewComments.find(c => c.id === commentId)
      if (!comment) return

      const { error } = await supabase
        .from('review_comments')
        .update({ reply: replyText, replied_at: new Date().toISOString() })
        .eq('id', commentId)

      if (error) throw error

      // Notify the commenter
      const review = reviews.find(r => r.id === comment.review_id)
      await supabase.from('notifications').insert({
        user_id: comment.from_user_id,
        type: 'review_comment',
        actor_id: profile.id,
        message: `${profile.display_name} replied to your comment on ${review?.title || 'a review'}`,
        reference_id: comment.review_id,
        reference_name: 'reply'
      })

      await fetchReviewComments()
    } catch (_err) {
      // silently handled
    }
  }

  const openAddModal = () => {
    setEditingReview(null)
    setTitle('')
    setTag('other')
    setRating(7.0)
    setReviewText('')
    setRecommendToFriends([])
    setFriendQuery('')
    setError('')
    setImageUrl('')
    setModalNotes([])
    setModalNoteContent('')
    setModalNoteIsQuote(false)
    setModalNotePageRef('')
    setShowModalNoteForm(false)
    initialFormRef.current = { title: '', tag: 'other', rating: 7.0, reviewText: '', recommendToFriends: [] }
    setShowModal(true)
  }

  // State for reader-edit cover search
  const [readerEditCoverUrl, setReaderEditCoverUrl] = useState(undefined)
  const [readerCoverSearchQuery, setReaderCoverSearchQuery] = useState('')
  const [readerCoverSearchTag, setReaderCoverSearchTag] = useState('other')
  const [showReaderCoverSearch, setShowReaderCoverSearch] = useState(false)

  const openEditInReader = async (review, enterEditMode) => {
    // Fetch existing recommendations
    let recs = []
    try {
      const { data, error } = await supabase
        .from('review_recommendations')
        .select('recommended_to_user_id')
        .eq('review_id', review.id)

      if (!error && data) recs = data.map(r => r.recommended_to_user_id)
    } catch (_err) {
      // silent
    }

    setReaderEditCoverUrl(undefined)
    enterEditMode(review, recs)
  }

  const handleReaderSaveEdit = async (reviewId, formData) => {
    const parsedRating = parseFloat(formData.rating)
    if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 10) {
      toast.error('Rating must be between 0 and 10')
      throw new Error('Invalid rating')
    }

    const review = reviews.find(r => r.id === reviewId)
    if (!review) return

    try {
      const updateFields = {
        title: formData.title,
        tag: formData.tag,
        rating: parsedRating,
        review_text: formData.reviewText.trim() || null,
        image_url: formData.imageUrl || null,
        updated_at: new Date().toISOString()
      }
      if (formData.imageUrl && formData.imageUrl !== (review.image_url || '')) {
        updateFields.cover_manual = true
      }

      const { error } = await supabase
        .from('reviews')
        .update(updateFields)
        .eq('id', reviewId)

      if (error) throw error

      // Handle recommendations
      if (formData.recommendToFriends.length > 0) {
        const { data: existingRecs } = await supabase
          .from('review_recommendations')
          .select('recommended_to_user_id')
          .eq('review_id', reviewId)

        const existingFriendIds = existingRecs?.map(r => r.recommended_to_user_id) || []
        const newFriendIds = formData.recommendToFriends.filter(id => !existingFriendIds.includes(id))

        await supabase
          .from('review_recommendations')
          .delete()
          .eq('review_id', reviewId)

        const recommendations = formData.recommendToFriends.map(friendId => ({
          review_id: reviewId,
          recommended_to_user_id: friendId
        }))

        await supabase
          .from('review_recommendations')
          .insert(recommendations)

        for (const friendId of newFriendIds) {
          await supabase
            .from('notifications')
            .insert({
              user_id: friendId,
              type: 'recommendation',
              actor_id: profile.id,
              reference_id: reviewId,
              reference_name: formData.title,
              message: `${profile.display_name} recommended ${formData.title}`
            })
        }
      } else {
        await supabase
          .from('review_recommendations')
          .delete()
          .eq('review_id', reviewId)
      }

      fetchReviews()
      toast.success('Review updated')
    } catch (err) {
      toast.error('Failed to save review')
      throw err
    }
  }

  const handleOpenCoverSearchFromReader = (title, tag) => {
    setReaderCoverSearchQuery(title)
    setReaderCoverSearchTag(tag)
    setShowReaderCoverSearch(true)
  }

  const openEditModal = async (review) => {
    setEditingReview(review)
    setTitle(review.title)
    setTag(review.tag)
    setRating(review.rating)
    setReviewText(review.review_text || '')
    setImageUrl(review.image_url || '')
    setFriendQuery('')
    setError('')
    setModalNotes([])
    setModalNoteContent('')
    setModalNoteIsQuote(false)
    setModalNotePageRef('')
    setShowModalNoteForm(false)

    try {
      const { data, error } = await supabase
        .from('review_recommendations')
        .select('recommended_to_user_id')
        .eq('review_id', review.id)

      if (error) throw error
      setRecommendToFriends(data?.map(r => r.recommended_to_user_id) || [])
    } catch (_err) {
      setRecommendToFriends([])
    }

    // initialFormRef is set after recommendations load (below)
    setShowModal(true)
  }

  // Set initial form ref after recommendations finish loading for edit modal
  useEffect(() => {
    if (showModal && editingReview) {
      initialFormRef.current = {
        title, tag, rating: parseFloat(rating), reviewText,
        recommendToFriends: [...recommendToFriends]
      }
    }
  }, [showModal, editingReview?.id])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    const parsedRating = parseFloat(rating)
    if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 10) {
      setError('Rating must be between 0 and 10')
      return
    }

    try {
      let reviewId = editingReview?.id

      if (editingReview) {
        const updateFields = {
            title,
            tag,
            rating: parsedRating,
            review_text: reviewText.trim() || null,
            image_url: imageUrl || null,
            updated_at: new Date().toISOString()
          }
        // If user changed the cover, mark it as manual
        if (imageUrl && imageUrl !== (editingReview.image_url || '')) {
          updateFields.cover_manual = true
        }
        const { error } = await supabase
          .from('reviews')
          .update(updateFields)
          .eq('id', editingReview.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('reviews')
          .insert({
            user_id: profile.id,
            title,
            tag,
            rating: parsedRating,
            review_text: reviewText.trim() || null,
            image_url: imageUrl || null,
            cover_manual: !!imageUrl
          })
          .select()
          .single()

        if (error) throw error
        reviewId = data.id

        // Auto-create experience for performing_arts/exhibition reviews
        if (['performing_arts', 'exhibition'].includes(tag)) {
          const categoryMap = { performing_arts: 'theatre', exhibition: 'exhibition' }
          const { data: existing } = await supabase.from('experiences')
            .select('id').eq('user_id', profile.id).ilike('name', title).maybeSingle()
          if (!existing) {
            await supabase.from('experiences').insert({
              user_id: profile.id,
              name: title,
              category: categoryMap[tag],
              source: 'review',
            })
          }
        }
      }

      if (reviewId && recommendToFriends.length > 0) {
        const { data: existingRecs } = await supabase
          .from('review_recommendations')
          .select('recommended_to_user_id')
          .eq('review_id', reviewId)

        const existingFriendIds = existingRecs?.map(r => r.recommended_to_user_id) || []
        const newFriendIds = recommendToFriends.filter(id => !existingFriendIds.includes(id))

        await supabase
          .from('review_recommendations')
          .delete()
          .eq('review_id', reviewId)

        const recommendations = recommendToFriends.map(friendId => ({
          review_id: reviewId,
          recommended_to_user_id: friendId
        }))

        const { error: recsError } = await supabase
          .from('review_recommendations')
          .insert(recommendations)

        if (recsError) throw recsError

        for (const friendId of newFriendIds) {
          await supabase
            .from('notifications')
            .insert({
              user_id: friendId,
              type: 'recommendation',
              actor_id: profile.id,
              reference_id: reviewId,
              reference_name: title,
              message: `${profile.display_name} recommended ${title}`
            })
        }
      } else if (reviewId) {
        await supabase
          .from('review_recommendations')
          .delete()
          .eq('review_id', reviewId)
      }

      // Insert any notes/quotes added in the modal
      if (reviewId && modalNotes.length > 0) {
        const noteRows = modalNotes.map(n => ({
          review_id: reviewId,
          user_id: profile.id,
          content: n.content,
          is_quote: n.is_quote,
          page_ref: n.page_ref || null
        }))
        await supabase.from('review_notes').insert(noteRows)
        await fetchReviewNotes()
      }

      setShowModal(false)
      fetchReviews()
      toast.success(editingReview ? 'Review updated' : 'Review saved')

      // If this is a new book review, trigger cover + genre enrichment (fire-and-forget)
      // The DB trigger already created the books entry — this fetches the cover image
      if (!editingReview && tag === 'book') {
        triggerBookEnrichment(title)
      }
    } catch (err) {
      setError(err.message)
      toast.error('Failed to save review')
    }
  }

  const triggerBookEnrichment = async (reviewTitle) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Parse author from title if format is "Title by Author" or "Title, Author"
      const byMatch = reviewTitle.match(/^(.+?)\s+by\s+(.+)$/i)
      const commaMatch = reviewTitle.match(/^(.+?),\s+(.+)$/)
      const bookTitle = byMatch?.[1] || commaMatch?.[1] || reviewTitle
      const author = byMatch?.[2] || commaMatch?.[2] || undefined

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/book-enrich`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ title: bookTitle, author }),
        }
      )
      if (!res.ok) return
      const data = await res.json()
      if (!data.cover_url && !data.google_books_id) return

      // Update the books table entry (created by DB trigger on review insert)
      const updateFields = {}
      if (data.cover_url) updateFields.cover_url = data.cover_url
      if (data.google_books_id) updateFields.google_books_id = data.google_books_id
      if (data.genres) updateFields.google_books_genres = data.genres
      if (data.description) updateFields.google_books_description = data.description

      if (Object.keys(updateFields).length > 0) {
        await supabase
          .from('books')
          .update(updateFields)
          .eq('user_id', profile.id)
          .ilike('title', `%${bookTitle}%`)
      }
    } catch (_err) {
      // Silent — enrichment is non-critical
    }
  }

  const handleDelete = async (reviewId) => {
    if (!confirm('Delete this review?')) return

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)

      if (error) throw error
      fetchReviews()
      toast.success('Review deleted')
    } catch (_err) {
      toast.error('Failed to delete review')
    }
  }

  const handleDictationSave = async (transcript) => {
    const { data, error } = await supabase.functions.invoke('parse-dictation', {
      body: { transcript, context: 'review' }
    })
    if (error) {
      // Surface actual error from function body if available
      const detail = data?.error || error.message
      throw new Error(detail)
    }
    if (!data?.entries || data.entries.length === 0) {
      throw new Error("Couldn't identify any reviews. Try being more specific, e.g. \"I watched The Bear, 8 out of 10\".")
    }

    const rows = data.entries.map(entry => ({
      user_id: profile.id,
      title: entry.title,
      tag: TAG_OPTIONS.includes(entry.tag) ? entry.tag : 'other',
      rating: entry.rating,
      review_text: entry.review_text || null
    }))

    const { error: insertError } = await supabase.from('reviews').insert(rows)
    if (insertError) throw insertError
    await fetchReviews()
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading reviews...</div>
      </div>
    )
  }

  return (
    <AspirationalPreview tab="reviews" isEmpty={reviews.length === 0}>
      <ReviewsDisplay
        reviews={reviews}
        title="My Reviews"
        emptyMessage="No reviews yet. Share your thoughts on movies, books, and more!"
        reviewHasContent={(review) => !!review.review_text || reviewNotes.some(n => n.review_id === review.id)}
        getReaderLabel={(review) => {
          if (review.review_text) return 'read'
          if (reviewNotes.some(n => n.review_id === review.id)) return 'notes'
          return 'read'
        }}
        renderExpandedText={(review, opts) => {
          const commentsForReview = reviewComments.filter(c => c.review_id === review.id)
          if (commentsForReview.length === 0 && !opts?.inReader) return null
          return (
            <ExpandedReviewText
              review={review}
              comments={commentsForReview}
              isOwner={true}
              inReader={opts?.inReader}
              currentUserId={profile.id}
              ownerName={profile.display_name}
              onReplyToComment={handleReplyToComment}
            />
          )
        }}
        renderNotesSection={(review) => (
          <ReviewNotesSection
            notes={reviewNotes.filter(n => n.review_id === review.id)}
            reviewId={review.id}
            isOwner={true}
            hasReviewText={!!review.review_text}
            onAdd={handleAddNote}
            onEdit={handleEditNote}
            onDelete={handleDeleteNote}
          />
        )}
        renderHeaderActions={() => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={openAddModal}
              title="Add review"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Plus size={18} weight="duotone" color="#622722" />
            </button>
            {isSpeechSupported && (
              <button
                onClick={() => setShowDictation(true)}
                title="Dictate reviews by voice"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Microphone size={14} weight="duotone" color="#622722" />
              </button>
            )}
          </div>
        )}
        onEdit={(review, enterEditMode) => openEditInReader(review, enterEditMode)}
        onSaveEdit={handleReaderSaveEdit}
        onOpenCoverSearch={handleOpenCoverSearchFromReader}
        editCoverUrl={readerEditCoverUrl}
        friends={friends}
        onDelete={(reviewId) => handleDelete(reviewId)}
      />

      <DictationModal
        isOpen={showDictation}
        onClose={() => setShowDictation(false)}
        mode="review"
        onSaveDirectly={handleDictationSave}
      />

      <CoverSearchModal
        isOpen={showCoverSearch}
        onClose={() => setShowCoverSearch(false)}
        onSelect={({ imageUrl: url }) => setImageUrl(url)}
        initialQuery={title}
        mediaType={TAG_TO_MEDIA_TYPE[tag]}
      />

      <CoverSearchModal
        isOpen={showReaderCoverSearch}
        onClose={() => setShowReaderCoverSearch(false)}
        onSelect={({ imageUrl: url }) => { setReaderEditCoverUrl(url); setShowReaderCoverSearch(false) }}
        initialQuery={readerCoverSearchQuery}
        mediaType={TAG_TO_MEDIA_TYPE[readerCoverSearchTag]}
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              background: '#FFFEFA',
              border: 'none',
              borderRadius: '8px',
              padding: '20px 24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="handwritten" style={{ fontSize: '24px', marginBottom: '16px' }}>
              {editingReview ? 'Edit Review' : 'Add Review & Notes'}
            </h2>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="e.g., Avatar: The Way of Water"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tag *</label>
                <TagAutocomplete value={tag} onChange={setTag} />
              </div>

              {tag !== 'other' && (
                <div className="form-group">
                  <label className="form-label">Cover Image (optional)</label>
                  {imageUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CoverThumbnail imageUrl={imageUrl} tag={tag} size="medium" />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {TAG_TO_MEDIA_TYPE[tag] && (
                          <button
                            type="button"
                            onClick={() => setShowCoverSearch(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#4A7BA7', padding: '4px 0' }}
                          >
                            Change
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#999', padding: '4px 0' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : TAG_TO_MEDIA_TYPE[tag] ? (
                    <button
                      type="button"
                      onClick={() => setShowCoverSearch(true)}
                      style={{
                        background: 'none',
                        border: '1px dashed #ccc',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#999',
                        fontStyle: 'italic',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      Search cover...
                    </button>
                  ) : (
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '13px',
                        fontStyle: 'italic',
                        boxSizing: 'border-box',
                        background: '#FFFEFA'
                      }}
                    />
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Rating (0-10) *</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Review (optional)</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  maxLength={5000}
                  placeholder="Share your thoughts..."
                  style={{ minHeight: '120px' }}
                />
              </div>

              {/* Notes & Quotes section */}
              <div className="form-group">
                <label className="form-label">Notes & Quotes (optional)</label>

                {/* Existing note drafts */}
                {modalNotes.map((note, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '8px',
                      padding: '8px 10px',
                      background: '#F5F0EB',
                      borderRadius: '4px',
                      borderLeft: note.is_quote ? '3px solid #622722' : 'none'
                    }}
                  >
                    <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.5, fontFamily: note.is_quote ? "'Source Serif 4', Georgia, serif" : 'inherit', fontStyle: note.is_quote ? 'italic' : 'normal' }}>
                      {note.is_quote && <span style={{ color: '#622722', marginRight: '4px' }}>"</span>}
                      {note.content}
                      {note.is_quote && <span style={{ color: '#622722', marginLeft: '4px' }}>"</span>}
                      {note.page_ref && <span style={{ color: '#999', fontSize: '11px', marginLeft: '6px' }}>— {note.page_ref}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalNotes(modalNotes.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1, color: '#999', flexShrink: 0 }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Add note form */}
                {showModalNoteForm ? (
                  <div>
                    <textarea
                      value={modalNoteContent}
                      onChange={(e) => setModalNoteContent(e.target.value)}
                      placeholder={modalNoteIsQuote ? 'Enter the passage...' : 'Write a note...'}
                      maxLength={2000}
                      autoFocus
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px 10px',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        fontFamily: modalNoteIsQuote ? "'Source Serif 4', Georgia, serif" : 'inherit',
                        fontStyle: modalNoteIsQuote ? 'italic' : 'normal',
                        border: '1px solid #D9CBAD',
                        borderRadius: '4px',
                        background: '#FFFEFA',
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#555', cursor: 'pointer' }}>
                        <input type="checkbox" checked={modalNoteIsQuote} onChange={(e) => setModalNoteIsQuote(e.target.checked)} style={{ accentColor: '#622722' }} />
                        Quote
                      </label>
                      <input
                        type="text"
                        value={modalNotePageRef}
                        onChange={(e) => setModalNotePageRef(e.target.value)}
                        placeholder="p. 42..."
                        maxLength={50}
                        style={{ width: '80px', padding: '3px 6px', fontSize: '11px', border: '1px solid #D9CBAD', borderRadius: '3px', background: '#FFFEFA', outline: 'none' }}
                      />
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => { setShowModalNoteForm(false); setModalNoteContent(''); setModalNoteIsQuote(false); setModalNotePageRef('') }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#777', padding: '3px 6px' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!modalNoteContent.trim()}
                          onClick={() => {
                            setModalNotes([...modalNotes, { content: modalNoteContent.trim(), is_quote: modalNoteIsQuote, page_ref: modalNotePageRef.trim() }])
                            setModalNoteContent('')
                            setModalNoteIsQuote(false)
                            setModalNotePageRef('')
                            setShowModalNoteForm(false)
                          }}
                          style={{
                            background: modalNoteContent.trim() ? '#622722' : '#CCC',
                            color: '#FFF',
                            border: 'none',
                            cursor: modalNoteContent.trim() ? 'pointer' : 'default',
                            fontSize: '12px',
                            padding: '3px 10px',
                            borderRadius: '3px'
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowModalNoteForm(true)}
                    style={{
                      background: 'none',
                      border: '1px dashed #D9CBAD',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#999',
                      fontStyle: 'italic',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    + Add a note or quote...
                  </button>
                )}
              </div>

              {friends.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Who would love this? (optional)</label>

                  {/* Selected friend chips */}
                  {recommendToFriends.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {recommendToFriends.map(friendId => {
                        const friend = friends.find(f => f.id === friendId)
                        if (!friend) return null
                        return (
                          <span
                            key={friendId}
                            style={{
                              background: '#F5F0EB',
                              borderRadius: '12px',
                              padding: '4px 10px',
                              fontSize: '13px',
                              fontFamily: 'Source Serif 4, Georgia, serif',
                              fontStyle: 'italic',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {friend.display_name}
                            <button
                              type="button"
                              onClick={() => setRecommendToFriends(recommendToFriends.filter(id => id !== friendId))}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '14px',
                                lineHeight: 1,
                                color: '#999'
                              }}
                            >
                              ×
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Autocomplete input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={friendQuery}
                      onChange={(e) => setFriendQuery(e.target.value)}
                      placeholder="Type a friend's name..."
                      autoComplete="off"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        background: '#FFFEFA',
                        fontFamily: 'Source Serif 4, Georgia, serif',
                        fontSize: '16px',
                        fontStyle: 'italic',
                        boxSizing: 'border-box'
                      }}
                    />

                    {/* Dropdown suggestions */}
                    {friendQuery.trim() && (() => {
                      const filtered = friends.filter(f =>
                        !recommendToFriends.includes(f.id) &&
                        f.display_name.toLowerCase().includes(friendQuery.toLowerCase())
                      )
                      if (filtered.length === 0) return null
                      return (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#FFFEFA',
                          border: '1px solid #ccc',
                          borderTop: 'none',
                          borderRadius: '0 0 3px 3px',
                          maxHeight: '150px',
                          overflowY: 'auto',
                          zIndex: 10
                        }}>
                          {filtered.map(friend => (
                            <div
                              key={friend.id}
                              onClick={() => {
                                setRecommendToFriends([...recommendToFriends, friend.id])
                                setFriendQuery('')
                              }}
                              style={{
                                padding: '8px 10px',
                                cursor: 'pointer',
                                fontFamily: 'Source Serif 4, Georgia, serif',
                                fontSize: '15px',
                                fontStyle: 'italic',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F0EB'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              {friend.display_name}
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {error && <div className="error-message">{error}</div>}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="primary" style={{ flex: 1 }}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AspirationalPreview>
  )
}
