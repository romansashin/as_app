# Database Backup Guide

## 🎯 Обзор

Приложение включает автоматическую систему резервного копирования базы данных SQLite.

---

## 📅 Автоматический Backup

### Расписание

- **Частота:** Каждое воскресенье в 3:00 AM
- **Механизм:** Cron job внутри Docker контейнера
- **Локация:** `/app/backups` (внутри контейнера) → `./backups/` (на хосте)

### Что происходит автоматически

1. ✅ Создание полной копии базы данных
2. ✅ Именование с timestamp: `database_backup_YYYYMMDD_HHMMSS.sqlite`
3. ✅ Удаление бэкапов старше 30 дней
4. ✅ Сжатие бэкапов старше 7 дней (gzip)
5. ✅ Логирование в `/var/log/backup.log`

### Конфигурация

В `.env` файле:

```env
# Директория на хосте для хранения бэкапов
BACKUP_VOLUME_PATH=./backups

# Количество дней хранения бэкапов
BACKUP_RETENTION_DAYS=30
```

---

## 🔧 Ручной Backup

### Запуск backup вручную

```bash
# Через docker-compose
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh

# Или напрямую по имени контейнера
docker exec meditation-app /app/scripts/backup-db.sh
```

### Проверка бэкапов

```bash
# Список всех бэкапов
ls -lh ./backups/

# Последний бэкап
ls -lt ./backups/ | head -2

# Подсчет бэкапов
find ./backups/ -name "database_backup_*.sqlite*" | wc -l
```

### Просмотр логов backup

```bash
# Логи последнего выполнения
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) cat /var/log/backup.log

# Или с tail
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) tail -50 /var/log/backup.log
```

---

## 🔄 Восстановление из Backup

### Шаг 1: Остановите приложение

```bash
docker-compose -f docker-compose.prod.yml stop
```

### Шаг 2: Найдите нужный backup

```bash
# Показать все бэкапы с датами
ls -lh ./backups/

# Пример:
# database_backup_20260105_030001.sqlite       (несжатый)
# database_backup_20251229_030001.sqlite.gz    (сжатый)
```

### Шаг 3: Восстановите базу данных

**Если backup несжатый:**
```bash
cp ./backups/database_backup_20260105_030001.sqlite ./data/database.sqlite
```

**Если backup сжатый (gzip):**
```bash
gunzip -c ./backups/database_backup_20251229_030001.sqlite.gz > ./data/database.sqlite
```

### Шаг 4: Запустите приложение

```bash
docker-compose -f docker-compose.prod.yml start

# Проверьте что всё работает
docker-compose -f docker-compose.prod.yml logs -f app
curl http://localhost:4000/health
```

---

## 🔍 Проверка Backup

### Валидация backup файла

```bash
# Проверка целостности SQLite базы
sqlite3 ./backups/database_backup_20260105_030001.sqlite "PRAGMA integrity_check;"
# Ожидаемый результат: ok

# Проверка таблиц
sqlite3 ./backups/database_backup_20260105_030001.sqlite ".tables"
# Ожидаемый результат: users  user_progress

# Подсчет пользователей
sqlite3 ./backups/database_backup_20260105_030001.sqlite "SELECT COUNT(*) FROM users;"
```

### Тестовое восстановление

Рекомендуется периодически проверять что бэкапы рабочие:

```bash
# 1. Создайте тестовую копию
cp ./backups/database_backup_LATEST.sqlite /tmp/test.sqlite

# 2. Проверьте целостность
sqlite3 /tmp/test.sqlite "PRAGMA integrity_check;"

# 3. Проверьте данные
sqlite3 /tmp/test.sqlite "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM user_progress;"

# 4. Удалите тест
rm /tmp/test.sqlite
```

---

## 💾 Внешний Backup (Хост-машина)

### Рекомендуемая стратегия

Поскольку на хост-машине уже работают ежедневные бэкапы:

1. **Включите в backup хоста:**
   - `./data/database.sqlite` - текущая база данных
   - `./backups/` - недельные дампы приложения

2. **Частота backup хоста:** Ежедневно
3. **Retention:** По политике хоста

### Пример rsync backup

```bash
#!/bin/bash
# Backup скрипт для хост-машины

BACKUP_DEST="/path/to/external/backup"
APP_DIR="/path/to/as_app"

# Backup базы данных
rsync -av --delete \
  "$APP_DIR/data/" \
  "$BACKUP_DEST/data/"

# Backup недельных дампов
rsync -av \
  "$APP_DIR/backups/" \
  "$BACKUP_DEST/backups/"

echo "Backup completed at $(date)"
```

---

## 📊 Мониторинг Backup

### Проверка что backup работает

```bash
# Проверить что cron запущен в контейнере
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ps aux | grep cron

# Проверить crontab
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) crontab -l

# Ожидаемый вывод:
# 0 3 * * 0 /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### Алерты (опционально)

Настройте мониторинг:

```bash
#!/bin/bash
# Скрипт для проверки свежести бэкапов

BACKUP_DIR="./backups"
MAX_AGE_DAYS=8  # Если бэкап старше 8 дней - алерт

LATEST_BACKUP=$(find "$BACKUP_DIR" -name "database_backup_*.sqlite*" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)
BACKUP_AGE_DAYS=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 86400 ))

if [ $BACKUP_AGE_DAYS -gt $MAX_AGE_DAYS ]; then
    echo "⚠️  ALERT: Last backup is $BACKUP_AGE_DAYS days old!"
    # Отправить уведомление (email, telegram и т.д.)
else
    echo "✓ Backup is fresh ($BACKUP_AGE_DAYS days old)"
fi
```

---

## 🔐 Безопасность Backup

### Шифрование backup (опционально)

Для дополнительной безопасности:

```bash
# Зашифровать backup
gpg --symmetric --cipher-algo AES256 ./backups/database_backup_20260105_030001.sqlite

# Расшифровать при необходимости
gpg --decrypt ./backups/database_backup_20260105_030001.sqlite.gpg > restored.sqlite
```

### Права доступа

```bash
# Установите правильные права на директорию backups
chmod 750 ./backups/
chown -R yourusername:yourgroup ./backups/

# Бэкапы должны быть читаемы только владельцем
chmod 640 ./backups/*.sqlite*
```

---

## ⚙️ Настройка Backup

### Изменение расписания

Чтобы изменить расписание backup, отредактируйте `Dockerfile`:

```dockerfile
# Текущее: каждое воскресенье в 3:00 AM
# 0 3 * * 0 /app/scripts/backup-db.sh

# Примеры:
# Каждый день в 2:00 AM:
RUN echo "0 2 * * * /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# Два раза в неделю (вторник и пятница в 3:00 AM):
RUN echo "0 3 * * 2,5 /app/scripts/backup-db.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
```

После изменения пересоберите образ:
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Изменение retention

В `.env`:
```env
# Хранить бэкапы 60 дней вместо 30
BACKUP_RETENTION_DAYS=60
```

---

## 🆘 Troubleshooting

### Backup не создается

**Проверка 1: Cron работает?**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ps aux | grep crond
```

**Проверка 2: Скрипт исполняемый?**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ls -la /app/scripts/backup-db.sh
```

**Проверка 3: Права на директорию?**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) ls -la /app/backups
```

**Проверка 4: Запустите вручную:**
```bash
docker exec $(docker-compose -f docker-compose.prod.yml ps -q app) /app/scripts/backup-db.sh
```

### Backup слишком большие

```bash
# Проверьте размер базы
ls -lh ./data/database.sqlite

# Очистите старые данные если нужно (SQL)
sqlite3 ./data/database.sqlite "DELETE FROM user_progress WHERE completed_at < date('now', '-365 days');"
sqlite3 ./data/database.sqlite "VACUUM;"
```

### Нет места на диске

```bash
# Проверьте использование диска
df -h

# Удалите старые сжатые бэкапы вручную
find ./backups/ -name "*.sqlite.gz" -mtime +60 -delete
```

---

## 📝 Best Practices

1. ✅ **Тестируйте восстановление** регулярно
2. ✅ **Храните бэкапы вне сервера** (external backup)
3. ✅ **Мониторьте успешность** backup jobs
4. ✅ **Документируйте процесс** восстановления
5. ✅ **Используйте версионирование** (timestamp в именах)
6. ✅ **Проверяйте целостность** backup файлов
7. ✅ **Автоматизируйте алерты** при проблемах

---

## 📞 Дополнительная информация

- **Полная документация:** `PRODUCTION_DEPLOYMENT.md`
- **Архитектура системы:** `SYSTEM_ARCHITECTURE.md`
- **Служба заботы:** [@as_administrator](https://t.me/as_administrator)

---

**Версия:** 1.0  
**Последнее обновление:** Январь 2026
