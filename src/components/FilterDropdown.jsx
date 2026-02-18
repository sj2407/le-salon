import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export const FilterDropdown = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + window.scrollY + 2, left: rect.left + window.scrollX })
    }
    setOpen(!open)
  }

  const selected = options.find(o => o.value === value)

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontStyle: 'italic',
          padding: '4px 8px',
          border: 'none',
          borderRadius: '3px',
          background: '#FFFEFA',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {selected?.label || value}
        <span style={{ fontSize: '10px', marginLeft: '2px' }}>▾</span>
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            background: '#FFFEFA',
            borderRadius: '4px',
            boxShadow: '2px 3px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            minWidth: '140px',
            padding: '4px 0'
          }}
        >
          {options.map(option => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setOpen(false) }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: option.value === value ? '#F5F0EB' : 'transparent',
                border: 'none',
                padding: '6px 12px',
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontStyle: 'italic',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#2C2C2C',
                whiteSpace: 'nowrap'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
