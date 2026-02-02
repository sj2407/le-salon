# Interest Cards

A private social app where friends share what's currently occupying their minds - what they're reading, listening to, watching, learning, and looking forward to.

## Features

- **My Card**: View and edit your current interest card with 5 categories
- **History**: Private timeline of all your past cards (personal diary)
- **Friends**: Connect with friends via search and friend requests
- **Friend Cards**: View friends' current cards (not their history)
- **Beautiful Design**: Hand-drawn fonts, full-color illustrations, warm color palette

## Tech Stack

- **Frontend**: React + Vite
- **Routing**: React Router
- **Backend**: Supabase (Auth + PostgreSQL)
- **Styling**: Custom CSS with Google Fonts (Caveat + Source Serif 4)
- **Hosting**: Vercel (recommended)

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
2. Open the `supabase-schema.sql` file from this project
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run** to execute all the SQL commands
5. This will create:
   - Tables: `profiles`, `cards`, `entries`, `friendships`
   - Row Level Security policies
   - Indexes for performance

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

### Sign Up
1. Create an account with email, password, display name, and username
2. Your first card will be created automatically

### Edit Your Card
1. Click "Edit My Card" button
2. Fill in categories with what you're currently into
3. Click "Save Changes"
4. Your previous card is automatically archived to History

### Connect with Friends
1. Go to **Friends** → **Find Friends**
2. Search by email or username
3. Send friend requests
4. Accept incoming requests on the Friends page

### View Friends' Cards
1. Go to **Friends**
2. Click on any accepted friend
3. See their current card (not their history)

## Default Categories

1. **Reading** (with subcategories: book, article)
2. **Listening** (with subcategories: music, podcast, audiobook)
3. **Watching** (with subcategories: tv, movie)
4. **Looking Forward To** (freeform text)
5. **Obsessing Over** (freeform text)

## Design System

### Colors
- Background: `#F5F1EB` (warm cream)
- Card: `#FFFEFA` (off-white)
- Text: `#2C2C2C` (near-black)
- Card Shadow: `4px 4px 0 #2C2C2C`

### Typography
- Headers: Caveat (handwritten)
- Body: Source Serif 4 (serif)

### Icons
Full-color cartoon illustrations for each category (see mockup)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

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
│   ├── SignUp.jsx      # Sign up page
│   ├── SignIn.jsx      # Sign in page
│   ├── MyCard.jsx      # Current card (home)
│   ├── History.jsx     # Past cards timeline
│   ├── Friends.jsx     # Friends list + requests
│   ├── FindFriends.jsx # Search and add friends
│   └── FriendCard.jsx  # View friend's card
├── App.jsx             # Routes and auth
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only see:
  - Their own data (profile, all cards, history)
  - Current cards of accepted friends (not history)
  - Friend requests they're involved in
- Passwords are hashed by Supabase Auth

## Future Enhancements (Out of Scope for V1)

- Notifications (email or push)
- Comments or reactions
- Public profiles
- Mobile app
- Import from Goodreads, Spotify, etc.
- Custom themes

## License

MIT
