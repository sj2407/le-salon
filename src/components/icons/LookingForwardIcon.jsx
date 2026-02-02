export const LookingForwardIcon = ({ className = "section-icon" }) => (
  <svg className={className} viewBox="0 0 52 52">
    {/* Calendar */}
    <rect x="6" y="12" width="32" height="32" rx="3" fill="#FFF" stroke="#2C2C2C" strokeWidth="1.5"/>
    {/* Calendar header */}
    <rect x="6" y="12" width="32" height="10" rx="3" fill="#E85D75" stroke="#2C2C2C" strokeWidth="1.5"/>
    <path d="M6 19 L38 19 L38 22 Q38 22, 38 22 L6 22 Q6 22, 6 22 Z" fill="#E85D75"/>
    {/* Binding rings */}
    <rect x="14" y="8" width="4" height="8" rx="1" fill="#888" stroke="#2C2C2C" strokeWidth="1"/>
    <rect x="26" y="8" width="4" height="8" rx="1" fill="#888" stroke="#2C2C2C" strokeWidth="1"/>
    {/* Calendar grid lines */}
    <line x1="6" y1="28" x2="38" y2="28" stroke="#E8E8E8" strokeWidth="1"/>
    <line x1="6" y1="36" x2="38" y2="36" stroke="#E8E8E8" strokeWidth="1"/>
    <line x1="17" y1="22" x2="17" y2="44" stroke="#E8E8E8" strokeWidth="1"/>
    <line x1="28" y1="22" x2="28" y2="44" stroke="#E8E8E8" strokeWidth="1"/>
    {/* Star marking special day */}
    <path d="M32 32 L33.5 35 L37 35.5 L34.5 38 L35 41.5 L32 40 L29 41.5 L29.5 38 L27 35.5 L30.5 35 Z"
          fill="#F4D03F" stroke="#2C2C2C" strokeWidth="0.8"/>

    {/* Sun peeking from corner */}
    <circle cx="46" cy="10" r="7" fill="#F4D03F" stroke="#2C2C2C" strokeWidth="1"/>
    {/* Sun face */}
    <circle cx="44" cy="9" r="1" fill="#2C2C2C"/>
    <circle cx="48" cy="9" r="1" fill="#2C2C2C"/>
    <path d="M44 12 Q46 14, 48 12" fill="none" stroke="#2C2C2C" strokeWidth="1" strokeLinecap="round"/>
    {/* Sun rays */}
    <line x1="46" y1="1" x2="46" y2="3" stroke="#F4D03F" strokeWidth="2" strokeLinecap="round"/>
    <line x1="52" y1="6" x2="51" y2="7" stroke="#F4D03F" strokeWidth="2" strokeLinecap="round"/>
    <line x1="52" y1="14" x2="51" y2="13" stroke="#F4D03F" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
