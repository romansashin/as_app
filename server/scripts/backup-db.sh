#!/bin/sh
# Weekly SQLite Database Backup Script
# This script creates a backup of the SQLite database and rotates old backups

set -e

# Configuration from environment variables or defaults
DB_PATH="${DATABASE_PATH:-/app/database.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/database_backup_$BACKUP_DATE.sqlite"

# Check if source database exists
if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database file not found at $DB_PATH"
    exit 1
fi

# Create backup using SQLite's .backup command
echo "Starting database backup..."
echo "Source: $DB_PATH"
echo "Target: $BACKUP_FILE"

# Use sqlite3 command to create a proper backup
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✓ Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "ERROR: Backup file was not created"
    exit 1
fi

# Rotate old backups - keep only last N days
echo "Rotating old backups (keeping last $BACKUP_RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "database_backup_*.sqlite" -type f -mtime +$BACKUP_RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "database_backup_*.sqlite" -type f | wc -l)
echo "✓ Backup rotation completed. Total backups: $BACKUP_COUNT"

# Optional: Compress old backups (older than 7 days)
if command -v gzip >/dev/null 2>&1; then
    echo "Compressing backups older than 7 days..."
    find "$BACKUP_DIR" -name "database_backup_*.sqlite" -type f -mtime +7 ! -name "*.gz" -exec gzip {} \;
    echo "✓ Compression completed"
fi

echo "Backup process finished successfully at $(date)"
