# Complete Setup Guide for Interest Cards

Follow these steps to get your Interest Cards app running locally and deployed.

## Part 1: Supabase Setup (Backend)

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" or "New Project"
3. Sign in with GitHub (or create an account)
4. Click "New Project"
5. Fill in:
   - **Name**: `interest-cards`
   - **Database Password**: Generate a strong password (save it somewhere safe)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine
6. Click "Create new project"
7. Wait 2-3 minutes for the database to provision

### Step 2: Get Your API Credentials

1. In your project dashboard, click the **Settings** (gear icon) in the sidebar
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **Project API keys** → **anon/public**: Copy this key
4. Keep these handy for Step 4

### Step 3: Run the Database Schema

1. In the Supabase dashboard sidebar, click **SQL Editor**
2. Click **New Query**
3. Open the file `supabase-schema.sql` from this project in your code editor
4. Copy the entire contents (all ~200 lines)
5. Paste into the Supabase SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned" at the bottom
8. Verify tables were created:
   - Click **Table Editor** in sidebar
   - You should see: `profiles`, `cards`, `entries`, `friendships`

### Step 4: Enable Email Auth (Optional but Recommended)

By default, Supabase requires email confirmation. For local development, you may want to disable this:

1. Go to **Authentication** → **Providers** in the sidebar
2. Click **Email** provider
3. Scroll down to **Confirm email**
4. Toggle it OFF for easier testing
5. Click **Save**

**Note**: For production, leave email confirmation ON.

## Part 2: Local Development Setup

### Step 1: Configure Environment Variables

1. In your project folder, copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your code editor

3. Replace the placeholders with your Supabase credentials from Part 1, Step 2:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

4. Save the file

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- React + Vite
- Supabase client
- React Router
- All dependencies

### Step 3: Run the Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 4: Test the App

1. Open `http://localhost:5173` in your browser
2. Click **Sign Up**
3. Create a test account:
   - Display Name: Your name
   - Username: Something unique
   - Email: Your email
   - Password: At least 6 characters
4. Click **Sign Up**
5. You should be redirected to your card!

### Step 5: Test Features

**Edit Your Card:**
1. Click "Edit My Card"
2. Fill in some categories
3. Click "Save Changes"
4. Your card updates!

**View History:**
1. Click "History" in the nav
2. Your previous card version should appear

**Add a Friend:**
1. Create a second test account (use incognito/different browser)
2. In the first account, click "Friends" → "Find Friends"
3. Search for the second account's username or email
4. Send a friend request
5. In the second account, go to "Friends" and accept the request
6. Now both can see each other's current cards!

## Part 3: Deploy to Vercel (Optional)

### Step 1: Push to GitHub

1. Initialize git (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub
3. Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/interest-cards.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/in with GitHub
3. Click "New Project"
4. Import your `interest-cards` repository
5. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add environment variables:
   - Click "Environment Variables"
   - Add `VITE_SUPABASE_URL` → your Supabase URL
   - Add `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
7. Click **Deploy**
8. Wait 2-3 minutes
9. Your app is live at `https://your-project.vercel.app`!

### Step 3: Enable Email Confirmation (Production)

If you disabled email confirmation earlier, re-enable it:

1. Go to Supabase dashboard → **Authentication** → **Providers**
2. Click **Email**
3. Toggle **Confirm email** ON
4. Save

## Troubleshooting

### "Invalid API key" error
- Check your `.env` file has the correct credentials
- Make sure you copied the **anon/public** key, not the service_role key
- Restart the dev server after changing `.env`

### "No rows returned" or database errors
- Make sure you ran the entire `supabase-schema.sql` in SQL Editor
- Check the Table Editor to confirm tables exist
- Re-run the schema if needed (it's idempotent)

### Can't sign up
- Check Supabase logs: **Authentication** → **Users** → **Logs**
- Make sure email confirmation is disabled for testing
- Use a valid email format

### Friend requests not working
- Check Supabase logs: **Database** → **Logs**
- Verify RLS policies are enabled (they should be from the schema)
- Make sure both users exist in the profiles table

### Styles look wrong
- Verify fonts are loading: check Network tab in browser dev tools
- Check `index.css` is imported in `main.jsx`
- Clear browser cache

## Database Management

### View Data in Supabase

1. Go to **Table Editor** in Supabase dashboard
2. Click any table to see rows
3. You can manually edit data here if needed

### Reset Data (Fresh Start)

To clear all data and start fresh:

1. Go to **SQL Editor**
2. Run this query:
   ```sql
   TRUNCATE profiles, cards, entries, friendships CASCADE;
   ```
3. This deletes all data but keeps the schema

### Backup Data

Supabase automatically backs up your database daily. To export manually:

1. Go to **Database** → **Backups**
2. Click "Create backup"
3. Download the backup file

## Next Steps

- Customize the categories in `CardDisplay.jsx` and `CardEdit.jsx`
- Add custom categories feature
- Add profile pictures
- Implement notifications
- Add more social features

## Support

For issues:
- Check the [Supabase docs](https://supabase.com/docs)
- Check the [React docs](https://react.dev)
- Search GitHub issues for similar problems
