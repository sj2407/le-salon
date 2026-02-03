export const AIPromptIcon = ({ className = "section-icon" }) => (
  <svg className={className} viewBox="0 0 52 52">
    {/* Helmet/head - rounded dome */}
    <path d="M 16 30 L 16 24 Q 16 16, 26 12 Q 36 16, 36 24 L 36 30 L 34 32 L 18 32 Z"
      fill="#D4E4F0" stroke="#2C2C2C" strokeWidth="1.8" strokeLinejoin="round"/>

    {/* Visor/face - dark window */}
    <path d="M 18 24 Q 18 20, 26 18 Q 34 20, 34 24 L 34 28 L 18 28 Z"
      fill="#7A8A9A" stroke="#2C2C2C" strokeWidth="1.5"/>

    {/* Eyes - simple circles in visor */}
    <circle cx="22" cy="24" r="2.5" fill="#A8D5E8"/>
    <circle cx="30" cy="24" r="2.5" fill="#A8D5E8"/>

    {/* Side panels/ears */}
    <rect x="12" y="24" width="4" height="8" rx="1.5"
      fill="#B8D4E4" stroke="#2C2C2C" strokeWidth="1.5"/>
    <rect x="36" y="24" width="4" height="8" rx="1.5"
      fill="#B8D4E4" stroke="#2C2C2C" strokeWidth="1.5"/>

    {/* Neck/connector */}
    <rect x="23" y="32" width="6" height="4" rx="1"
      fill="#B8C8D8" stroke="#2C2C2C" strokeWidth="1.5"/>
  </svg>
)
