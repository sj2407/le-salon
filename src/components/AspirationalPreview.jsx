import { useState, useEffect, useRef } from 'react'
import { useShowcaseData } from '../hooks/useShowcaseData'
import { SHOWCASE_FADE_DURATION, SHOWCASE_TRANSITION_DURATION, TAB_LABELS } from '../lib/showcaseConfig'
import { ReviewsDisplay } from './ReviewsDisplay'
import { WishlistDisplay } from './WishlistDisplay'
import { CoverflowCarousel } from './CoverflowCarousel'

/**
 * Aspirational onboarding preview — shows Sarah's exact view
 * with a small inline message next to the page header.
 *
 * Props:
 *   tab: 'reviews' | 'wishlist' | 'liste' | 'portrait' | 'card'
 *   isEmpty: boolean — when false, renders children directly (pass-through)
 *   children: the normal empty state content to reveal after preview
 */
export const AspirationalPreview = ({ tab, isEmpty, children }) => {
  const { data, loading } = useShowcaseData(isEmpty ? tab : null)
  const [phase, setPhase] = useState('check') // 'check' | 'preview' | 'fading' | 'done'
  const timerRef = useRef(null)

  // Determine phase
  useEffect(() => {
    if (!isEmpty) {
      setPhase('done')
      return
    }
    if (!loading && data) {
      setPhase('preview')
    }
  }, [isEmpty, loading, data])

  // Auto-fade timer
  useEffect(() => {
    if (phase !== 'preview') return
    timerRef.current = setTimeout(() => {
      setPhase('fading')
    }, SHOWCASE_FADE_DURATION)
    return () => clearTimeout(timerRef.current)
  }, [phase])

  // Transition from fading → done
  useEffect(() => {
    if (phase !== 'fading') return
    const timer = setTimeout(() => {
      setPhase('done')
    }, SHOWCASE_TRANSITION_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  const handleSkip = () => {
    clearTimeout(timerRef.current)
    setPhase('done')
  }

  // Pass-through when not empty or done
  if (!isEmpty || phase === 'done') {
    return (
      <div style={phase === 'done' && isEmpty ? { animation: 'showcaseReveal 0.8s ease-out' } : undefined}>
        {children}
      </div>
    )
  }

  // Loading/check phase — placeholder (suppress ghost flash)
  if (loading || !data || phase === 'check') {
    return <div style={{ minHeight: '300px' }} />
  }

  // Preview or fading — render Sarah's exact page view with inline message
  const isFading = phase === 'fading'

  return (
    <div style={{
      opacity: isFading ? 0 : 1,
      transition: isFading ? `opacity ${SHOWCASE_TRANSITION_DURATION}ms ease-out` : undefined,
      pointerEvents: 'none',
    }}>
      <ShowcaseContent tab={tab} data={data} onSkip={handleSkip} />
    </div>
  )
}

/**
 * Small inline message chip — sits next to the page header.
 */
const InlineMessage = ({ tab, onSkip }) => (
  <span style={{
    fontFamily: "'Caveat', cursive",
    fontSize: '15px',
    color: '#777',
    fontWeight: 600,
    lineHeight: 1.2,
    marginLeft: '8px',
    whiteSpace: 'nowrap',
    pointerEvents: 'auto',
  }}>
    — here's what it can look like
    <button
      onClick={(e) => { e.stopPropagation(); onSkip() }}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: "'Caveat', cursive",
        fontSize: '15px',
        color: '#999',
        fontWeight: 600,
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
        padding: '0 0 0 6px',
        pointerEvents: 'auto',
      }}
    >
      Skip
    </button>
  </span>
)

/**
 * Renders the full page structure for each tab — matching Sarah's exact view.
 * The message is integrated inline with each page's header.
 */
const ShowcaseContent = ({ tab, data, onSkip }) => {
  if (!data) return null

  switch (tab) {
    case 'reviews':
      return (
        <ReviewsDisplay
          reviews={Array.isArray(data) ? data : []}
          title={<>Reviews<InlineMessage tab={tab} onSkip={onSkip} /></>}
        />
      )

    case 'wishlist':
      return (
        <WishlistDisplay
          items={Array.isArray(data) ? data : []}
          title={<>Wishlist<InlineMessage tab={tab} onSkip={onSkip} /></>}
        />
      )

    case 'liste':
      return <ListeShowcase data={data} onSkip={onSkip} />

    case 'portrait':
      return <PortraitShowcase data={data} onSkip={onSkip} />

    case 'card':
      return <CardShowcase data={data} onSkip={onSkip} />

    default:
      return null
  }
}

/**
 * La Liste showcase — replicates LaListe.jsx page structure exactly:
 * h1 "La Liste" + subtitle + CoverflowCarousel
 */
const ListeShowcase = ({ data, onSkip }) => {
  const items = Array.isArray(data) ? data : []
  return (
    <div style={{ maxWidth: '720px', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 160px)' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '0', marginTop: '8px', marginLeft: '10px', transform: 'translateY(16px)', color: '#2C2C2C' }}>
        La Liste
        <InlineMessage tab="liste" onSkip={onSkip} />
      </h1>
      <p style={{
        fontFamily: "'Source Serif 4', Georgia, serif",
        fontStyle: 'italic',
        fontSize: '13px',
        color: '#999',
        marginTop: '20px',
        marginBottom: '12px',
        marginLeft: '10px',
      }}>
        Everything I want to read, watch, listen to, and experience
      </p>

      {items.length > 0 && (
        <CoverflowCarousel
          items={items.map(i => ({
            id: i.id,
            imageUrl: i.image_url,
            title: i.title,
            tag: i.tag,
            isPrivate: false,
          }))}
        />
      )}
    </div>
  )
}

/**
 * Portrait showcase — replicates Portrait.jsx page structure exactly:
 * h1 "Portrait" + PortraitDisplay
 */
const PortraitShowcase = ({ data, onSkip }) => {
  const [PortraitDisplay, setPortraitDisplay] = useState(null)

  useEffect(() => {
    import('./portrait/PortraitDisplay').then(mod => {
      setPortraitDisplay(() => mod.PortraitDisplay)
    })
  }, [])

  if (!PortraitDisplay || !data) return null

  return (
    <div style={{ maxWidth: '720px', padding: '0 20px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '0', marginTop: '8px', marginLeft: '10px', position: 'relative', zIndex: 1, transform: 'translateY(16px)' }}>
        Portrait
      </h1>
      <div style={{ marginLeft: '10px', marginTop: '8px' }}>
        <InlineMessage tab="portrait" onSkip={onSkip} />
      </div>

      <div style={{ marginTop: '20px' }}>
        <PortraitDisplay
          spotifyProfile={data.spotify_profile || null}
          books={data.books || []}
          readingThemes={data.reading_themes || null}
          readingGraph={data.reading_graph || null}
          creations={data.creations || []}
          experiences={data.experiences || []}
          isOwner={false}
        />
      </div>
    </div>
  )
}

/**
 * Card showcase — replicates MyCard.jsx structure:
 * CardDisplay (which renders the name, bio, sections internally)
 */
const CardShowcase = ({ data, onSkip }) => {
  const [CardDisplay, setCardDisplay] = useState(null)

  useEffect(() => {
    import('./CardDisplay').then(mod => {
      setCardDisplay(() => mod.CardDisplay)
    })
  }, [])

  if (!CardDisplay || !data) return null

  return (
    <>
      <div style={{
        textAlign: 'center',
        padding: '4px 0 0',
        pointerEvents: 'auto',
      }}>
        <InlineMessage tab="card" onSkip={onSkip} />
      </div>
      <CardDisplay
        card={data.card || {}}
        entries={data.entries || []}
        displayName={data.displayName || ''}
        photoUrl={data.photoUrl || null}
        photoPosition={data.photoPosition || '50% 50%'}
        bio={data.bio || ''}
        isEditable={false}
        hiddenSections={data.card?.hidden_sections || []}
        sectionOrder={data.card?.section_order || []}
      />
    </>
  )
}
