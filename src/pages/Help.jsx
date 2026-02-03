export const Help = () => {
  return (
    <div className="container" style={{ maxWidth: '800px', position: 'relative' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '32px', textAlign: 'left', marginLeft: '60px' }}>
        Welcome to Le Salon
      </h1>

      <div style={{
        background: '#FFFEF8',
        padding: '32px',
        borderRadius: '3px',
        boxShadow: '3px 4px 12px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
          Le Salon is your personal space to share what you're into right now with your friends.
          Think of it as a living snapshot of your interests, activities, and recommendations.
        </p>

        {/* My Card Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            📇 My Card
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            Your weekly card is your current vibe. Update it with what you're:
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px', marginBottom: '12px' }}>
            <li><strong>Reading</strong> - Books, articles, or anything you're diving into</li>
            <li><strong>Listening to</strong> - Music, podcasts, audiobooks</li>
            <li><strong>Watching</strong> - Shows, movies, YouTube channels</li>
            <li><strong>Obsessing over</strong> - Whatever's capturing your attention</li>
            <li><strong>Looking forward to</strong> - Upcoming plans and excitement</li>
            <li><strong>Latest AI prompt</strong> - Fun conversations with AI</li>
          </ul>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            💡 Tip: Click the vinyl, book, TV, or other icons to see them come to life!
          </p>
        </div>

        {/* History Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            📜 History
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6' }}>
            Your history page keeps a record of all your past cards. See how your interests have evolved over time.
            Each row shows what you were into on a specific day—like a personal time capsule of your cultural life.
          </p>
        </div>

        {/* Reviews Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            ⚖️ Reviews
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            Rate and review movies, books, shows, albums, and more on a scale of 0-10.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px', marginBottom: '12px' }}>
            <li>Write reviews to remember your thoughts</li>
            <li>Recommend reviews to specific friends</li>
            <li>See what friends have recommended to you</li>
            <li>Filter by category (movies, books, podcasts, etc.)</li>
          </ul>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            💡 Tip: Use the post-it style cards to jot down quick ratings or detailed thoughts!
          </p>
        </div>

        {/* Activity Board Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            📌 Activity Board
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            Plan activities with friends! Post things you'd like to do and see who's interested.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px', marginBottom: '12px' }}>
            <li>Add activities with dates, locations, and prices</li>
            <li>Mark yourself as interested in friends' activities</li>
            <li>Filter activities by city</li>
            <li>Activities automatically archive after their date</li>
          </ul>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            💡 Tip: Keep it casual—dates can be specific (Feb 14) or flexible (February, anytime)
          </p>
        </div>

        {/* Friends Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            👥 Friends
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            Connect with friends to see their cards and share your interests.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px' }}>
            <li>Search for friends by username</li>
            <li>Send and accept friend requests</li>
            <li>View friends' current cards and profiles</li>
            <li>See what your friends are into right now</li>
          </ul>
        </div>

        {/* Getting Started */}
        <div style={{
          background: '#FFF9E6',
          padding: '20px',
          borderRadius: '3px',
          border: '1px dashed #E0C770',
          marginTop: '32px'
        }}>
          <h3 className="handwritten" style={{ fontSize: '28px', marginBottom: '12px', color: '#2C2C2C' }}>
            Getting Started
          </h3>
          <ol style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px' }}>
            <li>Fill out your profile with a display name and bio</li>
            <li>Create your first card with what you're currently into</li>
            <li>Add some friends to share with</li>
            <li>Start posting reviews and activities</li>
            <li>Check back weekly to update your card!</li>
          </ol>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#999' }}>
          Questions? Suggestions? Feel free to reach out!
        </p>
      </div>
    </div>
  )
}
