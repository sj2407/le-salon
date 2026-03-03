import { useState, useRef } from 'react'
import { PortraitModal } from './PortraitModal'
import { supabase } from '../../lib/supabase'

/**
 * Goodreads Import modal — upload CSV export, imports read books.
 */
export const GoodreadsImportModal = ({ isOpen, onClose, onImported }) => {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const reset = () => {
    setImporting(false)
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const csvContent = await file.text()

      const { data: session } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goodreads-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ csv_content: csvContent }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setResult(data)
      if (onImported) onImported()
    } catch (err) {
      console.error('Goodreads import error:', err)
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <PortraitModal isOpen={isOpen} onClose={handleClose} title="Import from Goodreads" maxWidth="440px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Instructions */}
        <div style={{ fontSize: '14px', color: '#666', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 12px 0' }}>
            Export your library from Goodreads, then upload the CSV file here.
          </p>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Go to <strong>My Books</strong> on Goodreads</li>
            <li>Click <strong>Import and Export</strong> (left sidebar)</li>
            <li>Click <strong>Export Library</strong></li>
            <li>Upload the CSV file below</li>
          </ol>
        </div>

        {/* File upload */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            style={{
              width: '100%',
              padding: '16px 20px',
              background: importing ? '#F5F1EB' : '#FFFEFA',
              border: '2px dashed rgba(0,0,0,0.15)',
              borderRadius: '10px',
              cursor: importing ? 'default' : 'pointer',
              color: importing ? '#999' : '#666',
              fontSize: '14px',
              transition: 'background 0.15s',
            }}
          >
            {importing ? 'Importing... this may take a minute' : 'Choose CSV file'}
          </button>
        </div>

        {/* Import progress */}
        {importing && (
          <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', textAlign: 'center' }}>
            Enriching books with cover images and metadata...
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{
            padding: '14px 16px',
            background: '#F0F7F0',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#2C2C2C',
          }}>
            Imported <strong>{result.imported_count}</strong> books
            {result.skipped_count > 0 && (
              <span style={{ color: '#999' }}> ({result.skipped_count} already in your library)</span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '14px 16px',
            background: '#FDF0F0',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#C75D5D',
          }}>
            {error}
          </div>
        )}

        {/* Done */}
        {result && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClose}
              style={{
                padding: '8px 20px',
                background: '#2C2C2C',
                color: '#FFFEFA',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </PortraitModal>
  )
}
