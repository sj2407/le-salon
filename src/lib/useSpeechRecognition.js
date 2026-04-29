import { useState, useRef, useCallback, useEffect } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

const NativeSpeechRecognition = isNative ? registerPlugin('SpeechRecognition') : null

// Web Speech API (works in browsers, NOT in WKWebView)
const WebSpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export const isSpeechSupported = isNative || !!WebSpeechRecognition

export const useSpeechRecognition = ({ lang = 'en-US', continuous = true } = {}) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const nativeListenerRef = useRef(null)
  const errorListenerRef = useRef(null)
  const interimRef = useRef('')
  const genRef = useRef(0)
  const langRef = useRef(lang)
  useEffect(() => { langRef.current = lang }, [lang])

  const isSupported = isSpeechSupported

  const cleanupNativeListeners = useCallback(() => {
    if (nativeListenerRef.current) {
      nativeListenerRef.current.remove()
      nativeListenerRef.current = null
    }
    if (errorListenerRef.current) {
      errorListenerRef.current.remove()
      errorListenerRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setTranscript('')
    setInterimTranscript('')
    interimRef.current = ''

    const myGen = ++genRef.current

    if (isNative) {
      try {
        const { available } = await NativeSpeechRecognition.available()
        if (myGen !== genRef.current) return
        if (!available) {
          setError('Speech recognition not available on this device')
          return
        }

        const permResult = await NativeSpeechRecognition.requestPermissions()
        if (myGen !== genRef.current) return
        if (permResult.speechRecognition !== 'granted') {
          setError('Microphone permission denied')
          return
        }

        // Listen for partial results
        nativeListenerRef.current = await NativeSpeechRecognition.addListener('partialResults', (data) => {
          if (data.matches && data.matches.length > 0) {
            interimRef.current = data.matches[0]
            setInterimTranscript(data.matches[0])
          }
        })
        if (myGen !== genRef.current) {
          cleanupNativeListeners()
          return
        }

        // Listen for runtime errors emitted by the native plugin
        errorListenerRef.current = await NativeSpeechRecognition.addListener('error', (data) => {
          if (data?.message && data.message !== 'Recording stopped') {
            setError(data.message)
          }
          setIsListening(false)
        })
        if (myGen !== genRef.current) {
          cleanupNativeListeners()
          return
        }

        await NativeSpeechRecognition.start({
          language: langRef.current,
          partialResults: true,
          popup: false,
        })
        if (myGen !== genRef.current) {
          try { await NativeSpeechRecognition.stop() } catch { /* ignore */ }
          cleanupNativeListeners()
          return
        }

        setIsListening(true)
      } catch (err) {
        if (myGen === genRef.current) {
          setError(`Speech recognition error: ${err.message || err}`)
        }
        cleanupNativeListeners()
      }
    } else {
      // Web Speech API (original behavior)
      if (!WebSpeechRecognition) {
        setError('Speech recognition not supported in this browser')
        return
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }

      const recognition = new WebSpeechRecognition()
      recognition.continuous = continuous
      recognition.interimResults = true
      recognition.lang = langRef.current

      recognition.onresult = (event) => {
        let final = ''
        let interim = ''
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' '
          } else {
            interim += event.results[i][0].transcript
          }
        }
        if (final) setTranscript(final.trim())
        interimRef.current = interim
        setInterimTranscript(interim)
      }

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access in your browser settings.')
        } else if (event.error !== 'no-speech') {
          setError(`Speech recognition error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        setInterimTranscript('')
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsListening(true)
    }
  }, [continuous, cleanupNativeListeners])

  const stop = useCallback(async () => {
    genRef.current++
    let finalTranscript = ''

    if (isNative) {
      try {
        const result = await NativeSpeechRecognition.stop()
        const fromNative = result?.matches?.[0] ?? ''
        // Fall back to interim if native returned empty (Apple sometimes drops final)
        finalTranscript = fromNative || interimRef.current || ''
        if (finalTranscript) {
          setTranscript(finalTranscript)
        }
      } catch { /* ignore stop errors */ }
      cleanupNativeListeners()
    } else {
      finalTranscript = interimRef.current || ''
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }

    setIsListening(false)
    setInterimTranscript('')
    return finalTranscript
  }, [cleanupNativeListeners])

  const reset = useCallback(() => {
    stop()
    setTranscript('')
    setInterimTranscript('')
    interimRef.current = ''
    setError(null)
  }, [stop])

  useEffect(() => {
    return () => {
      genRef.current++
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      cleanupNativeListeners()
    }
  }, [cleanupNativeListeners])

  return { isSupported, isListening, transcript, interimTranscript, error, start, stop, reset }
}
