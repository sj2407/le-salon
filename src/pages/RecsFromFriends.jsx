import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { TAG_ICONS } from './Reviews'

export const RecsFromFriends = () => {
  const { profile } = useAuth()
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedReviews, setExpandedReviews] = useState(new Set())

  useEffect(() => {
    if (profile) {
      fetchRecommendations()
    }
  }, [profile])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      const { data: recsData, error: recsError } = await supabase
        .from('review_recommendations')
        .select('review_id')
        .eq('recommended_to_user_id', profile.id)

      if (recsError) throw recsError

      if (!recsData || recsData.length === 0) {
        setRecommendations([])
        setLoading(false)
        return
      }

      const reviewIds = recsData.map(r => r.review_id)

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!reviews_user_id_fkey(display_name, username)
        `)
        .in('id', reviewIds)
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError

      setRecommendations(reviewsData || [])
    } catch (err) {
      console.error('Error fetching recommendations:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (reviewId) => {
    const newExpanded = new Set(expandedReviews)
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId)
    } else {
      newExpanded.add(reviewId)
    }
    setExpandedReviews(newExpanded)
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading recommendations...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '720px' }}>
      {recommendations.length === 0 ? (
        <div style={{
          background: '#FFFEFA',
          border: 'none',
          borderRadius: '2px',
          padding: '48px 32px',
          textAlign: 'center',
          boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
            No recommendations yet. When friends recommend reviews to you, they'll appear here!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {recommendations.map((review, index) => (
            <div
              key={review.id}
              className="review-card"
              data-index={index}
              style={{
                background: '#FFFEFA',
                border: 'none',
                borderRadius: '2px',
                padding: '12px 16px',
                position: 'relative',
                boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                Recommended by {review.profiles?.display_name || 'a friend'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>{TAG_ICONS[review.tag] || '📌'}</span>
                <h3 style={{ fontSize: '14px', fontStyle: 'italic', fontWeight: 400, margin: 0, flex: 1 }}>{review.title}</h3>
                <span className="handwritten" style={{ fontSize: '14px', lineHeight: 1, color: '#2C2C2C' }}>
                  {review.rating}/10
                </span>
              </div>

              {review.review_text && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    margin: 0,
                    whiteSpace: expandedReviews.has(review.id) ? 'pre-wrap' : 'nowrap',
                    overflow: expandedReviews.has(review.id) ? 'visible' : 'hidden',
                    textOverflow: expandedReviews.has(review.id) ? 'clip' : 'ellipsis'
                  }}>
                    {review.review_text}
                  </p>
                  <button
                    onClick={() => toggleExpanded(review.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2C2C2C',
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: '4px 0',
                      marginTop: '4px',
                      textDecoration: 'underline'
                    }}
                  >
                    {expandedReviews.has(review.id) ? 'Show less' : 'Read more'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
