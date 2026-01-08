#!/bin/bash

# 🚀 Production Deployment Script
# Использование: ./deploy.sh

set -e

echo "🐳 Starting production deployment..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка .env файла
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}Create .env file from .env.production.example${NC}"
    exit 1
fi

# Проверка обязательных переменных
required_vars=("SESSION_SECRET" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "BACKEND_URL" "FRONTEND_URL")
source .env

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var is not set in .env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Остановка старых контейнеров
echo "🛑 Stopping old containers..."
docker-compose -f docker-compose.prod.yml down

# Сборка новых образов
echo "🏗️  Building new images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Запуск контейнеров
echo "🚀 Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

# Ожидание запуска
echo "⏳ Waiting for application to start..."
sleep 10

# Проверка здоровья
echo "🏥 Checking health..."
if curl -f http://localhost:4000/api/content > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is healthy!${NC}"
    echo ""
    echo "📊 Deployment successful!"
    echo "🌐 Application is running on port 4000"
    echo "📝 Check logs: docker-compose -f docker-compose.prod.yml logs -f"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo "Check logs: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi


