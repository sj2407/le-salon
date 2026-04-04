import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { ToastContainer } from '../components/ToastContainer'

const ToastContext = createContext(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

const MAX_TOASTS = 3

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success', options = {}) => {
    const { duration = 3000, actionLabel, onAction } = options
    const id = ++idRef.current
    setToasts(prev => {
      const next = [...prev, { id, message, type, duration, actionLabel, onAction }]
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next
    })
    setTimeout(() => removeToast(id), duration)
    return id
  }, [removeToast])

  const toast = useMemo(() => ({
    success: (msg, opts) => addToast(msg, 'success', opts),
    error: (msg, opts) => addToast(msg, 'error', opts),
    info: (msg, opts) => addToast(msg, 'info', opts),
  }), [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}
