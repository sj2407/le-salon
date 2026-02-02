export const ListeningIcon = ({ className = "section-icon" }) => (
  <svg className={className} viewBox="0 0 52 52">
    {/* Headphones */}
    <path d="M10 30 L10 24 C10 14, 16 6, 26 6 C36 6, 42 14, 42 24 L42 30"
          fill="none" stroke="#2C2C2C" strokeWidth="2.5"/>
    {/* Left ear cup */}
    <rect x="4" y="28" width="10" height="14" rx="3" fill="#5B8C5A" stroke="#2C2C2C" strokeWidth="1.2"/>
    <rect x="6" y="30" width="6" height="10" rx="2" fill="#4A7A49"/>
    {/* Right ear cup */}
    <rect x="38" y="28" width="10" height="14" rx="3" fill="#5B8C5A" stroke="#2C2C2C" strokeWidth="1.2"/>
    <rect x="40" y="30" width="6" height="10" rx="2" fill="#4A7A49"/>
    {/* Cushion detail */}
    <ellipse cx="9" cy="35" rx="2" ry="4" fill="#7CAF7B"/>
    <ellipse cx="43" cy="35" rx="2" ry="4" fill="#7CAF7B"/>

    {/* Music notes floating */}
    <g fill="#E85D75" stroke="#2C2C2C" strokeWidth="0.8">
      <circle cx="22" cy="16" r="2.5"/>
      <path d="M24.5 16 L24.5 8 L30 6 L30 12" fill="none" stroke="#E85D75" strokeWidth="2"/>
      <circle cx="30" cy="12" r="2" fill="#E85D75"/>
    </g>
    <g fill="#F4A460">
      <circle cx="34" cy="20" r="1.8" stroke="#2C2C2C" strokeWidth="0.6"/>
      <path d="M35.8 20 L35.8 14" stroke="#F4A460" strokeWidth="1.5"/>
    </g>
  </svg>
)
