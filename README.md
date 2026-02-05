# Le Salon

A private social app where friends share what's currently occupying their minds - what they're reading, listening to, watching, and planning to do. Le Salon combines personal interest tracking with social features like reviews and shared activity planning.

## Features

### Core Features
- **My Card**: Create and edit your current interest card with 5 categories (reading, listening, watching, looking forward to, obsessing over)
- **History**: Private timeline of all your past cards - a personal diary of your evolving interests
- **Friends**: Connect with friends via search and friend requests
- **Friend Cards**: View friends' current cards and their reviews

### Reviews
- **Rate & Review**: Share your thoughts on movies, books, podcasts, shows, and albums
- **Rating System**: 0-10 scale with decimal precision (e.g., 7.5/10)
- **Tag Filters**: Filter reviews by media type (movie 🎬, book 📖, podcast 🎧, show 📺, album 💿)
- **Collapsible Content**: Compact view with expandable full text
- **Friend Reviews**: See what your friends are rating and reviewing

### Activity Board
- **Shared Planning**: Post activities and events you want to do with friends
- **Multi-City Support**: Filter activities by city (New York, London, Paris)
- **Interest Tracking**: Express interest in friends' activities with a simple + button
- **Auto-Archive**: Past activities automatically archive based on date
- **Flexible Dates**: Support for specific dates, month-only, or "anytime"
- **Location & Price**: Add venue details and cost information

### Design
- **Beautiful Aesthetic**: Hand-drawn fonts (Caveat), warm cream color palette
- **Compact Cards**: Clean, space-efficient design optimized for mobile and desktop
- **Subtle Icons**: Icon-based UI for edit/delete actions

## Tech Stack

- **Frontend**: React + Vite
- **Routing**: React Router
- **Backend**: Supabase (Auth + PostgreSQL)
- **Styling**: Custom CSS with Google Fonts (Caveat + Source Serif 4)
- **Hosting**: Vercel
- **PWA**: Progressive Web App support for mobile installation

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

2. Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
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
2. **Create Your Card**: Fill in your current interests across 5 categories
3. **Find Friends**: Search by email or username and send friend requests
4. **Explore**: View friends' cards, add reviews, and plan activities together

### Managing Your Card
- Edit your card anytime - previous versions are automatically saved to History
- View your personal timeline in the History page
- Friends can only see your current card, not your history

### Reviews
1. Click **Reviews** in the navigation
2. Click **Add Review** to rate something new
3. Select a tag (movie, book, podcast, show, album, other)
4. Add a rating (0-10) and optional review text
5. Use tag filters to browse reviews by type
6. Click **+** to expand and read full reviews

### Activity Board
1. Click **Activity Board** in the navigation
2. Click **Add Activity** to post something you want to do
3. Select a city, add date/location/price details
4. Friends can click **+** to show interest
5. Use the city filter to see activities in specific locations
6. Past activities automatically archive based on date

## Project Structure

```
src/
├── components/
│   ├── icons/          # SVG icon components
│   ├── CardDisplay.jsx # Display card in view mode
│   ├── CardEdit.jsx    # Edit card form
│   └── Navigation.jsx  # Top nav bar
├── contexts/
│   └── AuthContext.jsx # Auth state management
├── lib/
│   └── supabase.js     # Supabase client
├── pages/
│   ├── SignUp.jsx        # Sign up page
│   ├── SignIn.jsx        # Sign in page
│   ├── MyCard.jsx        # Current card (home)
│   ├── History.jsx       # Past cards timeline
│   ├── Reviews.jsx       # Reviews list with filters
│   ├── ToDo.jsx          # Activity board
│   ├── PastActivities.jsx # Archived activities
│   ├── Friends.jsx       # Friends list + requests
│   ├── FindFriends.jsx   # Search and add friends
│   ├── FriendCard.jsx    # View friend's card + reviews
│   └── Profile.jsx       # User profile settings
├── App.jsx             # Routes and auth
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## Design System

### Colors
- Background: `#F5F1EB` (warm cream)
- Card/Content boxes: `#FFFEFA` (off-white)
- Text: `#2C2C2C` (near-black)
- Muted text: `#666`, `#777`, `#999`
- Links: `#4A7BA7`

### Typography
- Headers: Caveat (handwritten) via `className="handwritten"`
- Body: Source Serif 4 (serif)

### Review Tags
- Movie: 🎬 `#E8D0D0` (dusty rose)
- Book: 📖 `#E8DCC8` (warm gold)
- Podcast: 🎧 `#D0E0D0` (sage green)
- Show: 📺 `#D0D8E8` (soft blue)
- Album: 💿 `#E0D8E8` (lavender)
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
  <span style={{ display: 'inline-block', transform: 'scale(-1.2, 1.2)' }}>🖋️</span>
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
- `bookFloat` - gentle floating for decorative images
- `reviewSway1/2/3` - subtle swaying for cards
- `gavelSway` - gavel icon specific

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only see:
  - Their own data (profile, cards, history, reviews, activities)
  - Current cards and reviews of accepted friends
  - Activities posted by anyone in their friend network
  - Friend requests they're involved in
- Passwords are hashed by Supabase Auth
- API keys are environment variables, never committed to git

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
- New feature tables (reviews, activities, activity_interests)
- All RLS policies and indexes

## Future Enhancements

- Notifications (email or push)
- Comments on reviews
- Recurring activities
- Integration with external services (Goodreads, Spotify, etc.)
- Custom city options
- Activity calendar view
- Export personal data

## License

MIT
