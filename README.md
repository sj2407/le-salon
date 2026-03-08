# Le Salon

A private social app where friends share what's currently occupying their minds and engage in weekly philosophical discussion. Le Salon combines personal interest tracking, reviews, shared activity planning, and a curated intellectual space called The Salon.

## Features

### The Salon
The home page and intellectual heart of the app:
- **The Parlor**: A new philosophical essay every week, presented in a book-reader layout with adjustable text size and audio playback. Users can share their reflections in a collapsible "Vos réflexions" thread with real-time updates

Content auto-rotates every Monday. Each entry covers a philosophical movement with historical context, key arguments, critiques, and a closing question for discussion.

### My Corner
A tabbed hub for personal content:
- **Card**: Your current interest card with 7 categories (Reading, Listening, Watching, Looking Forward To, Performing Arts and Exhibits, Obsessing Over, My latest AI prompt). Supports voice dictation via the microphone button and music search for the Listening category
- **Reviews**: Rate and review movies, books, articles, podcasts, shows, albums, performing arts, exhibitions, and more on a 0-10 scale. Recommend reviews to specific friends. Paragraph-level comments on review text
- **La Liste**: Your personal discovery list — everything you want to read, watch, listen to, and experience. Track items with cover art, mark as done, and toggle visibility
- **Wishlist**: Create a wishlist of items you'd love to receive. Friends can anonymously claim items to avoid duplicate gifts
- **Portrait**: An auto-generated cultural profile built from your Spotify listening data, reading library, cultural experiences, and original creations. Connect Spotify, import from Goodreads, scan bookshelves, and add experiences manually

### Marginalia
Leave private notes on friends' cards. Flip a card over to see and write annotations, like scribbling in the margins of a book.

### Activity Board
- **Shared Planning**: Post activities and events you want to do with friends
- **Multi-City Support**: Filter activities by city (New York, London, Paris)
- **Interest Tracking**: Express interest in friends' activities
- **Auto-Archive**: Past activities automatically archive based on date
- **Flexible Dates**: Support for specific dates, month-only, or "anytime"
- **Location & Price**: Add venue details and cost information

### Social
- **Friends**: Search by name, email, or username. Send and accept friend requests
- **Friend Cards**: View friends' current cards, reviews, La Liste, wishlists, portraits, and profiles
- **Notifications**: Real-time activity feed (friend requests, activity interest, review recommendations, wishlist claims, card notes). Bell icon with unread count
- **Newsletter**: Weekly digest preview of friend activity
- **Friend Search**: Quick search from the nav bar

### Account
- **Account Settings**: Change password, manage email
- **Forgot Password / Reset Password**: Full password recovery flow

### Design
- **Warm Aesthetic**: Hand-drawn fonts (Caveat), cream color palette, no borders (boxShadow only)
- **Responsive**: Optimized for mobile and desktop
- **Animations**: Gentle floating and swaying effects on decorative elements
- **PWA**: Progressive Web App support for mobile installation

## Tech Stack

- **Frontend**: React 19 + Vite 7
- **Routing**: React Router 7
- **Backend**: Supabase (Auth + PostgreSQL + Realtime subscriptions)
- **Animations**: Framer Motion
- **PDF Export**: jsPDF + jspdf-autotable
- **Styling**: Custom CSS with Google Fonts (Caveat + Source Serif 4)
- **Testing**: Playwright (E2E)
- **Hosting**: Vercel

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Go to **Settings** → **API** and copy:
   - Project URL
   - Anon/Public Key

### 3. Set Up Database

1. In your Supabase project dashboard, go to **SQL Editor**
2. Run the following SQL to create all required tables:

```sql
-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cards table
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entries table (card content)
CREATE TABLE entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT,
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships table
CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- Reviews table
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'other',
  rating DECIMAL(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  date_text TEXT,
  date_parsed DATE,
  city TEXT,
  location TEXT,
  price TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity interests table
CREATE TABLE activity_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (add appropriate policies for each table)
-- See supabase-schema.sql for complete policies
```

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials (see `.env.example` for the full list):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   RESEND_API_KEY=your-resend-api-key
   ```

### 5. Install Dependencies

```bash
npm install
```

### 6. Run Development Server

```bash
npm run dev
```

The app should now be running at `http://localhost:5173`

## Usage

### Getting Started
1. **Sign Up**: Create an account with email, password, display name, and username
2. **Visit The Salon**: Read this week's philosophical essay and share your reflections
3. **Create Your Card**: Go to My Corner and fill in your current interests across 7 categories
4. **Find Friends**: Search by name, email, or username and send friend requests
5. **Explore**: View friends' cards, add reviews, and plan activities together

## Project Structure

```
src/
├── components/
│   ├── salon/            # Salon components (ParlorText, ParlorResponses, CalligraphyTitle, etc.)
│   ├── marginalia/       # Card annotation system
│   ├── music/            # Music search integration (Deezer API)
│   ├── review-comments/  # Paragraph-level review comments
│   ├── portrait/         # Portrait feature (music, reading, experiences, creations)
│   ├── friends/          # Friend deck and pending requests
│   ├── cover-search/     # Cover art search modal
│   ├── icons/            # SVG icon components
│   ├── CardDisplay.jsx   # Card view mode with flip animation
│   ├── CardEdit.jsx      # Card edit form
│   ├── DictationModal.jsx # Voice dictation overlay
│   ├── ReviewsDisplay.jsx # Shared reviews component
│   ├── WishlistDisplay.jsx # Shared wishlist component
│   ├── ProfileDisplay.jsx  # Shared profile display
│   ├── ProfileEditModal.jsx # Profile editing overlay
│   ├── Navigation.jsx    # Top nav with search, notifications, newsletter
│   └── NotificationBell.jsx # Real-time notification indicator
├── contexts/
│   └── AuthContext.jsx    # Auth state management
├── hooks/
│   └── useDebounce.js     # Search debouncing
├── lib/
│   ├── supabase.js        # Supabase client
│   ├── cardConstants.js   # Shared card category config
│   ├── reviewConstants.js # Review tag constants
│   ├── timeUtils.js       # Relative time formatting
│   ├── markdownUtils.jsx  # Lightweight markdown renderer
│   ├── useSpeechRecognition.js # Web Speech API wrapper
│   └── newsletterUtils.js # Newsletter generation
├── pages/
│   ├── Salon.jsx          # Weekly philosophy + Parlor
│   ├── MyCorner.jsx       # Tabbed hub (Card, Reviews, La Liste, Wishlist, Portrait)
│   ├── MyCard.jsx         # Current card with voice dictation
│   ├── LaListe.jsx        # Personal discovery list
│   ├── Reviews.jsx        # Reviews with filters
│   ├── ToDo.jsx           # Activity board
│   ├── Friends.jsx        # Friends list + requests
│   ├── Portrait.jsx       # Cultural portrait (Spotify, books, experiences, creations)
│   ├── FriendCard.jsx     # Friend card + reviews + portrait view
│   ├── Notifications.jsx  # Activity feed
│   ├── Newsletter.jsx     # Weekly digest
│   ├── AccountSettings.jsx # Account settings
│   └── Help.jsx           # App guide
├── App.jsx                # Routes with lazy loading
├── main.jsx               # Entry point
└── index.css              # Global styles + animations
```

## Design System

### Colors
- Background: `#F5F1EB` (warm cream)
- Card/Content boxes: `#FFFEFA` (off-white)
- Primary accent: `#622722` (Deep Mahogany) — buttons, active states, input focus
- Primary hover: `#4E1F1B`
- Text: `#2C2C2C` (near-black)
- Muted text: `#666`, `#777`, `#999`
- Links: `#4A7BA7`
- Error: `#C75D5D`

### Typography
- Headers: Caveat (handwritten) via `className="handwritten"`
- Display/Titles: Cinzel Decorative (used in Salon calligraphy, friend cards)
- Body: Source Serif 4 (serif)

### Review Tags
- Movie: 🎬 `#E8D0D0` (dusty rose)
- Book: 📖 `#E8DCC8` (warm gold)
- Article: 📰
- Podcast: 🎧 `#D0E0D0` (sage green)
- Show: 📺 `#D0D8E8` (soft blue)
- Album: 💿 `#E0D8E8` (lavender)
- Performing Arts: 🎭
- Exhibition: 🖼️
- Other: ✨ `#E0E0E0` (gray)

### Layout Rules

#### Page Headers (Tab Content Titles)
All page/tab titles MUST use consistent alignment:
```jsx
<h1 className="handwritten" style={{
  fontSize: '42px',
  marginBottom: '24px',
  marginTop: '8px',
  marginLeft: '10px'  // Aligns with "Card" in tab menu
}}>
  Page Title
</h1>
```
**Naming**: Use "My [X]" format for personal pages (My History, My Wishlist).

#### Content Boxes - NO BORDERS
Never use `border` on content boxes. Use `boxShadow` instead:
```jsx
// WRONG
style={{ border: '1.5px solid #2C2C2C' }}

// CORRECT
style={{
  background: '#FFFEFA',
  borderRadius: '3px',
  boxShadow: '2px 3px 8px rgba(0, 0, 0, 0.1)'
}}
```

#### Decorative Icons/Images
Position in the right quartile of the screen:
```jsx
<img
  src="/images/[name]-ready.png"
  style={{
    position: 'absolute',
    top: '8px',
    right: '15%',  // Centers in right quartile
    width: '[size]px',
    opacity: 0.6-0.85,
    pointerEvents: 'none',
    zIndex: 0,
    animation: 'bookFloat 4.5s ease-in-out infinite'
  }}
/>
```

#### Edit Buttons (Fountain Pen)
Position at TOP-LEFT EDGE of content boxes (overlapping corner):
```jsx
<button style={{
  position: 'absolute',
  top: '-6px',
  left: '-6px',
  background: 'none',
  border: 'none',
  opacity: 0.4,
  fontSize: '14px',
  zIndex: 15
}}>
  <span style={{ display: 'inline-block', transform: 'scale(-1.44, 1.44)', filter: 'sepia(1) saturate(3) hue-rotate(320deg) brightness(0.7)' }}>🖋️</span>
</button>
```
Parent element MUST have `position: 'relative'`.

### Spacing Reference
| Element | Value |
|---------|-------|
| Title marginTop | `8px` |
| Title marginBottom | `24px` |
| Title marginLeft | `10px` |
| Decorative icon top | `8px` |
| Decorative icon right | `15%` |
| Content gap | `16px` or `24px` |

### Animations (defined in index.css)
- `bookFloat`, `vinylFloat`, `tvFloat`, `brainFloat`, `calendarFloat`, `robotFloat` - floating decorative icons
- `gentleSway1-6` - subtle swaying for post-it cards
- `reviewSway1/2/3` - subtle swaying for review cards
- `gavelSway` - gavel icon specific
- `fantomOrbit` - empty state ghost animation

### Code Architecture Principle

When the same functionality appears in multiple places, it MUST be consolidated into a shared module (component, hook, or utility). This enables:
- Consistent behavior across views
- Single point of change for enhancements
- Easier addition of future features (analytics, AI recommendations, exports)

### Shared Display Components
Views that exist in both My Corner and Friend view use shared components:

| View | Shared Component | My Corner | Friend View |
|------|------------------|-----------|-------------|
| Reviews | `ReviewsDisplay.jsx` | Reviews.jsx | FriendCard.jsx |
| Wishlist | `WishlistDisplay.jsx` | Wishlist.jsx | FriendWishlist.jsx |
| Portrait | `PortraitDisplay.jsx` | Portrait.jsx | FriendCard.jsx |
| Profile | `ProfileDisplay.jsx` | (edit modal) | FriendProfile.jsx |

**Rules for shared components:**
1. **My Corner is the benchmark** - shared component styling matches My Corner
2. **Action buttons are absolute overlays** - +, edit, delete use `position: absolute`
3. **No container class nesting** - shared components don't have `className="container"`
4. **Use transform for single moves** - `transform: translateY()` moves one element without affecting siblings

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only see:
  - Their own data (profile, cards, history, reviews, activities, wishlist)
  - Current cards, reviews, and wishlists of accepted friends
  - Salon content (parlor responses) from all users
  - Activities posted by anyone in their friend network
  - Friend requests they're involved in
- Passwords are hashed by Supabase Auth
- API keys and access tokens are environment variables, never committed to git
- Supabase Realtime subscriptions respect RLS policies
- Email delivery via SQL auth hook + Resend API (key stored in Supabase Vault)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy
6. Run database migrations in your production Supabase instance

### Database Migrations for Production

Make sure to run all SQL migrations in your production Supabase project before deploying, including:
- Core tables (profiles, cards, entries, friendships)
- Feature tables (reviews, activities, activity_interests, wishlist_items, discovery_items, notifications)
- Salon tables (salon_weeks, parlor_responses)
- Marginalia (card_notes)
- Portrait tables (spotify_tokens, spotify_profiles, books, experiences, creations)
- All RLS policies and indexes

## Future Enhancements

- Push notifications (currently in-app only)
- Recurring activities
- Activity calendar view
- Export personal data
- LLM-powered recommendations based on review history
- Additional external service integrations

## License

MIT
