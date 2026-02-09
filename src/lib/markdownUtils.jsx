/**
 * Lightweight markdown renderer for parlor text body.
 * Handles **bold**, *italic*, paragraphs, and line breaks.
 * Returns React elements — no library dependency, no dangerouslySetInnerHTML.
 */

function processInlineFormatting(text, keyPrefix) {
  const parts = []
  let remaining = text
  let keyIndex = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)

    let match = null
    let type = null

    if (boldMatch && italicMatch) {
      if (boldMatch.index <= italicMatch.index) {
        match = boldMatch
        type = 'bold'
      } else {
        match = italicMatch
        type = 'italic'
      }
    } else if (boldMatch) {
      match = boldMatch
      type = 'bold'
    } else if (italicMatch) {
      match = italicMatch
      type = 'italic'
    }

    if (!match) {
      parts.push(remaining)
      break
    }

    if (match.index > 0) {
      parts.push(remaining.substring(0, match.index))
    }

    const key = `${keyPrefix}-${keyIndex++}`
    if (type === 'bold') {
      parts.push(<strong key={key}>{match[1]}</strong>)
    } else {
      parts.push(<em key={key}>{match[1]}</em>)
    }

    remaining = remaining.substring(match.index + match[0].length)
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
