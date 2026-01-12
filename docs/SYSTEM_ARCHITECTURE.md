# System Architecture Map

**Project:** Meditation App (as_app)  
**Version:** 1.2.0  
**Date:** January 8, 2026  
**Purpose:** External architecture audit for professional review

---

## 1. Project Overview

### Name and Purpose
Web application for listening to hypnotherapy and meditation practices with progress tracking.

### Core Problem
Providing users access to audio practices for meditation and relaxation with the ability to track their progress, including background audio playback when the device screen is off.

### Target Users
- Individual users interested in meditation, hypnotherapy, and sleep improvement
- Access via web browser on desktop and mobile devices
- Authentication via Google or Yandex OAuth

---

## 2. Technology Stack

### Backend
- **Language and runtime:** Node.js (v20+, ES6 modules)
- **Web framework:** Fastify v4.24.3
- **Database:** SQLite v5.1.6
- **Authentication:** 
  - Passport.js via @fastify/passport v2.4.0
  - passport-google-oauth20 v2.0.0
  - passport-yandex v0.0.4
- **Sessions:** @fastify/secure-session v5.1.0 (httpOnly cookies)
- **CORS:** @fastify/cors v8.4.0
- **Static files:** @fastify/static v6.12.0
- **Environment variables:** dotenv v16.3.1

### Frontend
- **Language and framework:** React v18.2.0
- **Build tool:** Vite v5.0.8
- **Routing:** react-router-dom v6.21.1
- **Styling:** Tailwind CSS v3.4.0
- **Markdown:** react-markdown v9.0.1

### Infrastructure
- **Containerization:** Docker (multi-stage build), Docker Compose
- **Base image:** node:20-alpine
- **Build process:** 
  - Development: 2 containers (client + server with hot-reload)
  - Production: 1 container (Fastify serves API + React static)

### External Dependencies
- **OAuth providers:** Google OAuth 2.0, Yandex OAuth
- **Audio player:** Playerjs (iframe integration)
- **Audio storage:** External CDN (Selectel Storage)

---

## 3. High-Level Architecture

### Main Components

#### 3.1 Client (React SPA)
**Responsibilities:**
- User interface
- Client-side routing (SPA)
- State management (local, React hooks)
- Audio player integration
- Wake Lock API to prevent device sleep
- Media Session API for lock screen controls

**Main modules:**
- `pages/` - application pages (LoginPage, CatalogPage, CategoryPage, PracticePage)
- `components/` - reusable components (Header, Footer, Layout, Card, Button, AudioPlayer)
- `utils/api.js` - API client for backend interaction

#### 3.2 Server (Fastify)
**Responsibilities:**
- REST API for content and progress
- OAuth authentication (Google, Yandex)
- Session management
- SQLite database operations
- In production: serving React static files

**Main modules:**
- `server.js` - main server file, routing
- `auth.js` - OAuth strategies and routes
- `db.js` - database operations
- `data/content.json` - static content storage

#### 3.3 Database (SQLite)
**Responsibilities:**
- User storage
- Listening history storage
- User-progress relationship

### Component Interaction

**Development mode:**
```
Browser → Client (Vite :5173) → Server (Fastify :4000) → SQLite
                                      ↓
                                OAuth Providers
```

**Production mode:**
```
Browser → Server (Fastify :4000) → SQLite
          ├── Static: React SPA
          ├── /api/*: REST API
          └── /auth/*: OAuth
                ↓
          OAuth Providers
```

**Communication:**
- Client → Server: HTTP/HTTPS (fetch API with credentials: 'include')
- Server → Database: Synchronous SQL queries via sqlite3
- Server → OAuth: HTTPS redirects and callbacks

---

## 4. Data Models and State

### 4.1 Database Schema (SQLite)

#### Table `users`
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,           -- 'google' or 'yandex'
  provider_id TEXT NOT NULL,        -- unique ID from OAuth provider
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_id)
)
```

**Purpose:** Storage of authenticated users. The `provider + provider_id` pair is unique, preventing duplicates on repeated logins.

#### Table `user_progress`
```sql
CREATE TABLE user_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  practice_id TEXT NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

CREATE INDEX idx_user_progress_user_practice 
  ON user_progress(user_id, practice_id)
```

**Purpose:** Listening history. Each listening is recorded as a separate row (no UNIQUE constraint), allowing tracking of listen counts.

### 4.2 Content Data Structures

#### JSON file `data/content.json`
```json
{
  "categories": [
    {
      "id": "c1",
      "title": "Sleep",
      "image_url": "PLACEHOLDER"
    }
  ],
  "practices": [
    {
      "id": "p1",
      "category_id": "c1",
      "title": "Falling Asleep",
      "audio_url": "https://...",
      "audio_title": "Introduction Lecture",
      "description_md": "# Falling Asleep\n\n..."
    }
  ]
}
```

**Features:**
- Stored as static JSON file on server
- Relationship via `category_id`
- Markdown description for flexible formatting

### 4.3 State Management

#### Client-side state
- **React hooks:** `useState`, `useEffect` for local component state
- **No global state management** (Redux, Zustand, etc.)
- **Session state:** User information loaded on initialization from `/api/me`

**Example state in PracticePage:**
- `practice` - current practice
- `listenCount` - listen count
- `playbackTime` - current playback time
- `sessionRecordedRef` - listening record flag (useRef to prevent duplicates)
- `wakeLockRef` - reference to active Wake Lock

#### Server-side state
- **Sessions:** Stored in encrypted httpOnly cookies via @fastify/secure-session
- **User state:** Serialization/deserialization via Passport.js
- **Database connections:** Singleton SQLite connection

**DEV mode:** If OAuth credentials are missing, a dummy `user_id = 1` is used for all operations.

---

## 5. API Interface

### 5.1 HTTP endpoints

#### Content
**GET /api/content**
- Purpose: Get all categories and practices
- Authorization: Not required
- Response: `{ categories: [...], practices: [...] }`

#### User Progress
**GET /api/progress**
- Purpose: Get listening statistics for current user
- Authorization: DEV mode - user_id=1, Production - from session
- Response: `{ "p1": 5, "p2": 3 }` (practice_id → count)

**POST /api/progress**
- Purpose: Record new listening
- Authorization: DEV mode - user_id=1, Production - from session
- Body: `{ practice_id: "p1" }`
- Response: `{ success: true, id: 123 }`

#### Authentication
**GET /api/me**
- Purpose: Get current user information
- Authorization: Required (session)
- Response: `{ user: { id, provider, email, created_at } }`
- Error: 401 if not authorized

**GET /auth/google**
- Purpose: Initiate OAuth flow via Google
- Redirect: To Google consent screen

**GET /auth/google/callback**
- Purpose: Callback after successful Google authorization
- Redirect: To FRONTEND_URL (main page)

**GET /auth/yandex** and **GET /auth/yandex/callback**
- Similar to Google OAuth

**POST /auth/logout**
- Purpose: End session
- Actions: `request.logout()` + `request.session.delete()`
- Response: `{ success: true }`

#### Utilities
**GET /health**
- Purpose: Healthcheck for monitoring
- Response: `{ status: "ok" }`

### 5.2 Authentication Mechanism

**Strategy:**
1. OAuth 2.0 via Google or Yandex
2. After successful authorization, user is created/found in DB by `provider_id`
3. `user.id` is saved in session (Passport serialization)
4. Session stored in encrypted httpOnly cookie
5. On subsequent requests, session is automatically deserialized

**Protection:**
- httpOnly cookies (XSS protection)
- secure flag in production (HTTPS only)
- CORS limited to FRONTEND_URL
- SESSION_SECRET for session encryption

**DEV mode:**
- If OAuth credentials are missing, authorization not required
- All operations performed as `user_id = 1`

### 5.3 Key Contracts

**Record listening (POST /api/progress):**
```javascript
// Request
{ practice_id: "p1" }

// Success Response (201)
{ success: true, id: 456 }

// Error Response (400)
{ error: "practice_id is required" }

// Error Response (500)
{ error: "Failed to add progress", details: "..." }
```

**Get progress (GET /api/progress):**
```javascript
// Response (200)
{
  "p1": 5,   // practice_id: listen count
  "p2": 3,
  "p3": 1
}

// Empty progress
{}
```

---

## 6. Processes and Flows

### 6.1 Authentication Flow (Production)

1. User opens application
2. Frontend requests GET /api/me
3. If 401 → redirect to /login
4. User selects Google/Yandex
5. Click → GET /auth/google (or /auth/yandex)
6. Redirect to OAuth provider
7. User confirms access
8. OAuth provider → GET /auth/google/callback with authorization code
9. Backend exchanges code for access token
10. Backend extracts profile (provider_id, email)
11. Backend finds or creates user in DB
12. Backend saves user.id in session
13. Redirect to FRONTEND_URL
14. Frontend requests GET /api/me again → success
15. Application accessible

### 6.2 Practice Listening Flow

1. User opens /practice/:id
2. Frontend loads:
   - GET /api/content (practice and category)
   - GET /api/progress (current counter)
3. Audio player (Playerjs iframe) displayed
4. User presses Play
5. Frontend:
   - Requests Wake Lock (if supported)
   - Configures Media Session API
   - Starts 30-second timer
6. After 30 seconds:
   - POST /api/progress { practice_id }
   - Backend records to user_progress
7. Frontend updates counter:
   - GET /api/progress
   - Updates UI
8. When leaving page, Wake Lock is released

### 6.3 Logout Flow

1. User clicks "Logout" in Header
2. Frontend → POST /auth/logout
3. Backend:
   - `request.logout()` (Passport)
   - `request.session.delete()` (delete session)
4. Backend → { success: true }
5. Frontend:
   - DEV mode: `window.location.reload()`
   - Production: `navigate('/login')`

**Important:** Progress is tied to user_id in DB, not session, so it persists after logout.

### 6.4 Data Flow from Action to Persistence

**Example: Recording listening**

```
User Action (Play) 
  → Client State (playEventFiredRef = true)
  → Timer (30 sec)
  → Client API call (POST /api/progress)
  → Server Handler (/api/progress)
  → Auth Check (request.user?.id || 1)
  → DB Operation (INSERT INTO user_progress)
  → Response ({ success: true, id })
  → Client Refresh (GET /api/progress)
  → Client State Update (setListenCount)
  → UI Re-render (show new counter)
```

---

## 7. Deployment Architecture

### 7.1 Development Mode

**Components:**
- Client: Vite dev server on port 5173
- Server: Fastify on port 4000
- Database: SQLite file in server/database.sqlite

**Launch:**
```bash
npm run dev  # Simultaneously starts client and server via concurrently
```

**API URLs:**
- Client uses: `http://localhost:4000`
- OAuth callbacks: `http://localhost:4000/auth/*/callback`
- CORS origin: `http://localhost:5173`

**Hot Reload:** Vite HMR for client, nodemon not used (manual server restart).

### 7.2 Production Mode

**Components:**
- Single Fastify server on port 4000
- Serves React static files from client/dist
- Handles API and Auth routes
- SQLite database

**Build process:**
```bash
# 1. Build frontend
cd client && npm run build  # → client/dist/

# 2. Start server
cd server && NODE_ENV=production npm start
```

**API URLs:**
- Client uses: `https://api.sashin.net/as-app`
- OAuth callbacks: `https://api.sashin.net/as-app/auth/*/callback`
- CORS origin: `https://sashin.net`

**Static Serving:**
- All API requests: `/api/*`
- All Auth requests: `/auth/*`
- Everything else: React SPA (SPA fallback via setNotFoundHandler)

### 7.3 Docker Development

**docker-compose.yml:**
- 2 services: client and app (server)
- Volumes: mounting local directories for hot reload
- Ports: 5173 (client), 4000 (server)

### 7.4 Docker Production

**Dockerfile (multi-stage):**

**Stage 1 (client-builder):**
- Base image: node:20-alpine
- Copy client/
- `npm install` + `npm run build`
- Result: client/dist/

**Stage 2 (final):**
- Base image: node:20-alpine
- Copy server/
- `npm install --production`
- Copy client/dist from stage 1
- Expose 4000
- CMD: `npm start`

**docker-compose.prod.yml:**
- 1 service: app
- Volume: ./server/database.sqlite (data persistence)
- Healthcheck: wget on /api/content
- Restart policy: unless-stopped

### 7.5 Environment Configuration

**Environment variables (server/.env):**
```
NODE_ENV=production
PORT=4000
SESSION_SECRET=<32+ bytes hex>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
YANDEX_CLIENT_ID=<from Yandex OAuth>
YANDEX_CLIENT_SECRET=<from Yandex OAuth>
BACKEND_URL=https://api.sashin.net/as-app
FRONTEND_URL=https://sashin.net
```

**Environment variables (client - build time):**
```
VITE_API_URL=https://api.sashin.net/as-app (optional, has default)
```

**Automatic switching:**
- `import.meta.env.DEV` (Vite) determines dev/prod mode
- In dev: API_URL = localhost:4000
- In prod: API_URL = https://api.sashin.net/as-app

---

## 8. External Dependencies

### 8.1 OAuth Providers

**Google OAuth 2.0**
- **URL:** https://console.cloud.google.com/apis/credentials
- **Purpose:** User authentication via Google accounts
- **Scope:** profile, email
- **Data:** provider_id (Google User ID), email
- **Callback URL:** ${BACKEND_URL}/auth/google/callback
- **Working condition:** GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured

**Yandex OAuth**
- **URL:** https://oauth.yandex.ru/
- **Purpose:** User authentication via Yandex accounts
- **Permissions:** login:email, login:info
- **Data:** provider_id (Yandex User ID), email
- **Callback URL:** ${BACKEND_URL}/auth/yandex/callback
- **Working condition:** YANDEX_CLIENT_ID and YANDEX_CLIENT_SECRET must be configured

### 8.2 Audio CDN

**Selectel Storage**
- **URL:** https://cb8a68a7-0a51-4e51-a5a3-31d034ec73fe.selstorage.ru/
- **Purpose:** Storage and delivery of audio files for practices
- **Format:** M4A (audio/mp4)
- **Integration:** Direct links in content.json

### 8.3 External Libraries with Special Purpose

**Playerjs**
- **Files:** client/public/playerjs.js, playerjs.html
- **Purpose:** Cross-browser audio player with advanced features
- **Integration:** Via iframe in AudioPlayer component
- **Features:** 
  - Support for various formats
  - Works with CDN
  - Play/pause/timeupdate events

**Wake Lock API**
- **Browser API:** navigator.wakeLock
- **Purpose:** Prevent automatic device sleep
- **Support:** Chrome/Edge (Desktop+Android), Safari (iOS 16.4+, macOS)
- **Usage:** Activated on Play press, released on exit

**Media Session API**
- **Browser API:** navigator.mediaSession
- **Purpose:** Playback control from lock screen
- **Support:** Chrome/Edge (Desktop+Android), Safari (iOS+macOS), Firefox (Desktop)
- **Metadata:** Practice title, category, artwork

---

## 9. Implicit Assumptions and Limitations

### 9.1 System Working Conditions

**Required:**
- Node.js 16+ with ES6 modules support
- Filesystem access for SQLite
- For Production: HTTPS (for secure cookies)
- For OAuth: Correct CLIENT_ID and CLIENT_SECRET
- External CDN with audio files accessible

**Optional:**
- OAuth credentials (without them, DEV mode works)
- Reverse proxy (nginx/traefik) for routing in production

### 9.2 Browser/Platform Requirements

**Minimum requirements:**
- Modern browser with ES6 support
- JavaScript enabled
- Cookies enabled (for sessions)

**For full functionality:**
- **Wake Lock API:** Chrome/Edge 84+, Safari 16.4+
- **Media Session API:** Chrome/Edge 73+, Safari 14+, Firefox 82+
- **Iframe support:** Not blocked (for Playerjs)

**Mobile:**
- iOS 16.4+ for full background playback support
- iOS < 16.4 - partial support (Media Session only)
- Android with Chrome - full support

### 9.3 Non-Obvious Dependencies

**1. Operating mode determined by OAuth credentials presence**
- If GOOGLE_CLIENT_ID or YANDEX_CLIENT_ID absent → DEV mode
- All users in DEV mode work under user_id = 1
- Header not shown in DEV mode

**2. Progress tied to user_id, not session**
- Logout doesn't delete progress
- Progress accessible from any device after login
- Account switch shows different progress

**3. OAuth callbacks must use BACKEND_URL**
- BACKEND_URL ≠ FRONTEND_URL in typical scenario
- API and OAuth live on subdomain (api.sashin.net)
- Frontend lives on main domain (sashin.net)

**4. Listening recorded exactly once per session**
- `playEventFiredRef` used for tracking
- Audio seeking doesn't create new records
- Only first Play press starts 30-second timer

**5. Production server serves static files**
- In production, frontend is NOT a separate server
- Fastify serves client/dist/ as static files
- SPA fallback via setNotFoundHandler

### 9.4 Scalability Limitations

**SQLite:**
- Single-threaded writes
- Not suitable for high-load systems (thousands of concurrent writes)
- No distributed scaling

**Sessions:**
- Stored in process memory (via secure-session)
- Sessions lost on server restart
- Impossible to scale horizontally without external session store

**Content:**
- Stored as static JSON file
- Requires server restart to update
- No CMS for content management

**Absence of rate limiting:**
- API not protected from abuse
- Recommended to add in production

---

## 10. Evolution Context

### 10.1 Major Versions

**v1.0 (December 23, 2025)**
- Basic functionality: catalog, practices, audio player
- OAuth via Google and Yandex
- SQLite for progress storage
- Listen counter (record after 30 sec)
- Docker support
- DEV mode without authorization

**v1.1 (December 24, 2025)**
- UI improvements (navigation, word declension, colors)
- Wake Lock API to prevent device sleep
- Visual timer with countdown
- Footer with support service link
- Improved documentation

**v1.2 (December 24, 2025)**
- **Background playback:** Wake Lock + Media Session API
- **Logout feature:** Full logout system with progress preservation
- **DEV Mode Header:** Header shown in DEV mode with visual distinction
- Header bug fix
- Extensive documentation (11 new files)

### 10.2 Significant Architecture Changes

**Removing UNIQUE constraint from user_progress (v1.0):**
- **Was:** UNIQUE(user_id, practice_id) - one record per practice
- **Became:** Multiple records allowed
- **Reason:** Need to track listen count

**Adding background playback (v1.2):**
- Wake Lock API integration in PracticePage
- Media Session API setup with metadata
- visibilitychange handling for Wake Lock restoration
- HTML5 audio attributes: playsinline, preload="auto"

**Moving logout route out of setupAuthRoutes (v1.2):**
- **Was:** logout only with OAuth presence
- **Became:** logout always available (even in DEV)
- **Reason:** Unify behavior for DEV and Production

**Automatic mode detection:**
- Check for OAuth credentials presence
- Conditional strategy and route registration
- Fallback to user_id = 1 without authorization

### 10.3 Architectural Additions

**Header component (v1.2):**
- Didn't exist in v1.0-1.1
- Added to display user info and logout button
- Automatic hiding in DEV mode (updated)
- Shown on all pages except /login

**Layout component:**
- Added Header integration
- Structure: Header → Content (flex-grow) → Footer

**API URLs configuration:**
- Separation of BACKEND_URL and FRONTEND_URL
- OAuth callbacks now use BACKEND_URL
- Automatic dev/prod switching in client/src/utils/api.js

### 10.4 Technical Debt Patterns

**Content as static JSON:**
- Advantage: Simplicity
- Disadvantage: No dynamic management
- Likely evolution: Move to CMS or admin panel

**Absence of tests:**
- Neither unit nor integration tests found
- Testing is manual (described in TESTING_*.md)

**SQLite for production:**
- Adequate for small loads
- Limitation: Doesn't scale horizontally
- Likely evolution: PostgreSQL or MySQL with growth

**In-memory sessions:**
- Simple implementation via secure-session
- Limitation: Session loss on restart
- Likely evolution: Redis session store

---

## Conclusion

The system represents a typical full-stack JavaScript monolith with clear client-server separation. Architecture focused on deployment simplicity and maintenance for small to medium loads. Using SQLite and absence of external dependencies (except OAuth providers and CDN) minimizes operational complexity.

Main strengths:
- Automatic switching between DEV and Production modes
- Full OAuth integration with two providers
- Modern Web APIs (Wake Lock, Media Session) for improved UX
- Docker-ready architecture
- Well documented

Main limitations:
- Scalability (SQLite, in-memory sessions)
- Absence of tests
- Static content without CMS
- No rate limiting and advanced monitoring

The system is in production-ready state for small to medium audiences with potential for gradual evolution into more scalable architecture when needed.

---

**Document version:** 1.0  
**Compiled:** January 8, 2026  
**Sources:** Codebase as_app v1.2.0 + documentation in root directory
