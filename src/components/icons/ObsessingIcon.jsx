export const ObsessingIcon = ({ className = "section-icon" }) => (
  <svg className={className} viewBox="0 0 52 52">
    {/* Brain/head thinking */}
    <ellipse cx="24" cy="26" rx="16" ry="14" fill="#F9E5A3" stroke="#2C2C2C" strokeWidth="1.5"/>
    {/* Brain squiggles */}
    <path d="M14 22 Q18 18, 22 22 Q26 26, 24 30" fill="none" stroke="#E8C86E" strokeWidth="2" strokeLinecap="round"/>
    <path d="M26 20 Q30 16, 34 20 Q36 24, 32 28" fill="none" stroke="#E8C86E" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 28 Q22 32, 28 30" fill="none" stroke="#E8C86E" strokeWidth="1.5" strokeLinecap="round"/>

    {/* Big cartoon eyes */}
    <ellipse cx="18" cy="42" rx="5" ry="4" fill="#FFF" stroke="#2C2C2C" strokeWidth="1.2"/>
    <ellipse cx="32" cy="42" rx="5" ry="4" fill="#FFF" stroke="#2C2C2C" strokeWidth="1.2"/>
    {/* Pupils looking up (thinking) */}
    <circle cx="18" cy="40" r="2.5" fill="#5B4A3F"/>
    <circle cx="32" cy="40" r="2.5" fill="#5B4A3F"/>
    {/* Eye shine */}
    <circle cx="17" cy="39" r="1" fill="#FFF"/>
    <circle cx="31" cy="39" r="1" fill="#FFF"/>

    {/* Thought bubbles */}
    <circle cx="42" cy="12" r="3" fill="#FFF" stroke="#2C2C2C" strokeWidth="1"/>
    <circle cx="46" cy="8" r="4" fill="#FFF" stroke="#2C2C2C" strokeWidth="1"/>
    <circle cx="50" cy="14" r="2" fill="#FFF" stroke="#2C2C2C" strokeWidth="1"/>

    {/* Spiral above head (obsessing!) */}
    <path d="M36 10 Q40 6, 38 2 Q34 -2, 30 2 Q26 6, 30 10" fill="none" stroke="#E85D75" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Exclamation */}
    <circle cx="44" cy="22" r="1.5" fill="#E85D75"/>
    <line x1="44" y1="18" x2="44" y2="14" stroke="#E85D75" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
