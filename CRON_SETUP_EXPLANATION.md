# 🕐 Настройка Cron для автоматических backup

## ✅ Текущее состояние: Cron УЖЕ настроен!

Автоматические backup **уже работают** в production контейнере.

---

## 📋 Где настроен Cron

### Используемый Dockerfile

**docker-compose.prod.yml** использует **корневой Dockerfile** (`/Dockerfile`), а **НЕ** `server/Dockerfile`.

```yaml
# docker-compose.prod.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile  # ← Корневой файл
```

### Настройка в Dockerfile

В корневом `Dockerfile` (строки 13-50):

```dockerfile
# Установка системных зависимостей
RUN apk add --no-cache wget sqlite dcron

# Копирование backup скрипта
COPY server/scripts/backup-db.sh /app/scripts/backup-db.sh
RUN chmod +x /app/scripts/backup-db.sh

# Настройка cron job (каждое воскресенье в 3:00 AM)
RUN echo "0 3 * * 0 /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Startup скрипт (запускает cron + приложение)
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'crond -b -l 2' >> /app/start.sh && \
    echo 'exec npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
```

---

## 🔧 Как это работает

### 1. При сборке образа

**Установка dcron:**
```dockerfile
RUN apk add --no-cache dcron
```
- Устанавливает dcron (Dillon's Cron) для Alpine Linux
- Легковесный и надежный cron демон

**Создание crontab:**
```dockerfile
RUN echo "0 3 * * 0 /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
```
- Создает crontab для root пользователя
- Расписание: `0 3 * * 0` = каждое воскресенье в 3:00 AM
- Логи: перенаправляются в `/var/log/backup.log`

**Startup скрипт:**
```dockerfile
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'crond -b -l 2' >> /app/start.sh && \
    echo 'exec npm start' >> /app/start.sh && \
    chmod +x /app/start.sh
```
Создает `/app/start.sh`:
```sh
#!/bin/sh
crond -b -l 2      # Запускает cron в фоне с логированием
exec npm start      # Запускает Node.js приложение
```

### 2. При запуске контейнера

```dockerfile
CMD ["/app/start.sh"]
```

Выполняется:
1. **crond -b -l 2** - запускает cron демон в background
   - `-b` = background mode
   - `-l 2` = log level 2 (errors + warnings)
2. **exec npm start** - запускает Node.js приложение
   - `exec` заменяет процесс shell на npm, делая его PID 1

---

## 📅 Расписание Cron

### Текущее расписание

```
0 3 * * 0 /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

**Формат:** `минута час день месяц день_недели команда`

- `0` - минута 0 (начало часа)
- `3` - час 3 (3:00 AM)
- `*` - любой день месяца
- `*` - любой месяц
- `0` - день недели 0 (воскресенье)

**Итого:** Каждое воскресенье в 3:00 утра

### Примеры других расписаний

Если хотите изменить, отредактируйте строку 36 в `Dockerfile`:

```dockerfile
# Каждый день в 2:00 AM
RUN echo "0 2 * * * /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Два раза в неделю (вторник и пятница в 3:00 AM)
RUN echo "0 3 * * 2,5 /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Каждые 12 часов
RUN echo "0 */12 * * * /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Первое число каждого месяца в 1:00 AM
RUN echo "0 1 1 * * /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
```

---

## ✅ Проверка что Cron работает

### 1. Проверить что cron запущен

```bash
# Проверить процессы в контейнере
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ps aux

# Должны увидеть:
# PID   USER     COMMAND
# 1     root     npm start
# XX    root     crond -b -l 2
```

### 2. Проверить crontab

```bash
# Посмотреть настроенные задачи
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) crontab -l

# Вывод:
# 0 3 * * 0 /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### 3. Проверить логи cron

```bash
# Логи выполнения backup
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) cat /var/log/backup.log

# Если backup еще не выполнялся, файл может не существовать
# Запустите вручную:
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh
```

### 4. Системные логи cron

```bash
# Alpine Linux cron логи (если есть)
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) cat /var/log/cron.log
```

---

## 🔄 Альтернатива: node-cron (если бы не использовали системный cron)

Вы упомянули возможность использования `node-cron`. Вот как это выглядело бы:

### Установка

```bash
cd server
npm install node-cron
```

### Интеграция в server.js

```javascript
// server/server.js
import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// После инициализации Fastify

// Backup job - каждое воскресенье в 3:00 AM
cron.schedule('0 3 * * 0', async () => {
  fastify.log.info('Starting scheduled database backup...');
  
  try {
    const { stdout, stderr } = await execAsync('/app/scripts/backup-db.sh');
    
    if (stdout) fastify.log.info(`Backup stdout: ${stdout}`);
    if (stderr) fastify.log.error(`Backup stderr: ${stderr}`);
    
    fastify.log.info('Scheduled backup completed successfully');
  } catch (error) {
    fastify.log.error('Scheduled backup failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Europe/Moscow" // или ваша timezone
});

fastify.log.info('Backup scheduler initialized');
```

### Плюсы node-cron
- ✅ Полностью JavaScript - нет зависимости от системного cron
- ✅ Логи идут в основной поток приложения
- ✅ Легче отлаживать
- ✅ Можно динамически менять расписание
- ✅ Не нужен отдельный демон

### Минусы node-cron
- ❌ Backup не выполнится если Node.js процесс упал
- ❌ Требует чтобы приложение всегда было запущено
- ❌ Менее надежен для критичных задач
- ❌ Дополнительная зависимость в package.json

---

## 🎯 Почему выбран системный cron (dcron)

### Преимущества текущего решения

1. **Надежность**
   - Cron работает независимо от Node.js приложения
   - Backup выполнится даже если приложение перезагружается
   - Проверенное решение, используется десятилетиями

2. **Простота**
   - Стандартный подход для Unix/Linux систем
   - Знаком всем DevOps инженерам
   - Не требует изменений в коде приложения

3. **Изоляция**
   - Backup процесс не влияет на производительность приложения
   - Отдельные логи для backup операций
   - Можно управлять независимо

4. **Легковесность**
   - dcron очень маленький (< 100KB)
   - Минимальное использование ресурсов
   - Оптимально для Alpine Linux

---

## 🔧 Отладка

### Cron не запускается

**Проблема:** `ps aux` не показывает crond

**Решение:**
```bash
# Войдите в контейнер
docker exec -it $(docker-compose -f docker-compose.prod.yml ps -q app) sh

# Запустите cron вручную
crond -b -l 2

# Проверьте
ps aux | grep cron
```

### Backup не выполняется

**Проблема:** Cron запущен, но backup не создается

**Решение 1: Проверить права**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ls -la /app/scripts/backup-db.sh
# Должно быть: -rwxr-xr-x (executable)
```

**Решение 2: Запустить вручную**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh
# Смотрите ошибки
```

**Решение 3: Проверить crontab**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) crontab -l
# Должна быть одна строка с backup-db.sh
```

### Логи не создаются

**Проблема:** `/var/log/backup.log` не существует

**Причина:** Backup еще ни разу не запускался или ошибка в cron

**Решение:**
```bash
# Создайте файл вручную
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) touch /var/log/backup.log

# Запустите backup
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh

# Проверьте логи
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) cat /var/log/backup.log
```

---

## 📝 Рекомендации

### 1. Мониторинг backup

Создайте скрипт для проверки свежести последнего backup:

```bash
#!/bin/bash
# check-backup-freshness.sh

BACKUP_DIR="./backups"
MAX_AGE_DAYS=8  # Алерт если backup старше 8 дней

LATEST=$(find "$BACKUP_DIR" -name "database_backup_*.sqlite*" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST" ]; then
    echo "⚠️ ALERT: No backups found!"
    exit 1
fi

AGE_DAYS=$(( ($(date +%s) - $(stat -c %Y "$LATEST")) / 86400 ))

if [ $AGE_DAYS -gt $MAX_AGE_DAYS ]; then
    echo "⚠️ ALERT: Last backup is $AGE_DAYS days old!"
    exit 1
else
    echo "✓ Backup is fresh ($AGE_DAYS days old)"
    exit 0
fi
```

### 2. Тестирование после deployment

После первого deployment:

```bash
# 1. Проверьте что cron работает
docker exec <container> ps aux | grep crond

# 2. Запустите backup вручную
docker exec <container> /app/scripts/backup-db.sh

# 3. Проверьте результат
ls -lh ./backups/

# 4. Дождитесь следующего воскресенья и проверьте автоматический backup
```

### 3. Изменение расписания

Если нужно изменить расписание:

1. Отредактируйте строку 36 в `Dockerfile`
2. Пересоберите образ: `docker-compose -f docker-compose.prod.yml build`
3. Перезапустите: `docker-compose -f docker-compose.prod.yml up -d`

---

## ✅ Итог

### Текущее состояние: ✅ Работает

- ✅ dcron установлен
- ✅ Crontab настроен (каждое воскресенье 3:00 AM)
- ✅ Startup скрипт запускает cron + приложение
- ✅ Логи перенаправляются в `/var/log/backup.log`
- ✅ Backup файлы создаются в `/app/backups` (проброшено на хост)

### Альтернатива node-cron: ❌ Не рекомендуется

Системный cron более надежен для критичных задач типа backup.

### Что делать: ✅ Ничего

Система уже настроена и готова к работе!

---

**Файлы для справки:**
- `Dockerfile` (строки 13-50) - основная настройка
- `server/scripts/backup-db.sh` - скрипт backup
- `docker-compose.prod.yml` - использует корневой Dockerfile

**Документация:**
- `BACKUP_GUIDE.md` - полное руководство по backup
- `PRODUCTION_DEPLOYMENT.md` - deployment инструкции
