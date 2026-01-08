# 🐳 Docker Deployment Guide

## Быстрый старт

### Development (локальная разработка)

```bash
# Запуск dev окружения
docker-compose up

# Frontend: http://localhost:5173
# Backend: http://localhost:4000
```

### Production (продакшн деплой)

```bash
# 1. Создайте .env файл с production настройками
cp .env.production.example .env
# Отредактируйте .env и заполните реальные значения

# 2. Соберите и запустите production версию
docker-compose -f docker-compose.prod.yml up -d

# 3. Проверьте статус
docker-compose -f docker-compose.prod.yml ps

# 4. Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f
```

## 📋 Pre-deployment Checklist

### 1. Environment Variables

Создайте `.env` файл с обязательными переменными:

```bash
NODE_ENV=production
PORT=4000
SESSION_SECRET=<сгенерированный-секрет>
GOOGLE_CLIENT_ID=<ваш-id>
GOOGLE_CLIENT_SECRET=<ваш-секрет>
YANDEX_CLIENT_ID=<ваш-id>
YANDEX_CLIENT_SECRET=<ваш-секрет>
BACKEND_URL=https://api.sashin.net/as-app
FRONTEND_URL=https://sashin.net
```

**Генерация SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. OAuth Configuration

#### Google Cloud Console
1. Перейдите: https://console.cloud.google.com/apis/credentials
2. Добавьте Authorized redirect URI: `https://api.sashin.net/as-app/auth/google/callback`
3. Добавьте домен в Authorized domains: `sashin.net`

#### Yandex OAuth
1. Перейдите: https://oauth.yandex.ru/
2. Добавьте Callback URL: `https://api.sashin.net/as-app/auth/yandex/callback`
3. Права доступа: `login:email`, `login:info`

### 3. Проверка сборки

```bash
# Тестовая сборка (без запуска)
docker build -t as-app:test .

# Проверка размера образа
docker images as-app:test
```

## 🏗️ Docker Architecture

### Development (`docker-compose.yml`)
- **2 контейнера**: client (Vite dev server) + server (Fastify)
- **Hot reload**: изменения в коде применяются автоматически
- **Volumes**: монтируются локальные директории
- **Ports**: 5173 (frontend), 4000 (backend)

### Production (`docker-compose.prod.yml` + `Dockerfile`)
- **1 контейнер**: multi-stage build
- **Stage 1**: сборка React приложения (client)
- **Stage 2**: Node.js сервер раздает API + статику
- **Port**: 4000 (только backend, раздает frontend статику)
- **Healthcheck**: автоматическая проверка работоспособности

## 🔧 Production Dockerfile Breakdown

```dockerfile
# Stage 1: Собираем frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build  # → создает /app/client/dist

# Stage 2: Настраиваем backend
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget  # для healthcheck
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./
COPY --from=client-builder /app/client/dist ./../client/dist
EXPOSE 4000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

## 📊 Production URLs

После деплоя приложение работает так:

- **API**: `https://api.sashin.net/as-app/api/*`
- **OAuth**: `https://api.sashin.net/as-app/auth/*`
- **Frontend**: раздается с бэкенда в production режиме

В клиентском коде автоматически используется:
- **Dev**: `http://localhost:4000` (при `npm run dev`)
- **Prod**: `https://api.sashin.net/as-app` (при сборке)

## 🚀 Deployment Commands

### Первый деплой
```bash
# 1. Клонируйте репозиторий
git clone <repo-url>
cd as_app

# 2. Создайте .env
cp .env.production.example .env
nano .env  # заполните переменные

# 3. Запустите
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Проверьте
curl http://localhost:4000/api/content
```

### Обновление приложения
```bash
# 1. Получите изменения
git pull

# 2. Пересоберите и перезапустите
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f app
```

### Резервное копирование базы данных
```bash
# Копируем БД из контейнера
docker cp <container-id>:/app/database.sqlite ./backup-$(date +%Y%m%d).sqlite

# Или если используется volume (рекомендуется)
cp ./server/database.sqlite ./backup-$(date +%Y%m%d).sqlite
```

### Остановка приложения
```bash
docker-compose -f docker-compose.prod.yml down

# С удалением volumes
docker-compose -f docker-compose.prod.yml down -v
```

## 🔍 Troubleshooting

### Проверка логов
```bash
# Все логи
docker-compose -f docker-compose.prod.yml logs

# Последние 100 строк
docker-compose -f docker-compose.prod.yml logs --tail=100

# В реальном времени
docker-compose -f docker-compose.prod.yml logs -f
```

### Войти в контейнер
```bash
docker-compose -f docker-compose.prod.yml exec app sh
```

### Проверка здоровья
```bash
# Статус healthcheck
docker inspect --format='{{json .State.Health}}' <container-id>

# Вручную проверить endpoint
curl http://localhost:4000/api/content
```

### Пересборка с нуля
```bash
# Удалить все
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a

# Собрать заново
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🔒 Security Checklist

- [ ] `SESSION_SECRET` - криптостойкий рандомный ключ (32+ байт)
- [ ] `.env` файл в `.gitignore`
- [ ] HTTPS настроен (для secure cookies)
- [ ] OAuth redirect URIs правильные
- [ ] CORS настроен только для вашего домена
- [ ] База данных регулярно бэкапится
- [ ] Логи ротируются
- [ ] Контейнер работает не от root (опционально)

## 📈 Performance Optimization

### Размер образа
```bash
# Проверить размер
docker images as-app

# Оптимизация уже включена:
# - Alpine Linux (легкий базовый образ)
# - Multi-stage build (только production зависимости)
# - .dockerignore (исключены node_modules, .git, etc)
```

### Кэширование слоев
Docker кэширует слои. Порядок команд в Dockerfile оптимизирован:
1. Копируем package.json
2. Устанавливаем зависимости (кэшируется)
3. Копируем код (меняется часто)

## 🌐 Reverse Proxy (nginx/traefik)

Пример nginx конфигурации:

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
| `NODE_ENV` | Yes | production | Режим работы |
| `PORT` | No | 4000 | Порт сервера |
| `SESSION_SECRET` | Yes | - | Секрет для сессий |
| `GOOGLE_CLIENT_ID` | Yes | - | Google OAuth ID |
| `GOOGLE_CLIENT_SECRET` | Yes | - | Google OAuth Secret |
| `YANDEX_CLIENT_ID` | Yes | - | Yandex OAuth ID |
| `YANDEX_CLIENT_SECRET` | Yes | - | Yandex OAuth Secret |
| `BACKEND_URL` | Yes | - | Backend URL для OAuth |
| `FRONTEND_URL` | Yes | - | Frontend URL для CORS |

## 🎯 Quick Reference

```bash
# Запуск dev
docker-compose up

# Запуск prod
docker-compose -f docker-compose.prod.yml up -d

# Логи
docker-compose logs -f

# Остановка
docker-compose down

# Пересборка
docker-compose up -d --build

# Вход в контейнер
docker-compose exec app sh

# Бэкап БД
docker cp $(docker-compose ps -q app):/app/database.sqlite ./backup.sqlite
```

## ✅ Deployment Verification

После деплоя проверьте:

1. **Health check**: `curl http://localhost:4000/api/content`
2. **Frontend**: открыть в браузере `http://localhost:4000`
3. **OAuth**: попробовать авторизацию
4. **Database**: проверить создание БД `ls -la server/database.sqlite`
5. **Logs**: нет критических ошибок `docker-compose logs`

Если все проверки пройдены - приложение готово к работе! 🎉


