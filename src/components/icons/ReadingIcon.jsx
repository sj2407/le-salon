export const ReadingIcon = ({ className = "section-icon" }) => (
  <svg className={className} viewBox="0 0 52 52">
    {/* Stack of books */}
    {/* Bottom book - blue */}
    <rect x="6" y="32" width="32" height="8" rx="1" fill="#4A7BA7" stroke="#2C2C2C" strokeWidth="1.2"/>
    <rect x="8" y="33" width="2" height="6" fill="#3A6A96"/>

    {/* Middle book - red */}
    <rect x="8" y="23" width="30" height="9" rx="1" fill="#C75D5D" stroke="#2C2C2C" strokeWidth="1.2"/>
    <rect x="10" y="24.5" width="2" height="6" fill="#A84A4A"/>
    <line x1="16" y1="26" x2="32" y2="26" stroke="#2C2C2C" strokeWidth="0.8"/>
    <line x1="16" y1="29" x2="28" y2="29" stroke="#2C2C2C" strokeWidth="0.6"/>

    {/* Top book - open, yellow pages */}
    <path d="M10 22 L10 10 C10 8, 14 6, 24 6 C34 6, 38 8, 38 10 L38 22" fill="#F9E5A3" stroke="#2C2C2C" strokeWidth="1.2"/>
    <path d="M24 6 L24 22" stroke="#2C2C2C" strokeWidth="1"/>
    {/* Book cover edges */}
    <path d="M10 10 C10 8, 14 7, 24 7" stroke="#E8C86E" strokeWidth="1.5" fill="none"/>
    <path d="M38 10 C38 8, 34 7, 24 7" stroke="#E8C86E" strokeWidth="1.5" fill="none"/>
    {/* Text lines on pages */}
    <line x1="13" y1="11" x2="21" y2="11" stroke="#CFCFCF" strokeWidth="1"/>
    <line x1="13" y1="14" x2="20" y2="14" stroke="#CFCFCF" strokeWidth="1"/>
    <line x1="13" y1="17" x2="21" y2="17" stroke="#CFCFCF" strokeWidth="1"/>
    <line x1="27" y1="11" x2="35" y2="11" stroke="#CFCFCF" strokeWidth="1"/>
    <line x1="27" y1="14" x2="34" y2="14" stroke="#CFCFCF" strokeWidth="1"/>
    <line x1="27" y1="17" x2="35" y2="17" stroke="#CFCFCF" strokeWidth="1"/>

    {/* Reading glasses */}
    <ellipse cx="42" cy="38" rx="5" ry="4" fill="none" stroke="#8B7355" strokeWidth="1.5"/>
    <ellipse cx="50" cy="38" rx="4" ry="3.5" fill="none" stroke="#8B7355" strokeWidth="1.5"/>
    <path d="M47 38 L46 38" stroke="#8B7355" strokeWidth="1.5"/>
    <path d="M37 37 L34 35" stroke="#8B7355" strokeWidth="1.5"/>
    {/* Lens shine */}
    <path d="M40 36 L41 37" stroke="#B8A88A" strokeWidth="1"/>
  </svg>
)
