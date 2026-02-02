export const WatchingIcon = ({ className = "section-icon" }) => (
  <svg className={className} viewBox="0 0 52 52">
    {/* Retro TV body */}
    <rect x="6" y="16" width="36" height="28" rx="4" fill="#E8DCC8" stroke="#2C2C2C" strokeWidth="1.5"/>
    {/* Screen with blue glow */}
    <rect x="10" y="20" width="24" height="18" rx="2" fill="#1a3a52" stroke="#2C2C2C" strokeWidth="1"/>
    {/* Screen glow/reflection */}
    <rect x="11" y="21" width="22" height="16" rx="1.5" fill="#2E5A7E"/>
    <path d="M12 22 L14 22 L12 26 Z" fill="#4A7BA7" opacity="0.5"/>

    {/* Rabbit ear antennas */}
    <line x1="18" y1="16" x2="12" y2="4" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
    <line x1="30" y1="16" x2="36" y2="4" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="4" r="2.5" fill="#C75D5D" stroke="#2C2C2C" strokeWidth="1"/>
    <circle cx="36" cy="4" r="2.5" fill="#C75D5D" stroke="#2C2C2C" strokeWidth="1"/>

    {/* Control knobs */}
    <circle cx="38" cy="26" r="3" fill="#C9B896" stroke="#2C2C2C" strokeWidth="1"/>
    <circle cx="38" cy="26" r="1.5" fill="#A89876"/>
    <circle cx="38" cy="34" r="2.5" fill="#C9B896" stroke="#2C2C2C" strokeWidth="1"/>

    {/* TV legs */}
    <line x1="14" y1="44" x2="12" y2="50" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="34" y1="44" x2="36" y2="50" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/>

    {/* Popcorn bucket */}
    <path d="M42 36 L44 48 L52 48 L50 36 Z" fill="#C75D5D" stroke="#2C2C2C" strokeWidth="1"/>
    <path d="M42 36 L52 36" stroke="#FFF" strokeWidth="1.5"/>
    <path d="M43 40 L51 40" stroke="#FFF" strokeWidth="1"/>
    {/* Popcorn pieces */}
    <circle cx="45" cy="34" r="2" fill="#F9E5A3" stroke="#2C2C2C" strokeWidth="0.5"/>
    <circle cx="48" cy="33" r="2.2" fill="#F9E5A3" stroke="#2C2C2C" strokeWidth="0.5"/>
    <circle cx="47" cy="35" r="1.8" fill="#FFF5D6" stroke="#2C2C2C" strokeWidth="0.5"/>
  </svg>
)
