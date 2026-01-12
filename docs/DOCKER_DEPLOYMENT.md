# 🐳 Docker Deployment Guide

## Quick Start

### Development (local)

```bash
# Start dev environment
docker-compose up

# Frontend: http://localhost:5173
# Backend: http://localhost:4000
```

### Production

```bash
# 1. Create .env file with production settings
cp .env.production.example .env
# Edit .env and fill in real values

# 2. Build and start production version
docker-compose -f docker-compose.prod.yml up -d

# 3. Check status
docker-compose -f docker-compose.prod.yml ps

# 4. Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 📋 Pre-deployment Checklist

### 1. Environment Variables

Create `.env` file with required variables:

```bash
NODE_ENV=production
PORT=4000
SESSION_SECRET=<generated-secret>
GOOGLE_CLIENT_ID=<your-id>
GOOGLE_CLIENT_SECRET=<your-secret>
YANDEX_CLIENT_ID=<your-id>
YANDEX_CLIENT_SECRET=<your-secret>
BACKEND_URL=https://api.sashin.net/as-app
FRONTEND_URL=https://sashin.net
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. OAuth Configuration

#### Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Add Authorized redirect URI: `https://api.sashin.net/as-app/auth/google/callback`
3. Add domain to Authorized domains: `sashin.net`

#### Yandex OAuth
1. Go to: https://oauth.yandex.ru/
2. Add Callback URL: `https://api.sashin.net/as-app/auth/yandex/callback`
3. Permissions: `login:email`, `login:info`

### 3. Build Test

```bash
# Test build (without running)
docker build -t as-app:test .

# Check image size
docker images as-app:test
```

## 🏗️ Docker Architecture

### Development (`docker-compose.yml`)
- **2 containers**: client (Vite dev server) + server (Fastify)
- **Hot reload**: code changes applied automatically
- **Volumes**: local directories mounted
- **Ports**: 5173 (frontend), 4000 (backend)

### Production (`docker-compose.prod.yml` + `Dockerfile`)
- **1 container**: multi-stage build
- **Stage 1**: Build React application (client)
- **Stage 2**: Node.js server serves API + static
- **Port**: 4000 (backend only, serves frontend static)
- **Healthcheck**: automatic health monitoring

## 🔧 Production Dockerfile Breakdown

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build  # → creates /app/client/dist

# Stage 2: Setup backend
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget  # for healthcheck
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./
COPY --from=client-builder /app/client/dist ./../client/dist
EXPOSE 4000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

## 📊 Production URLs

After deployment, application works as follows:

- **API**: `https://api.sashin.net/as-app/api/*`
- **OAuth**: `https://api.sashin.net/as-app/auth/*`
- **Frontend**: served from backend in production mode

In client code, automatically used:
- **Dev**: `http://localhost:4000` (with `npm run dev`)
- **Prod**: `https://api.sashin.net/as-app` (on build)

## 🚀 Deployment Commands

### First Deployment
```bash
# 1. Clone repository
git clone <repo-url>
cd as_app

# 2. Create .env
cp .env.production.example .env
nano .env  # fill in variables

# 3. Start
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Check
curl http://localhost:4000/api/content
```

### Update Application
```bash
# 1. Get changes
git pull

# 2. Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Check logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Database Backup
```bash
# Copy DB from container
docker cp <container-id>:/app/database.sqlite ./backup-$(date +%Y%m%d).sqlite

# Or if using volume (recommended)
cp ./server/database.sqlite ./backup-$(date +%Y%m%d).sqlite
```

### Stop Application
```bash
docker-compose -f docker-compose.prod.yml down

# With volumes removal
docker-compose -f docker-compose.prod.yml down -v
```

## 🔍 Troubleshooting

### Check Logs
```bash
# All logs
docker-compose -f docker-compose.prod.yml logs

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100

# Real-time
docker-compose -f docker-compose.prod.yml logs -f
```

### Enter Container
```bash
docker-compose -f docker-compose.prod.yml exec app sh
```

### Health Check
```bash
# Healthcheck status
docker inspect --format='{{json .State.Health}}' <container-id>

# Manual endpoint check
curl http://localhost:4000/api/content
```

### Rebuild from Scratch
```bash
# Remove everything
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a

# Build again
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🔒 Security Checklist

- [ ] `SESSION_SECRET` - cryptographically strong random key (32+ bytes)
- [ ] `.env` file in `.gitignore`
- [ ] HTTPS configured (for secure cookies)
- [ ] OAuth redirect URIs correct
- [ ] CORS configured for your domain only
- [ ] Database regularly backed up
- [ ] Logs rotated
- [ ] Container not running as root (optional)

## 📈 Performance Optimization

### Image Size
```bash
# Check size
docker images as-app

# Optimization already included:
# - Alpine Linux (lightweight base image)
# - Multi-stage build (only production dependencies)
# - .dockerignore (excluded node_modules, .git, etc)
```

### Layer Caching
Docker caches layers. Command order in Dockerfile optimized:
1. Copy package.json
2. Install dependencies (cached)
3. Copy code (changes frequently)

## 🌐 Reverse Proxy (nginx/traefik)

Example nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name api.sashin.net;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /as-app/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | production | Operating mode |
| `PORT` | No | 4000 | Server port |
| `SESSION_SECRET` | Yes | - | Session secret |
| `GOOGLE_CLIENT_ID` | Yes | - | Google OAuth ID |
| `GOOGLE_CLIENT_SECRET` | Yes | - | Google OAuth Secret |
| `YANDEX_CLIENT_ID` | Yes | - | Yandex OAuth ID |
| `YANDEX_CLIENT_SECRET` | Yes | - | Yandex OAuth Secret |
| `BACKEND_URL` | Yes | - | Backend URL for OAuth |
| `FRONTEND_URL` | Yes | - | Frontend URL for CORS |

## 🎯 Quick Reference

```bash
# Start dev
docker-compose up

# Start prod
docker-compose -f docker-compose.prod.yml up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build

# Enter container
docker-compose exec app sh

# Backup DB
docker cp $(docker-compose ps -q app):/app/database.sqlite ./backup.sqlite
```

## ✅ Deployment Verification

After deployment, verify:

1. **Health check**: `curl http://localhost:4000/api/content`
2. **Frontend**: open in browser `http://localhost:4000`
3. **OAuth**: try authentication
4. **Database**: check DB created `ls -la server/database.sqlite`
5. **Logs**: no critical errors `docker-compose logs`

If all checks pass - application is ready! 🎉
