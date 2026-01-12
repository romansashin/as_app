# 🧘 Meditation App

> Web application for listening to hypnotherapy and meditation practices with progress tracking

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![Last Updated](https://img.shields.io/badge/updated-January%202026-green.svg)

---

## 📖 About

A full-featured web application for listening to meditations and hypnotherapy sessions with personal progress tracking. Supports background playback, lock screen controls, and OAuth authentication via Google/Yandex.

### ✨ Key Features

- 🎵 **Audio Player with Visual Timer** - beautiful interface with progress bar
- 📱 **Background Playback** - audio continues playing even with screen off (Wake Lock API + Media Session API)
- 📊 **Progress Tracking** - automatic listening count (recorded after 30 seconds)
- 🔐 **OAuth Authentication** - login via Google or Yandex
- 🌐 **DEV Mode** - works without authentication for development and demo
- 💾 **Personal Data** - progress tied to account and accessible from any device
- 🎨 **Modern UI** - responsive design with Tailwind CSS

### 🛠 Tech Stack

#### Backend
- **Node.js** - server platform
- **Fastify** - fast web framework
- **SQLite** - lightweight database
- **Passport.js** - OAuth authentication (Google, Yandex)

#### Frontend
- **React 18** - UI library
- **Vite** - fast build tool and dev server
- **Tailwind CSS** - utility-first CSS framework
- **Wake Lock API** - prevent device from sleeping
- **Media Session API** - lock screen controls

#### DevOps
- **Docker** - containerization
- **Docker Compose** - service orchestration
- **nginx** - reverse proxy (in production)

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- (optional) Docker and Docker Compose

### Installation and Launch

1. **Clone the repository**

```bash
git clone https://github.com/romansashin/as_app.git
cd as_app
```

2. **Install dependencies**

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

3. **Run in DEV mode**

```bash
npm run dev
```

Application will be available at:
- 🌐 Frontend: http://localhost:5173
- 🔌 Backend: http://localhost:4000

**In DEV mode** authentication is disabled - you can use the app immediately without OAuth setup.

---

## 🐳 Docker (Recommended)

### Development mode

```bash
docker-compose up
```

### Production mode

```bash
# 1. Copy and configure environment variables
cp env.production.example .env
nano .env

# 2. Start containers
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ⚙️ Production Setup

### 1. OAuth Configuration

<details>
<summary>📘 Google OAuth</summary>

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 Client ID
5. Add Authorized redirect URIs:
   - `http://localhost:4000/auth/google/callback` (for dev)
   - `https://yourdomain.com/auth/google/callback` (for production)
6. Copy Client ID and Client Secret

</details>

<details>
<summary>📙 Yandex OAuth</summary>

1. Go to [Yandex OAuth](https://oauth.yandex.ru/)
2. Create a new application
3. Specify Callback URL:
   - `http://localhost:4000/auth/yandex/callback` (for dev)
   - `https://yourdomain.com/auth/yandex/callback` (for production)
4. Request access to `login:email` and `login:info`
5. Copy Client ID and Client Secret

</details>

### 2. Environment Variables

Create file `/server/.env`:

```bash
cp server/env.example server/.env
```

Fill in the variables:

```env
NODE_ENV=production
PORT=4000
SESSION_SECRET=your-random-secret-key-here-32chars

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

YANDEX_CLIENT_ID=your-yandex-client-id
YANDEX_CLIENT_SECRET=your-yandex-client-secret

FRONTEND_URL=https://yourdomain.com
```

**⚠️ Important:** Use a strong `SESSION_SECRET` (minimum 32 random characters)

### 3. Build and Run

```bash
# Build frontend
cd client && npm run build

# Start production server
cd ../server && npm start
```

---

## 📁 Project Structure

```
as_app/
├── client/                 # React application
│   ├── src/
│   │   ├── pages/         # Pages (Login, Catalog, Category, Practice)
│   │   ├── components/    # Reusable components
│   │   └── utils/         # API client and utilities
│   ├── public/            # Static files
│   └── dist/              # Build output (generated)
├── server/                # Fastify API server
│   ├── server.js          # Main server file
│   ├── auth.js            # OAuth configuration
│   ├── db.js              # SQLite database
│   ├── data/
│   │   └── content.json   # Meditation content
│   └── database.sqlite    # Database (generated)
├── docker-compose.yml     # Dev environment
├── docker-compose.prod.yml # Production environment
└── README.md
```

---

## 🗄️ Database

SQLite database with two tables:

**users**
- `id` - unique ID
- `provider` - OAuth provider (google/yandex)
- `provider_id` - user ID from provider
- `email` - user email
- `created_at` - registration date

**user_progress**
- `id` - unique entry ID
- `user_id` - reference to users.id
- `practice_id` - practice ID
- `listened_at` - date and time of listening

In DEV mode, a dummy `user_id = 1` is used.

---

## 📚 Documentation

- 🚀 [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT.md) - Complete deployment instructions
- 🏗️ [System Architecture](./docs/SYSTEM_ARCHITECTURE.md) - System architecture
- 💾 [Backup Guide](./docs/BACKUP_GUIDE.md) - Database backup
- 🐳 [Docker Deployment](./docs/DOCKER_DEPLOYMENT.md) - Docker deployment details
- 🎵 [Audio Playback Features](./docs/AUDIO_PLAYBACK_FEATURES.md) - Audio player capabilities
- 🚪 [Logout Feature](./docs/LOGOUT_FEATURE.md) - Logout functionality
- 📋 [Release Notes v1.2](./docs/RELEASE_v1.2.md) - What's new in version 1.2
- 📝 [Changelog](./docs/CHANGELOG.md) - Version history

---

## 🔒 Security

- ✅ OAuth 2.0 authentication
- ✅ Secure cookie sessions (httpOnly, secure in production)
- ✅ CORS configured for specific domain
- ✅ `.env` files in `.gitignore`
- ✅ Secrets not stored in code

**Note:** In DEV mode, a fallback is used for `SESSION_SECRET`. In production, always set your own secret key!

---

## 🤝 Contributing

This project was created for portfolio purposes, but forks and suggestions are welcome!

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is distributed under the MIT License. See [LICENSE](./LICENSE) file for details.

**TL;DR:** You can freely use, modify, and distribute this code, even in commercial projects. The author is not responsible for any issues related to the use of the code.

---

## 👤 Author

**Roman Sashin** — IT Developer, Business Automation & App Development

- 🌐 Website: [sashin.net](https://sashin.net)
- 📧 Email: [roman@sashin.net](mailto:roman@sashin.net)
- 💬 Telegram: [@romansashin](https://t.me/romansashin)
- 💼 GitHub: [@romansashin](https://github.com/romansashin)

---

## ⭐️ Acknowledgments

Thank you for your interest in the project! If you found it useful, please give it a ⭐️

---

**Version:** 1.2.0  
**Status:** ✅ Production Ready  
**Last Updated:** January 2026
