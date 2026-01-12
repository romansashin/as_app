# Production Deployment Guide

## 🎯 Preparing for First Deployment

This project is ready for production deployment for small to medium loads (up to 100 users).

### Architectural Decisions

✅ **SQLite** - optimal for small loads, easy to manage  
✅ **Docker** - isolated environment, easy deployment  
✅ **Modular structure** - easily scalable in the future  
✅ **No hardcoding** - everything configured via environment variables

---

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration

```bash
# Copy configuration template
cp env.production.example .env

# Edit .env and fill in:
nano .env
```

**Required parameters:**
- ✅ `SESSION_SECRET` - generate cryptographically strong key
- ✅ `BACKEND_URL` - your API URL (e.g., https://api.yourdomain.com)
- ✅ `FRONTEND_URL` - your frontend URL (e.g., https://yourdomain.com)
- ✅ `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - OAuth credentials
- ✅ `YANDEX_CLIENT_ID` and `YANDEX_CLIENT_SECRET` - OAuth credentials
- ✅ `TRUST_PROXY=true` - if behind reverse proxy (required!)

**Generating SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. OAuth Providers

#### Google OAuth
1. Open: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add Authorized redirect URI:
   ```
   https://your-backend-url.com/auth/google/callback
   ```
4. Copy Client ID and Secret to `.env`

#### Yandex OAuth
1. Open: https://oauth.yandex.ru/
2. Create application
3. Add Callback URL:
   ```
   https://your-backend-url.com/auth/yandex/callback
   ```
4. Request permissions: `login:email`, `login:info`
5. Copy ID and Secret to `.env`

### 3. Create Data Directories

```bash
# On host machine
mkdir -p ./data
mkdir -p ./backups

# Set proper permissions (optional)
chmod 755 ./data
chmod 755 ./backups
```

---

## 🚀 Deployment Process

### Option 1: Docker Compose (Recommended)

```bash
# 1. Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# 2. Check status
docker-compose -f docker-compose.prod.yml ps

# 3. Check logs
docker-compose -f docker-compose.prod.yml logs -f app

# 4. Check health
curl http://localhost:4000/health
```

### Option 2: Manual Docker Build

```bash
# 1. Build image
docker build -t meditation-app:latest .

# 2. Run container
docker run -d \
  --name meditation-app \
  -p 4000:4000 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  --restart unless-stopped \
  meditation-app:latest

# 3. Check logs
docker logs -f meditation-app
```

---

## 🔧 Reverse Proxy Configuration

### Nginx Proxy Manager (Recommended)

**Proxy Host Settings:**
- **Domain Names:** yourdomain.com
- **Scheme:** http
- **Forward Hostname/IP:** localhost (or server IP)
- **Forward Port:** 4000
- **Cache Assets:** ✅
- **Block Common Exploits:** ✅
- **Websockets Support:** ✅

**SSL:**
- **Force SSL:** ✅
- **HTTP/2 Support:** ✅
- **HSTS Enabled:** ✅

**Advanced:**
```nginx
# Forward correct headers
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header Host $host;
```

### Nginx (Direct Configuration)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Timeouts for long-polling if needed
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        
        # Important headers for trust proxy
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 💾 Backup System

### Automatic Backup

System automatically creates database backups:
- **Schedule:** Every Sunday at 3:00 AM
- **Location:** `/app/backups` (mapped to `./backups` on host)
- **Rotation:** Automatic removal of backups older than 30 days
- **Compression:** Backups older than 7 days are automatically compressed (gzip)

### Manual Backup

```bash
# Run backup manually
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh

# Check backups
ls -lh ./backups/
```

### Restore from Backup

```bash
# 1. Stop application
docker-compose -f docker-compose.prod.yml stop

# 2. Restore database
cp ./backups/database_backup_YYYYMMDD_HHMMSS.sqlite ./data/database.sqlite

# or if backup is compressed
gunzip -c ./backups/database_backup_YYYYMMDD_HHMMSS.sqlite.gz > ./data/database.sqlite

# 3. Start application
docker-compose -f docker-compose.prod.yml start
```

### External Backup (Recommended)

Since daily backups are already running on the host machine, ensure that:
- Directory `./data/` is included in backup (database)
- Directory `./backups/` is included in backup (weekly dumps)

---

## 📊 Monitoring and Logs

### View Logs

```bash
# Real-time logs
docker-compose -f docker-compose.prod.yml logs -f app

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 app

# Backup logs
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) cat /var/log/backup.log
```

### Healthcheck

```bash
# Basic check
curl http://localhost:4000/health

# API check
curl http://localhost:4000/api/content

# Container status
docker inspect --format='{{json .State.Health}}' <container-id> | jq
```

### Metrics to Track

- **Uptime:** `docker ps` - check container is running
- **Disk usage:** `df -h` - free space (important for database and backups)
- **Memory:** `docker stats` - memory usage
- **Database size:** `ls -lh ./data/database.sqlite`
- **Backup count:** `ls ./backups/ | wc -l`

---

## 🔐 Security Best Practices

### Implemented in Project

✅ **httpOnly cookies** - XSS protection  
✅ **Secure flag** - cookies only via HTTPS  
✅ **TRUST_PROXY** - correct IP handling behind proxy  
✅ **SESSION_SECRET** - from environment variables  
✅ **OAuth** - authentication via external providers  
✅ **No hardcoding** - all secrets in .env  

### Additional Recommendations

⚠️ **Firewall:** Open only ports 80, 443 (for nginx) and 22 (SSH)  
⚠️ **SSL Certificate:** Use Let's Encrypt or paid certificate  
⚠️ **Regular Updates:** Update dependencies (`npm audit`)  
⚠️ **Rate Limiting:** Add in nginx or at application level  
⚠️ **DDoS Protection:** Use Cloudflare or similar  

---

## 🔄 Update Process

```bash
# 1. Get latest code
git pull

# 2. Rebuild image
docker-compose -f docker-compose.prod.yml build

# 3. Stop old container
docker-compose -f docker-compose.prod.yml down

# 4. Start new
docker-compose -f docker-compose.prod.yml up -d

# 5. Check logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Update with Downtime

For critical updates:

```bash
# 1. Create backup
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh

# 2. Stop application
docker-compose -f docker-compose.prod.yml down

# 3. Update code
git pull

# 4. Rebuild
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Start
docker-compose -f docker-compose.prod.yml up -d

# 6. Check
curl http://localhost:4000/health
```

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check .env
cat .env | grep -v "^#" | grep -v "^$"

# Check ports
netstat -tlnp | grep 4000
```

### Database Not Accessible

```bash
# Check permissions
ls -la ./data/

# Check path in .env
echo $DATABASE_PATH

# Enter container
docker exec -it $(docker-compose -f docker-compose.prod.yml ps -q app) sh
ls -la /app/database.sqlite
```

### OAuth Not Working

1. Check redirect URLs in OAuth providers
2. Ensure `BACKEND_URL` matches actual URL
3. Verify `TRUST_PROXY=true`
4. Check logs: `docker-compose logs | grep OAuth`

### Backup Not Running

```bash
# Check cron
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) crontab -l

# Check backup logs
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) cat /var/log/backup.log

# Run manually
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh
```

---

## 📈 Future Scaling

Current architecture allows:

### Database Migration

```bash
# 1. Install PostgreSQL
# 2. Update server/db.js to support PostgreSQL
# 3. Update DATABASE_PATH to connection string
# 4. Migrate data from SQLite to PostgreSQL
```

### Horizontal Scaling

```bash
# 1. Move sessions to Redis
# 2. Configure load balancer (nginx upstream)
# 3. Run multiple application instances
# 4. Move DB to separate server
```

### Adding CDN

```bash
# 1. Use Cloudflare CDN
# 2. Configure static caching
# 3. Optimize audio files
```

---

## ✅ Post-Deployment Checklist

After successful deployment, verify:

- [ ] Application accessible via HTTPS
- [ ] OAuth Google works
- [ ] OAuth Yandex works
- [ ] Can create account and login
- [ ] Audio player plays sound
- [ ] Progress is saved
- [ ] Logout works correctly
- [ ] Healthcheck returns OK
- [ ] Logs contain no critical errors
- [ ] Backup directory created and accessible
- [ ] Manual backup executes successfully
- [ ] Database persists after restart

---

## 📞 Support

**Documentation:**
- `README.md` - main documentation
- `SYSTEM_ARCHITECTURE.md` - architecture description
- `DOCKER_DEPLOYMENT.md` - Docker deployment details

**Contact:**
- Telegram: [@romansashin](https://t.me/romansashin)
- Email: [roman@sashin.net](mailto:roman@sashin.net)
- Website: [sashin.net](https://sashin.net)

---

**Version:** 1.2.0  
**Date:** January 2026  
**Status:** ✅ Production Ready

🎉 **Happy Deployment!**
