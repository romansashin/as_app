# Production Deployment Guide

## 🎯 Подготовка к первому deployment

Этот проект готов к production deployment для малых и средних нагрузок (до 100 пользователей).

### Архитектурные решения

✅ **SQLite** - оптимально для малых нагрузок, простота в управлении  
✅ **Docker** - изолированное окружение, легкий deployment  
✅ **Модульная структура** - легко масштабируется в будущем  
✅ **Нет хардкода** - все конфигурируется через переменные окружения

---

## 📋 Pre-Deployment Checklist

### 1. Конфигурация окружения

```bash
# Скопируйте шаблон конфигурации
cp env.production.example .env

# Отредактируйте .env и заполните:
nano .env
```

**Обязательные параметры:**
- ✅ `SESSION_SECRET` - сгенерируйте криптостойкий ключ
- ✅ `BACKEND_URL` - URL вашего API (например: https://api.yourdomain.com)
- ✅ `FRONTEND_URL` - URL вашего фронтенда (например: https://yourdomain.com)
- ✅ `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` - OAuth credentials
- ✅ `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET` - OAuth credentials
- ✅ `TRUST_PROXY=true` - если за reverse proxy (обязательно!)

**Генерация SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. OAuth провайдеры

#### Google OAuth
1. Откройте: https://console.cloud.google.com/apis/credentials
2. Создайте OAuth 2.0 Client ID
3. Добавьте Authorized redirect URI:
   ```
   https://your-backend-url.com/auth/google/callback
   ```
4. Скопируйте Client ID и Secret в `.env`

#### Yandex OAuth
1. Откройте: https://oauth.yandex.ru/
2. Создайте приложение
3. Добавьте Callback URL:
   ```
   https://your-backend-url.com/auth/yandex/callback
   ```
4. Запросите права: `login:email`, `login:info`
5. Скопируйте ID и Secret в `.env`

### 3. Создайте директории для данных

```bash
# На хост-машине
mkdir -p ./data
mkdir -p ./backups

# Установите правильные права (опционально)
chmod 755 ./data
chmod 755 ./backups
```

---

## 🚀 Deployment Process

### Вариант 1: Docker Compose (Рекомендуется)

```bash
# 1. Соберите и запустите
docker-compose -f docker-compose.prod.yml up -d --build

# 2. Проверьте статус
docker-compose -f docker-compose.prod.yml ps

# 3. Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f app

# 4. Проверьте здоровье
curl http://localhost:4000/health
```

### Вариант 2: Ручная сборка Docker

```bash
# 1. Соберите образ
docker build -t meditation-app:latest .

# 2. Запустите контейнер
docker run -d \
  --name meditation-app \
  -p 4000:4000 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/backups:/app/backups \
  --restart unless-stopped \
  meditation-app:latest

# 3. Проверьте логи
docker logs -f meditation-app
```

---

## 🔧 Reverse Proxy Configuration

### Nginx Proxy Manager (Рекомендуется)

**Настройки Proxy Host:**
- **Domain Names:** yourdomain.com
- **Scheme:** http
- **Forward Hostname/IP:** localhost (или IP сервера)
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
# Передача правильных заголовков
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header Host $host;
```

### Nginx (Прямая настройка)

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

    # Таймауты для long-polling если нужно
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        
        # Важные заголовки для trust proxy
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

### Автоматический backup

Система автоматически создает backup базы данных:
- **Расписание:** Каждое воскресенье в 3:00 AM
- **Локация:** `/app/backups` (проброшено в `./backups` на хосте)
- **Ротация:** Автоматическое удаление бэкапов старше 30 дней
- **Компрессия:** Бэкапы старше 7 дней автоматически сжимаются (gzip)

### Ручной backup

```bash
# Запустить backup вручную
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh

# Проверить бэкапы
ls -lh ./backups/
```

### Восстановление из backup

```bash
# 1. Остановите приложение
docker-compose -f docker-compose.prod.yml stop

# 2. Восстановите базу данных
cp ./backups/database_backup_YYYYMMDD_HHMMSS.sqlite ./data/database.sqlite

# или если бэкап сжат
gunzip -c ./backups/database_backup_YYYYMMDD_HHMMSS.sqlite.gz > ./data/database.sqlite

# 3. Запустите приложение
docker-compose -f docker-compose.prod.yml start
```

### Внешний backup (Рекомендуется)

Поскольку на хост-машине уже работают ежедневные бэкапы, убедитесь что:
- Директория `./data/` включена в backup (база данных)
- Директория `./backups/` включена в backup (недельные дампы)

---

## 📊 Мониторинг и Логи

### Просмотр логов

```bash
# Логи в реальном времени
docker-compose -f docker-compose.prod.yml logs -f app

# Последние 100 строк
docker-compose -f docker-compose.prod.yml logs --tail=100 app

# Логи backup
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) cat /var/log/backup.log
```

### Healthcheck

```bash
# Базовая проверка
curl http://localhost:4000/health

# Проверка API
curl http://localhost:4000/api/content

# Статус контейнера
docker inspect --format='{{json .State.Health}}' <container-id> | jq
```

### Метрики для отслеживания

- **Uptime:** `docker ps` - проверка работы контейнера
- **Disk usage:** `df -h` - свободное место (важно для базы и бэкапов)
- **Memory:** `docker stats` - использование памяти
- **Database size:** `ls -lh ./data/database.sqlite`
- **Backup count:** `ls ./backups/ | wc -l`

---

## 🔐 Security Best Practices

### Применено в проекте

✅ **httpOnly cookies** - защита от XSS  
✅ **Secure flag** - cookies только через HTTPS  
✅ **TRUST_PROXY** - корректная обработка IP за прокси  
✅ **SESSION_SECRET** - из переменных окружения  
✅ **OAuth** - аутентификация через внешние провайдеры  
✅ **Нет хардкода** - все секреты в .env  

### Рекомендуется дополнительно

⚠️ **Firewall:** Откройте только порты 80, 443 (для nginx) и 22 (SSH)  
⚠️ **SSL Certificate:** Используйте Let's Encrypt или платный сертификат  
⚠️ **Regular Updates:** Обновляйте зависимости (`npm audit`)  
⚠️ **Rate Limiting:** Добавьте в nginx или на уровне приложения  
⚠️ **DDoS Protection:** Используйте Cloudflare или аналоги  

---

## 🔄 Update Process

```bash
# 1. Получите последний код
git pull

# 2. Пересоберите образ
docker-compose -f docker-compose.prod.yml build

# 3. Остановите старый контейнер
docker-compose -f docker-compose.prod.yml down

# 4. Запустите новый
docker-compose -f docker-compose.prod.yml up -d

# 5. Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f app
```

### Обновление с даунтаймом

Для критичных обновлений:

```bash
# 1. Создайте backup
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh

# 2. Остановите приложение
docker-compose -f docker-compose.prod.yml down

# 3. Обновите код
git pull

# 4. Пересоберите
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Запустите
docker-compose -f docker-compose.prod.yml up -d

# 6. Проверьте
curl http://localhost:4000/health
```

---

## 🐛 Troubleshooting

### Контейнер не запускается

```bash
# Проверьте логи
docker-compose -f docker-compose.prod.yml logs app

# Проверьте .env
cat .env | grep -v "^#" | grep -v "^$"

# Проверьте порты
netstat -tlnp | grep 4000
```

### База данных не доступна

```bash
# Проверьте права
ls -la ./data/

# Проверьте путь в .env
echo $DATABASE_PATH

# Войдите в контейнер
docker exec -it $(docker-compose -f docker-compose.prod.yml ps -q app) sh
ls -la /app/database.sqlite
```

### OAuth не работает

1. Проверьте redirect URLs в OAuth провайдерах
2. Убедитесь что `BACKEND_URL` совпадает с реальным URL
3. Проверьте что `TRUST_PROXY=true`
4. Проверьте логи: `docker-compose logs | grep OAuth`

### Backup не выполняется

```bash
# Проверьте cron
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) crontab -l

# Проверьте логи backup
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) cat /var/log/backup.log

# Запустите вручную
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh
```

---

## 📈 Масштабирование в будущем

Текущая архитектура позволяет:

### Вынос базы данных

```bash
# 1. Установите PostgreSQL
# 2. Обновите server/db.js для поддержки PostgreSQL
# 3. Обновите DATABASE_PATH на connection string
# 4. Мигрируйте данные из SQLite в PostgreSQL
```

### Горизонтальное масштабирование

```bash
# 1. Вынесите сессии в Redis
# 2. Настройте load balancer (nginx upstream)
# 3. Запустите несколько инстансов приложения
# 4. Вынесите БД на отдельный сервер
```

### Добавление CDN

```bash
# 1. Используйте Cloudflare CDN
# 2. Настройте кэширование статики
# 3. Оптимизируйте аудиофайлы
```

---

## ✅ Post-Deployment Checklist

После успешного deployment проверьте:

- [ ] Приложение доступно по HTTPS
- [ ] OAuth Google работает
- [ ] OAuth Yandex работает
- [ ] Можно создать аккаунт и войти
- [ ] Аудиоплеер проигрывает звук
- [ ] Прогресс сохраняется
- [ ] Logout работает корректно
- [ ] Healthcheck возвращает OK
- [ ] Логи не содержат критических ошибок
- [ ] Backup директория создана и доступна
- [ ] Ручной backup выполняется успешно
- [ ] База данных сохраняется после рестарта

---

## 📞 Support

**Документация:**
- `README.md` - основная документация
- `SYSTEM_ARCHITECTURE.md` - описание архитектуры
- `DOCKER_DEPLOYMENT.md` - детали Docker deployment

**Служба заботы:** [@as_administrator](https://t.me/as_administrator)

---

**Версия:** 1.2.0  
**Дата:** Январь 2026  
**Статус:** ✅ Production Ready

🎉 **Успешного deployment!**
