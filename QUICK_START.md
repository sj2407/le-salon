# Quick Start Guide

Get your Interest Cards app running in 10 minutes.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free)

## Setup in 5 Steps

### 1. Create Supabase Project (3 min)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `interest-cards`, set a password, create
3. Wait for provisioning (~2 min)

### 2. Set Up Database (1 min)

1. In Supabase, go to **SQL Editor** → **New Query**
2. Copy all contents of `supabase-schema.sql` and paste
3. Click **Run**
4. Verify success ✓

### 3. Get API Keys (30 sec)

1. Go to **Settings** → **API**
2. Copy **Project URL** and **anon public** key

### 4. Configure Environment (30 sec)

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
```

### 5. Run the App (1 min)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173 and sign up!

## Optional: Disable Email Confirmation (for testing)

1. Supabase → **Authentication** → **Providers** → **Email**
2. Toggle OFF "Confirm email"
3. Save

This lets you test signup without checking email.

## Test the App

1. **Sign Up** with a test account
2. **Edit your card** and save
3. **View History** to see your archived card
4. **Create a 2nd account** (use incognito window)
5. **Search** for your first account and send a friend request
6. **Accept** the request in the first account
7. **View** your friend's card!

## Deploy to Production

See `SETUP_GUIDE.md` for Vercel deployment instructions.

## Stuck?

Check `SETUP_GUIDE.md` for detailed troubleshooting or the full `README.md` for project documentation.
