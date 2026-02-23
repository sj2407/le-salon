export const Help = () => {
  return (
    <div className="container" style={{ maxWidth: '800px', position: 'relative' }}>
      <h1 className="handwritten" style={{ fontSize: '42px', marginBottom: '24px', marginTop: '8px', textAlign: 'left', marginLeft: '10px' }}>
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
          Le Salon is your personal space to share what you're into right now with your friends,
          and a shared intellectual space where you gather each week around a new idea.
        </p>

        {/* The Salon Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            🏛️ The Salon
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            The home page. Each week, a new philosophical essay appears in <strong>The Parlor</strong>,
            covering a different movement in the history of ideas. Read it, adjust the text size to your liking,
            or listen with the audio player.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px', marginBottom: '12px' }}>
            <li><strong>Vos réflexions</strong> — share your thoughts on the week's theme and see what friends wrote</li>
            <li><strong>The Commonplace Book</strong> — tap the typewriter icon to open a shared notebook where anyone can write. A badge shows how many new entries you haven't seen</li>
            <li>New essays appear every Monday automatically</li>
          </ul>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            💡 Tip: Use the Aa slider to adjust text size and the play button to listen to the essay read aloud!
          </p>
        </div>

        {/* My Corner Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            🪴 My Corner
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6' }}>
            Your personal hub with four tabs: Card, Reviews, La Liste, and Wishlist.
            Everything about you lives here.
          </p>
        </div>

        {/* My Card Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            📇 My Card
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            Your weekly card is your current vibe. Update it with what you're:
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px', marginBottom: '12px' }}>
            <li><strong>Reading</strong> - Books, articles, or anything you're diving into</li>
            <li><strong>Listening to</strong> - Music, podcasts, audiobooks. Use the music search to find albums and songs</li>
            <li><strong>Watching</strong> - Shows, movies, YouTube channels</li>
            <li><strong>Looking forward to</strong> - Upcoming plans and excitement</li>
            <li><strong>Performing Arts and Exhibits</strong> - Theatre, musicals, gallery shows</li>
            <li><strong>Obsessing over</strong> - Whatever's capturing your attention</li>
            <li><strong>Latest AI prompt</strong> - Fun conversations with AI</li>
          </ul>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666', marginBottom: '12px' }}>
            💡 Tip: Tap the microphone icon to dictate entries by voice instead of typing!
          </p>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            ⚙️ Tap the gear icon in the top-right corner of your card to edit your profile — name, photo, bio, and more.
          </p>
        </div>

        {/* Reviews Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            ⚖️ Reviews
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            Rate and review movies, books, podcasts, shows, albums, performing arts, exhibitions, and more on a scale of 0-10.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px', marginBottom: '12px' }}>
            <li>Write reviews to remember your thoughts</li>
            <li>Recommend reviews to specific friends</li>
            <li>See what friends have recommended to you</li>
            <li>Filter by category (movies, books, podcasts, etc.)</li>
            <li>Leave paragraph-level comments on friends' reviews</li>
          </ul>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            💡 Tip: Use the post-it style cards to jot down quick ratings or detailed thoughts!
          </p>
        </div>

        {/* La Liste Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            📋 La Liste
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            Your curated inbox of recommendations from friends. When a friend recommends a review to you,
            it appears here. Think of it as a reading/watching/listening list built by the people who know you best.
          </p>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            💡 Tip: Check La Liste regularly — it's the best way to discover what your friends think you'll love!
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
            <li>Search for friends by username (use the magnifying glass in the nav bar for quick search)</li>
            <li>Send and accept friend requests</li>
            <li>View friends' current cards, reviews, wishlists, and profiles</li>
            <li>See what your friends are into right now</li>
          </ul>
        </div>

        {/* Marginalia Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            🖋️ Marginalia
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6' }}>
            Leave notes on friends' cards, like scribbling in the margins of a book.
            When you view a friend's card, flip it over to see and write annotations.
            You'll get a notification when someone leaves a note on yours.
          </p>
        </div>

        {/* Wishlist Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            🎁 Wishlist
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            Create a wishlist of items you'd love to receive, and friends can anonymously claim items to avoid duplicate gifts!
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px', marginBottom: '12px' }}>
            <li>Add items with name, type (Book, Movie, etc.), and optional link</li>
            <li>See if items are claimed (but not by whom)</li>
            <li>View friends' wishlists and claim items you plan to gift</li>
            <li>Unclaim items if your plans change</li>
            <li>Keep the surprise—owners never see who claimed their items</li>
          </ul>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            💡 Tip: Click the Wishlist tab on a friend's profile to see what they'd love!
          </p>
        </div>

        {/* Notifications Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            🔔 Notifications
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>
            Stay updated when friends interact with your content. The bell icon in the header shows you what's new!
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.8', marginLeft: '24px', marginBottom: '12px' }}>
            <li>Get notified when friends send or accept friend requests</li>
            <li>See when someone is interested in your activities</li>
            <li>Know when friends recommend reviews to you</li>
            <li>Get an alert when someone claims a wishlist item (anonymous)</li>
            <li>See when someone leaves a note on your card</li>
          </ul>
          <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#666' }}>
            💡 Tip: Click the bell to see all unread notifications—they're automatically marked as read when you view them!
          </p>
        </div>

        {/* Newsletter Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            📰 Newsletter
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6' }}>
            A weekly digest of what your friends have been up to — new cards, reviews, and activity.
            Access it from the newspaper icon in the nav bar.
          </p>
        </div>

        {/* Account Section */}
        <div style={{ marginBottom: '32px', borderTop: '1px dashed #E0E0E0', paddingTop: '24px' }}>
          <h2 className="handwritten" style={{ fontSize: '32px', marginBottom: '16px', color: '#2C2C2C' }}>
            ⚙️ Account Settings
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '1.6' }}>
            Change your password or manage your account from the menu. If you forget your password,
            use the reset link on the sign-in page to receive a recovery email.
          </p>
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
            <li>Read this week's Parlor essay and leave a reflection</li>
            <li>Start posting reviews, activities, and wishlist items</li>
            <li>Check back weekly to update your card and read the new essay!</li>
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
