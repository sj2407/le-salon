import { useState } from 'react'

export const NoteInput = ({
  value = '',
  onChange,
  onSubmit,
  onCancel,
  maxLength = 280,
  submitLabel = 'Leave a note',
  isEditing = false,
  placeholder = 'Write a note for this section...'
}) => {
  const [localValue, setLocalValue] = useState(value)
  const charCount = localValue.length

  const handleChange = (e) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      setLocalValue(newValue)
      onChange?.(newValue)
    }
  }

  const handleSubmit = () => {
    if (localValue.trim()) {
      onSubmit(localValue.trim())
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', flex: 1 }}>
      <textarea
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          flex: 1,
          minHeight: '50px',
          padding: '10px',
          border: '1px solid #DDD',
          borderRadius: '3px',
          fontSize: '14px',
          fontFamily: 'Caveat, cursive',
          resize: 'vertical',
          background: '#FFFEFA',
          lineHeight: 1.4
        }}
        autoFocus
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '12px',
          color: charCount > maxLength * 0.9 ? '#E8534F' : '#999'
        }}>
          {charCount}/{maxLength}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '4px 10px',
                background: '#F5F1EB',
                border: '1px solid #CCC',
                borderRadius: '3px',
                fontSize: '13px',
                cursor: 'pointer',
                color: '#555',
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!localValue.trim()}
            style={{
              padding: '4px 10px',
              background: localValue.trim() ? '#2C2C2C' : '#CCC',
              color: '#FFF',
              border: 'none',
              borderRadius: '3px',
              fontSize: '13px',
              cursor: localValue.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            {isEditing ? 'Update' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
