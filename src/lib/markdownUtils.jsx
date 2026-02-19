/**
 * Lightweight markdown renderer for parlor text body.
 * Handles **bold**, *italic*, paragraphs, and line breaks.
 * Returns React elements — no library dependency, no dangerouslySetInnerHTML.
 *
 * Two-pass approach: bold first, then italic on remaining text.
 * Avoids ES2018 lookbehind assertions for older browser compatibility.
 */

function processItalic(text, keyPrefix) {
  const parts = []
  const regex = /\*([^*]+?)\*/g
  let lastIndex = 0
  let match
  let keyIndex = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    parts.push(<em key={`${keyPrefix}-i-${keyIndex++}`}>{match[1]}</em>)
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  } else if (parts.length === 0) {
    parts.push(text)
  }

  return parts
}

function processInlineFormatting(text, keyPrefix) {
  const parts = []
  const boldRegex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let boldMatch
  let keyIndex = 0

  while ((boldMatch = boldRegex.exec(text)) !== null) {
    if (boldMatch.index > lastIndex) {
      // Process italic in the text between bold matches
      parts.push(...processItalic(text.substring(lastIndex, boldMatch.index), `${keyPrefix}-${keyIndex++}`))
    }
    parts.push(<strong key={`${keyPrefix}-b-${keyIndex++}`}>{boldMatch[1]}</strong>)
    lastIndex = boldRegex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(...processItalic(text.substring(lastIndex), `${keyPrefix}-${keyIndex++}`))
  } else if (parts.length === 0) {
    parts.push(text)
  }

  return parts
}

export function renderSimpleMarkdown(text) {
  if (!text) return null

  const paragraphs = text.split(/\n\n+/)

  return paragraphs.map((paragraph, pIndex) => {
    const lines = paragraph.split('\n')
    const content = lines.flatMap((line, lIndex) => {
      const elements = processInlineFormatting(line, `${pIndex}-${lIndex}`)
      if (lIndex < lines.length - 1) {
        return [...elements, <br key={`br-${pIndex}-${lIndex}`} />]
      }
      return elements
    })

    return <p key={pIndex} style={{ marginBottom: '1.2em', marginTop: 0 }}>{content}</p>
  })
}
