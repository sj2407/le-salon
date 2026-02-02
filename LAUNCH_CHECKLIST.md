# Interest Cards Launch Checklist

Use this checklist to launch your Interest Cards app from zero to production.

## Phase 1: Supabase Setup ☁️

- [ ] Go to [supabase.com](https://supabase.com) and create account
- [ ] Create new project named "interest-cards"
- [ ] Wait for database provisioning (~2 min)
- [ ] Copy Project URL from Settings → API
- [ ] Copy anon/public key from Settings → API
- [ ] Go to SQL Editor
- [ ] Open `supabase-schema.sql` and copy all contents
- [ ] Paste into SQL Editor and click Run
- [ ] Verify "Success. No rows returned" message
- [ ] Check Table Editor shows: profiles, cards, entries, friendships
- [ ] (Optional) Disable email confirmation: Authentication → Providers → Email → Toggle OFF "Confirm email"

## Phase 2: Local Development 💻

- [ ] Navigate to project folder in terminal
- [ ] Copy environment template: `cp .env.example .env`
- [ ] Open `.env` and paste Supabase credentials
- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Open http://localhost:5173 in browser
- [ ] App loads without errors ✓

## Phase 3: Feature Testing 🧪

### Authentication
- [ ] Click "Sign Up"
- [ ] Create test account (display name, username, email, password)
- [ ] Successfully redirected to My Card page
- [ ] Click "Sign Out" in navigation
- [ ] Click "Sign In"
- [ ] Sign in with test account credentials
- [ ] Successfully logged in

### My Card
- [ ] Empty card displays with default categories
- [ ] Click "Edit My Card"
- [ ] Fill in Reading category (book, article)
- [ ] Fill in Listening category (music, podcast)
- [ ] Fill in Watching category (tv, movie)
- [ ] Fill in Looking Forward To (freeform text)
- [ ] Fill in Obsessing Over (freeform text)
- [ ] Click "Save Changes"
- [ ] Card updates successfully
- [ ] Design matches mockup (fonts, colors, icons, layout)

### History
- [ ] Click "History" in navigation
- [ ] See "No past cards yet" message
- [ ] Go back to My Card
- [ ] Edit card and save again (creates new version)
- [ ] Go to History
- [ ] Previous card version appears with timestamp
- [ ] Card displays correctly

### Friends
- [ ] Open app in incognito/different browser
- [ ] Create second test account
- [ ] In first account, click "Friends"
- [ ] Click "Find Friends"
- [ ] Search for second account's username
- [ ] Second account appears in results
- [ ] Click "Send Request"
- [ ] See "Friend request sent!" message
- [ ] Switch to second account
- [ ] Click "Friends"
- [ ] See pending request from first account
- [ ] Click "Accept"
- [ ] Request moves to Friends list
- [ ] Click on friend's name
- [ ] Friend's current card displays
- [ ] Cannot see friend's history (only current card)

## Phase 4: Build & Deploy 🚀

### Prepare for Deployment
- [ ] Test build locally: `npm run build`
- [ ] Build succeeds without errors
- [ ] Check dist/ folder created
- [ ] Create GitHub repository
- [ ] Initialize git: `git init`
- [ ] Add all files: `git add .`
- [ ] Commit: `git commit -m "Initial commit"`
- [ ] Push to GitHub

### Deploy to Vercel
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign in with GitHub
- [ ] Click "New Project"
- [ ] Import your repository
- [ ] Configure build settings:
  - Framework: Vite
  - Build Command: `npm run build`
  - Output Directory: `dist`
- [ ] Add Environment Variables:
  - `VITE_SUPABASE_URL`: [your URL]
  - `VITE_SUPABASE_ANON_KEY`: [your key]
- [ ] Click "Deploy"
- [ ] Wait for deployment (~2 min)
- [ ] Visit your live URL
- [ ] App loads successfully ✓

## Phase 5: Production Testing 🎯

- [ ] Sign up with real email on production site
- [ ] Verify email works (if confirmation enabled)
- [ ] Create your actual interest card
- [ ] Test on mobile device (responsive design)
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Share with a friend and test friend request flow
- [ ] Verify friend's card is visible
- [ ] Test editing card multiple times
- [ ] Verify history accumulates correctly

## Phase 6: Polish & Launch 💎

### Optional Improvements
- [ ] Customize categories for your use case
- [ ] Add your branding/colors if desired
- [ ] Set up custom domain in Vercel
- [ ] Enable email confirmation in Supabase (if disabled)
- [ ] Set up analytics (Vercel Analytics)
- [ ] Create privacy policy page
- [ ] Create terms of service page

### Launch
- [ ] Share with friends and family
- [ ] Post on social media
- [ ] Send launch announcement email
- [ ] Monitor Supabase dashboard for errors
- [ ] Monitor Vercel dashboard for traffic
- [ ] Gather user feedback

## Troubleshooting Reference

**If something goes wrong:**

1. **Can't connect to Supabase**
   - Check `.env` has correct URL and key
   - Verify Supabase project is running
   - Check browser console for errors

2. **Database errors**
   - Verify schema was run completely
   - Check Table Editor shows all tables
   - Review Supabase Database logs

3. **Authentication issues**
   - Check Authentication → Users in Supabase
   - Verify email confirmation setting
   - Check browser cookies enabled

4. **Build errors**
   - Run `npm install` again
   - Delete node_modules and reinstall
   - Check Node.js version (18+)

5. **Deployment issues**
   - Verify environment variables in Vercel
   - Check Vercel build logs
   - Ensure .env is in .gitignore

## Success! 🎉

When all checkboxes are complete, your Interest Cards app is live and ready to use!

**What's Next?**
- Monitor usage in first week
- Gather user feedback
- Plan next feature iterations
- Consider monetization if applicable
- Build community around your app

---

**Need help?** Check:
- `README.md` for project overview
- `SETUP_GUIDE.md` for detailed instructions
- `PROJECT_SUMMARY.md` for technical details
- Supabase docs: https://supabase.com/docs
- Vercel docs: https://vercel.com/docs
