# Database Backup Guide

## Overview

The application includes automatic SQLite database backup system.

## Automatic Backup

### Schedule

- **Frequency:** Every Sunday at 3:00 AM
- **Mechanism:** Cron job inside Docker container
- **Location:** `/app/backups` (container) → `./backups/` (host)

### What Happens Automatically

1. ✅ Full database copy created
2. ✅ Timestamp naming: `database_backup_YYYYMMDD_HHMMSS.sqlite`
3. ✅ Backups older than 30 days deleted
4. ✅ Backups older than 7 days compressed (gzip)
5. ✅ Logging to `/var/log/backup.log`

### Configuration

In `.env` file:

```env
# Host directory for backup storage
BACKUP_VOLUME_PATH=./backups

# Backup retention days
BACKUP_RETENTION_DAYS=30
```

## Manual Backup

### Run Backup Manually

```bash
# Via docker-compose
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh

# Or directly by container name
docker exec meditation-app /app/scripts/backup-db.sh
```

### Check Backups

```bash
# List all backups
ls -lh ./backups/

# Latest backup
ls -lt ./backups/ | head -2

# Count backups
find ./backups/ -name "database_backup_*.sqlite*" | wc -l
```

### View Backup Logs

**Via docker logs (recommended):**
```bash
# All container logs (including backup)
docker-compose -f docker-compose.prod.yml logs -f app

# Only backup logs
docker-compose -f docker-compose.prod.yml logs app | grep -i backup
```

**Direct from file:**
```bash
# All log file
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) cat /var/log/backup.log

# Last 50 lines
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) tail -50 /var/log/backup.log
```

## Restore from Backup

### Step 1: Stop Application

```bash
docker-compose -f docker-compose.prod.yml stop
```

### Step 2: Find Needed Backup

```bash
# Show all backups with dates
ls -lh ./backups/

# Example:
# database_backup_20260105_030001.sqlite       (uncompressed)
# database_backup_20251229_030001.sqlite.gz    (compressed)
```

### Step 3: Restore Database

**If backup uncompressed:**
```bash
cp ./backups/database_backup_20260105_030001.sqlite ./data/database.sqlite
```

**If backup compressed (gzip):**
```bash
gunzip -c ./backups/database_backup_20251229_030001.sqlite.gz > ./data/database.sqlite
```

### Step 4: Start Application

```bash
docker-compose -f docker-compose.prod.yml start

# Check everything works
docker-compose -f docker-compose.prod.yml logs -f app
curl http://localhost:4000/health
```

## Backup Verification

### Validate Backup File

```bash
# Check SQLite database integrity
sqlite3 ./backups/database_backup_20260105_030001.sqlite "PRAGMA integrity_check;"
# Expected result: ok

# Check tables
sqlite3 ./backups/database_backup_20260105_030001.sqlite ".tables"
# Expected result: users  user_progress

# Count users
sqlite3 ./backups/database_backup_20260105_030001.sqlite "SELECT COUNT(*) FROM users;"
```

## External Backup (Host Machine)

### Recommended Strategy

Include in host backups:
1. `./data/database.sqlite` - current database
2. `./backups/` - weekly application dumps

### Example rsync Backup

```bash
#!/bin/bash
# Backup script for host machine

BACKUP_DEST="/path/to/external/backup"
APP_DIR="/path/to/as_app"

# Backup database
rsync -av --delete \
  "$APP_DIR/data/" \
  "$BACKUP_DEST/data/"

# Backup weekly dumps
rsync -av \
  "$APP_DIR/backups/" \
  "$BACKUP_DEST/backups/"

echo "Backup completed at $(date)"
```

## Backup Monitoring

### Check Backup is Working

```bash
# Check cron running in container
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ps aux | grep cron

# Check crontab
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) crontab -l

# Expected output:
# 0 3 * * 0 /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

## Troubleshooting

### Backup Not Created

**Check 1: Cron working?**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ps aux | grep crond
```

**Check 2: Script executable?**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ls -la /app/scripts/backup-db.sh
```

**Check 3: Directory permissions?**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ls -la /app/backups
```

**Check 4: Run manually:**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh
```

### Backups Too Large

```bash
# Check database size
ls -lh ./data/database.sqlite

# Clean old data if needed (SQL)
sqlite3 ./data/database.sqlite "DELETE FROM user_progress WHERE completed_at < date('now', '-365 days');"
sqlite3 ./data/database.sqlite "VACUUM;"
```

## Best Practices

1. ✅ **Test restoration** regularly
2. ✅ **Store backups off-server** (external backup)
3. ✅ **Monitor backup success**
4. ✅ **Document restore process**
5. ✅ **Use versioning** (timestamp in names)
6. ✅ **Verify backup integrity**
7. ✅ **Automate alerts** for issues

---

**Version:** 1.0  
**Last Update:** January 2026
