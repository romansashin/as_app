# ⚠️ ВАЖНО: Этот Dockerfile НЕ используется в production
# Production использует корневой /Dockerfile (multi-stage build)
# Этот файл сохранен для возможных тестов изолированного сервера

# Stage 1: Client Build
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY ../client/package*.json ./
RUN npm install
COPY ../client/ ./
RUN npm run build

# Stage 2: Server Setup
FROM node:20-alpine
WORKDIR /app

# Install system dependencies
# wget: for healthcheck
# sqlite: for database backup
# dcron: for scheduled backups
RUN apk add --no-cache wget sqlite dcron

# Copy server files
COPY package*.json ./
RUN npm install --production

COPY . .

# Copy client dist from builder stage
COPY --from=client-builder /app/client/dist ./../client/dist

# Create backups directory
RUN mkdir -p /app/backups

# Copy backup script and make it executable
COPY scripts/backup-db.sh /app/scripts/backup-db.sh
RUN chmod +x /app/scripts/backup-db.sh

# Setup weekly cron job (every Sunday at 3 AM)
RUN echo "0 3 * * 0 /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Port from environment variable (default 4000)
ARG PORT=4000
EXPOSE ${PORT}

ENV NODE_ENV=production

# Create startup script that runs both cron and the app
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo '# Create backup log file if it does not exist' >> /app/start.sh && \
    echo 'touch /var/log/backup.log' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start cron daemon' >> /app/start.sh && \
    echo 'crond -b -l 2' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Tail backup logs to stdout (for docker logs)' >> /app/start.sh && \
    echo 'tail -f /var/log/backup.log &' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start the application' >> /app/start.sh && \
    echo 'exec npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
