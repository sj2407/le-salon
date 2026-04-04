export const Privacy = () => {
  return (
    <div className="container" style={{ maxWidth: '700px', paddingBottom: '60px' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '8px', textAlign: 'center' }}>
        Privacy Policy
      </h1>
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#999', marginBottom: '32px' }}>
        Effective date: April 2, 2026
      </p>

      <div style={{ fontSize: '14px', lineHeight: 1.8, color: '#2C2C2C', fontFamily: "'Source Serif 4', Georgia, serif" }}>
        <Section title="1. Introduction">
          Le Salon ("we," "our," or "us") is a personal cultural journal and social app. This Privacy Policy explains how we collect, use, and protect your information when you use our iOS application and related services.
        </Section>

        <Section title="2. Information We Collect">
          <strong>Account information:</strong> When you create an account, we collect your email address, display name, and username. Your password is securely hashed and managed by our authentication provider.
          <br /><br />
          <strong>Content you create:</strong> Books and reading data, reviews and ratings, weekly cards (what you're reading, listening to, watching), activities and cultural experiences, creative works (text and images), wishlist items, and responses to philosophical essays.
          <br /><br />
          <strong>Third-party integrations:</strong> If you connect Spotify, we access your top artists, genres, and listening mood data to generate your listening portrait. We do not access your Spotify playlists or play history beyond what is needed for the portrait feature.
          <br /><br />
          <strong>Device information:</strong> On iOS, we collect your push notification token to deliver notifications. We use Face ID / Touch ID for app lock — biometric data never leaves your device and is handled entirely by Apple's Local Authentication framework.
          <br /><br />
          <strong>Usage data:</strong> We do not use analytics trackers, advertising SDKs, or third-party tracking tools. We do not track your behavior across other apps or websites.
        </Section>

        <Section title="3. How We Use Your Information">
          We use your information to:
          <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
            <li>Provide and maintain the app's features</li>
            <li>Display your cultural profile and reading data</li>
            <li>Generate AI-powered reading themes and bookshelf analysis</li>
            <li>Send push notifications about friend activity</li>
            <li>Process URLs shared via the Share Extension</li>
          </ul>
          AI features (bookshelf scanning, reading theme generation, URL classification) are processed server-side. Your data is not used to train AI models.
        </Section>

        <Section title="4. Data Storage and Security">
          Your data is stored on Supabase cloud infrastructure with row-level security policies ensuring you can only access your own data. All data is transmitted over HTTPS. Authentication tokens are securely stored using iOS Keychain and App Group shared storage.
        </Section>

        <Section title="5. Third-Party Services">
          We use the following third-party services:
          <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
            <li><strong>Supabase</strong> — database, authentication, and file storage</li>
            <li><strong>Spotify API</strong> — listening data for portrait feature (only if you connect your account)</li>
            <li><strong>Google Books API</strong> — book metadata and cover images</li>
            <li><strong>Apple Push Notification service</strong> — push notifications</li>
            <li><strong>OpenAI</strong> — processes dictated reviews, reading theme analysis, portrait generation, and bookshelf scanning. User content is processed but not used for AI model training (per OpenAI API Terms of Use).</li>
            <li><strong>TMDB (The Movie Database)</strong> — movie and TV show cover image search. No personal user data is shared.</li>
            <li><strong>Resend</strong> — transactional email delivery (account confirmations, password resets, weekly digest). Email addresses are shared with Resend for delivery purposes only.</li>
            <li><strong>Perplexity Sonar</strong> — book enrichment data. No personal user data is shared.</li>
          </ul>
          We do not sell, rent, or share your personal data with third parties for advertising or marketing purposes.
        </Section>

        <Section title="6. Data Retention">
          We retain your data for as long as your account is active. When you delete your account, all your data — including books, reviews, cards, activities, profile information, and uploaded images — is permanently deleted from our servers. This deletion is immediate and irreversible.
        </Section>

        <Section title="7. Your Rights">
          You have the right to:
          <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
            <li>Access your data (visible within the app)</li>
            <li>Correct your data (editable within the app)</li>
            <li>Delete your account and all associated data (via Account Settings)</li>
            <li>Disconnect third-party integrations (Spotify)</li>
          </ul>
        </Section>

        <Section title="8. Children's Privacy">
          Le Salon is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact us and we will delete the data.
        </Section>

        <Section title="9. Cookies and Tracking">
          Le Salon does not use cookies, advertising identifiers, or cross-app tracking technologies. We do not participate in ad networks or data brokers.
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this Privacy Policy from time to time. If we make material changes, we will notify you through the app or by email. The "effective date" at the top of this page indicates when the policy was last updated.
        </Section>

        <Section title="11. Contact Us">
          If you have questions about this Privacy Policy or your data, contact us at:
          <br />
          <strong>Email:</strong> privacy@lesalon.app
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '18px',
        fontWeight: 600,
        marginBottom: '8px',
        color: '#622722',
      }}>
        {title}
      </h2>
      <div>{children}</div>
    </div>
  )
}
