import { useState, useRef, useCallback, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

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
  const langRef = useRef(lang)
  useEffect(() => { langRef.current = lang }, [lang])

  const isSupported = isSpeechSupported

  const start = useCallback(async () => {
    setError(null)
    setTranscript('')
    setInterimTranscript('')

    if (isNative) {
      // Use native Capacitor plugin
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')

        const { available } = await SpeechRecognition.available()
        if (!available) {
          setError('Speech recognition not available on this device')
          return
        }

        const permResult = await SpeechRecognition.requestPermissions()
        if (permResult.speechRecognition !== 'granted') {
          setError('Microphone permission denied')
          return
        }

        // Listen for partial results
        nativeListenerRef.current = await SpeechRecognition.addListener('partialResults', (data) => {
          if (data.matches && data.matches.length > 0) {
            setInterimTranscript(data.matches[0])
          }
        })

        await SpeechRecognition.start({
          language: langRef.current,
          partialResults: true,
          popup: false,
        })

        setIsListening(true)
      } catch (err) {
        setError(`Speech recognition error: ${err.message || err}`)
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
  }, [continuous])

  const stop = useCallback(async () => {
    if (isNative) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
        const result = await SpeechRecognition.stop()
        if (result.matches && result.matches.length > 0) {
          setTranscript(result.matches[0])
        }
        if (nativeListenerRef.current) {
          nativeListenerRef.current.remove()
          nativeListenerRef.current = null
        }
      } catch { /* ignore stop errors */ }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const reset = useCallback(() => {
    stop()
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [stop])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (nativeListenerRef.current) {
        nativeListenerRef.current.remove()
      }
    }
  }, [])

  return { isSupported, isListening, transcript, interimTranscript, error, start, stop, reset }
}
