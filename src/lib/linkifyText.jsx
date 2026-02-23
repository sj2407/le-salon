// Detect URLs in text and render as clickable links.
// Patterns supported:
//   "Some title https://example.com" → title becomes a link
//   "Title | https://example.com" → title becomes a link
//   "https://example.com" → URL displayed as link (domain only)
//   "Plain text with no URL" → returned as-is

const linkStyle = {
  color: '#4A7BA7',
  textDecoration: 'underline'
}

export const linkifyText = (text) => {
  if (!text) return text

  // Check if text ends with a URL (most common pattern: "Article title https://...")
  const urlAtEndRegex = /^(.+?)\s*(https?:\/\/[^\s]+)$/
  const matchEnd = text.match(urlAtEndRegex)

  if (matchEnd) {
    const [, title, url] = matchEnd
    return (
      <a
        href={url.trim()}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
      >
        {title.trim()}
      </a>
    )
  }

  // Check if text contains "Title | URL" format
  if (text.includes(' | http')) {
    const [title, url] = text.split(' | ')
    return (
      <a
        href={url.trim()}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
      >
        {title.trim()}
      </a>
    )
  }

  // Check if text is just a bare URL
  const bareUrlRegex = /^(https?:\/\/[^\s]+)$/
  const bareMatch = text.trim().match(bareUrlRegex)
  if (bareMatch) {
    const url = bareMatch[1]
    // Show just the domain as display text
    let domain
    try {
      domain = new URL(url).hostname.replace(/^www\./, '')
    } catch {
      domain = url
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
      >
        {domain}
      </a>
    )
  }

  // No URL detected, return plain text
  return text
}
