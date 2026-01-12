# Changelog - Meditation App

## v1.2 - December 24, 2025

### ✨ New Features

**Background Audio Playback:**
- ✅ Wake Lock API integration - prevents device sleep during playback
- ✅ Media Session API - lock screen controls (iOS/Android)
- ✅ Automatic Wake Lock restoration when returning to page
- ✅ Visual indicator "Background playback active"

**Logout Feature:**
- ✅ "Logout" button in top right corner (Header)
- ✅ Complete session cleanup on server
- ✅ Progress guaranteed to be saved (tied to Google/Yandex ID)
- ✅ Accessible from any device after re-login

**DEV Mode Header:**
- ✅ Header now shown in DEV mode with visual distinction
- ✅ "DEV" badge (yellow) for visual distinction
- ✅ Text "Test user" instead of email
- ✅ "Logout" button works (reloads page in DEV)

### 📚 Documentation

- ✅ Created 11 new documentation files
- ✅ AUDIO_PLAYBACK_FEATURES.md - complete description
- ✅ LOGOUT_FEATURE.md - complete description
- ✅ TESTING guides for new features
- ✅ FAQ for background audio

---

## v1.1 - December 24, 2025

### ✨ New Features

**UI Improvements:**
- ✅ Added "Back to catalog" link on category page
- ✅ Proper word declension for counter (1 time, 2 times, 5 times)
- ✅ Changed "listening recorded" block color to brand light purple (#f4eafc)
- ✅ Visual timer shows countdown of remaining practice time
- ✅ Redesigned timer block layout - "Listening recorded" text on separate line
- ✅ Increased spacing between auth buttons (space-y-4)
- ✅ Added footer "Support Service" on all pages with Telegram link
- ✅ Unified vertical spacing (mb-6 and space-y-6 everywhere)

**Functionality:**
- ✅ Device sleep prevention during listening (Wake Lock API)
- ✅ Unified authentication system via Google/Yandex OAuth
- ✅ Automatic switching between DEV (no auth) and Production (with OAuth)

### 🔧 Technical Improvements

**Authentication:**
- Created `auth.js` module with OAuth strategy configuration
- Passport.js integration with Google and Yandex
- DEV mode: authentication disabled, uses user_id = 1
- Production mode: requires OAuth via Google or Yandex
- Route protection depending on mode

**Wake Lock:**
- Automatic activation on Play press
- Prevents device sleep during meditation
- Automatic release when leaving page

### 📦 New Dependencies

- `passport-yandex` - Yandex OAuth strategy

### 📚 Documentation

- ✅ Created README.md with setup instructions
- ✅ Updated env.example with comments
- ✅ Added OAuth setup instructions

---

## v1.0 - December 23, 2025

### ✅ Core Functionality

**Architecture:**
- Monorepo structure with `/client` and `/server`
- Backend: Node.js + Fastify + SQLite
- Frontend: React + Vite + Tailwind CSS
- Docker Compose for local development

**Pages:**
- `/` - Catalog of meditation categories
- `/catalog/:categoryId` - List of practices in category
- `/practice/:practiceId` - Practice page with audio player

**Listening Functionality:**
- Playerjs integration for audio playback
- Listen counter (one Play press = one record after 30 sec)
- Visual timer with current position indication
- Progress saved to SQLite DB
- Protection against multiple records when seeking

**Database:**
- Table `users` - users (dev mode: user_id = 1)
- Table `user_progress` - listening history
- Listen count calculation for each practice

### 🐛 Fixed Issues

1. **Counter not saved on reload**
   - Cause: UNIQUE constraint in DB
   - Solution: removed constraint, allowed multiple records

2. **Timer not triggered on first open**
   - Cause: event handlers set with delay
   - Solution: retry system + MutationObserver

3. **Multiple records when seeking**
   - Cause: timer triggered every time crossing 30 sec
   - Solution: one Play press = one record after 30 seconds

4. **Incorrect state reset logic**
   - Cause: `setTimerActive(false)` called before recording
   - Solution: simplified logic using setTimeout

### 📦 Dependencies

**Backend:**
- fastify, @fastify/cors, @fastify/secure-session
- @fastify/passport, @fastify/static
- sqlite3, dotenv

**Frontend:**
- react, react-dom, react-router-dom
- react-markdown, tailwindcss

### 🚀 Launch

```bash
# Development
npm run dev

# Production
docker-compose up
```

---

## Future Improvements

- [ ] Adding new categories and practices
- [ ] Listening statistics (charts, analytics)
- [ ] Favorite practices
- [ ] Practice reminders
