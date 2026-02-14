import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useSpeechRecognition } from '../lib/useSpeechRecognition'
import { CATEGORY_CONFIG } from '../lib/cardConstants'

const CATEGORY_LABELS = {
  'Reading': 'Reading',
  'Listening': 'Listening',
  'Watching': 'Watching',
  'Looking Forward To': 'Looking Forward To',
  'Performing Arts and Exhibits': 'Performing Arts',
  'Obsessing Over': 'Obsessing Over',
  'My latest AI prompt': 'AI Prompt'
}

export const DictationModal = ({ isOpen, onClose, onAcceptEntries }) => {
  const [phase, setPhase] = useState('recording') // recording | parsing | preview | error
  const [parsedEntries, setParsedEntries] = useState([])
  const [lang, setLang] = useState('en-US')
  const [errorMessage, setErrorMessage] = useState('')
  const [savedTranscript, setSavedTranscript] = useState('')
  const backdropRef = useRef(null)

  const { isListening, transcript, interimTranscript, error: speechError, start, stop, reset } =
    useSpeechRecognition({ lang })

  // Auto-start recording when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('recording')
      setParsedEntries([])
      setErrorMessage('')
      setSavedTranscript('')
      // Small delay so the modal animation starts first
      const timer = setTimeout(() => start(), 300)
      return () => clearTimeout(timer)
    } else {
      reset()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key to close (only in recording/preview/error phases)
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => {
      if (e.key === 'Escape' && phase !== 'parsing') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleClose = () => {
    stop()
    onClose()
  }

  const handleDone = async () => {
    stop()
    const fullTranscript = transcript || ''
    if (!fullTranscript.trim()) {
      handleClose()
      return
    }

    setSavedTranscript(fullTranscript)
    setPhase('parsing')

    try {
      const { data, error } = await supabase.functions.invoke('parse-card-dictation', {
        body: { transcript: fullTranscript }
      })
      if (error) throw error
      if (!data?.entries || data.entries.length === 0) {
        setErrorMessage("Couldn't identify any entries. Try being more specific, e.g. \"I'm reading The Stranger\" or \"je regarde The Bear\".")
        setPhase('error')
        return
      }
      setParsedEntries(data.entries)
      setPhase('preview')
    } catch (err) {
      console.error('Dictation parse error:', err)
      setErrorMessage('Could not parse your dictation. Please check your connection and try again.')
      setPhase('error')
    }
  }

  const handleRetry = async () => {
    if (!savedTranscript.trim()) return
    setPhase('parsing')
    try {
      const { data, error } = await supabase.functions.invoke('parse-card-dictation', {
        body: { transcript: savedTranscript }
      })
      if (error) throw error
      if (!data?.entries || data.entries.length === 0) {
        setErrorMessage("Couldn't identify any entries. Try being more specific.")
        setPhase('error')
        return
      }
      setParsedEntries(data.entries)
      setPhase('preview')
    } catch (err) {
      console.error('Dictation retry error:', err)
      setErrorMessage('Could not parse your dictation. Please try again.')
      setPhase('error')
    }
  }

  const handleAccept = () => {
    onAcceptEntries(parsedEntries)
    handleClose()
  }

  const handleRemoveEntry = (index) => {
    setParsedEntries(prev => prev.filter((_, i) => i !== index))
  }

  const handleEditContent = (index, newContent) => {
    setParsedEntries(prev => prev.map((e, i) => i === index ? { ...e, content: newContent } : e))
  }

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current && phase !== 'parsing') {
      handleClose()
    }
  }

  const toggleLang = () => {
    const newLang = lang === 'en-US' ? 'fr-FR' : 'en-US'
    setLang(newLang)
    // Restart recognition with new language if currently listening
    if (isListening) {
      stop()
      setTimeout(() => start(), 100)
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <Motion.div
          ref={backdropRef}
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <Motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              background: '#FFFEFA',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '28px 24px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="handwritten" style={{ fontSize: '26px', margin: 0, color: '#2C2C2C' }}>
                {phase === 'recording' ? 'Dictate' : phase === 'parsing' ? 'Parsing...' : phase === 'preview' ? 'Preview' : 'Oops'}
              </h3>
              {phase !== 'parsing' && (
                <button
                  onClick={handleClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '22px',
                    color: '#999',
                    padding: '4px 8px',
                    lineHeight: 1
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
              )}
            </div>

            {/* RECORDING PHASE */}
            {phase === 'recording' && (
              <>
                {/* Language toggle */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button
                    onClick={toggleLang}
                    style={{
                      background: 'none',
                      border: '1px solid #ccc',
                      borderRadius: '12px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      color: '#666',
                      cursor: 'pointer',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {lang === 'en-US' ? 'EN' : 'FR'}
                  </button>
                </div>

                {/* Mic indicator */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: isListening ? '#E85D75' : '#ccc',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: isListening ? 'micPulse 1.5s ease-in-out infinite' : 'none'
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </div>
                  <p style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>
                    {isListening ? 'Listening...' : speechError || 'Tap to start'}
                  </p>
                </div>

                {/* Live transcript */}
                <div style={{
                  minHeight: '80px',
                  padding: '16px',
                  background: '#F5F0EB',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontSize: '15px',
                  lineHeight: 1.6,
                  color: '#2C2C2C'
                }}>
                  {transcript || interimTranscript ? (
                    <>
                      {transcript && <span>{transcript} </span>}
                      {interimTranscript && <span style={{ color: '#999' }}>{interimTranscript}</span>}
                    </>
                  ) : (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>
                      Start speaking... e.g. &ldquo;I&apos;m reading The Stranger by Camus&rdquo;
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  {!isListening ? (
                    <button
                      onClick={start}
                      className="primary"
                      style={{ flex: 1 }}
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={handleDone}
                      className="primary"
                      style={{ flex: 1 }}
                    >
                      Done
                    </button>
                  )}
                  <button onClick={handleClose} style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* PARSING PHASE */}
            {phase === 'parsing' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="loading">Parsing your dictation...</div>
              </div>
            )}

            {/* PREVIEW PHASE */}
            {phase === 'preview' && (
              <>
                <p style={{ fontSize: '13px', color: '#999', marginBottom: '16px', marginTop: 0 }}>
                  Review and edit before adding to your card:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {parsedEntries.map((entry, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 12px',
                        background: '#F5F0EB',
                        borderRadius: '4px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: '#4A7BA7',
                          fontWeight: 600,
                          marginBottom: '4px'
                        }}>
                          {CATEGORY_LABELS[entry.category] || entry.category}
                          {entry.subcategory && (
                            <span style={{ color: '#999', fontWeight: 400 }}> / {entry.subcategory}</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={entry.content}
                          onChange={(e) => handleEditContent(index, e.target.value)}
                          style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '15px',
                            fontFamily: "'Source Serif 4', Georgia, serif",
                            color: '#2C2C2C',
                            padding: 0,
                            outline: 'none'
                          }}
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveEntry(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          color: '#C75D5D',
                          padding: '0 4px',
                          lineHeight: 1,
                          flexShrink: 0
                        }}
                        title="Remove"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                {parsedEntries.length === 0 ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleClose} style={{ flex: 1 }}>
                      Close
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleAccept} className="primary" style={{ flex: 1 }}>
                      Add to card
                    </button>
                    <button onClick={handleClose} style={{ flex: 1 }}>
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ERROR PHASE */}
            {phase === 'error' && (
              <>
                <p style={{ fontSize: '14px', color: '#C75D5D', marginBottom: '12px', marginTop: 0 }}>
                  {errorMessage}
                </p>
                {savedTranscript && (
                  <div style={{
                    padding: '12px',
                    background: '#F5F0EB',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    &ldquo;{savedTranscript}&rdquo;
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleRetry} className="primary" style={{ flex: 1 }}>
                    Try again
                  </button>
                  <button onClick={handleClose} style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
