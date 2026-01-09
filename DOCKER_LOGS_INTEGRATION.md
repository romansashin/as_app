# 🔍 Docker Logs Integration для Backup

## ✅ Что реализовано

Логи backup теперь автоматически транслируются в stdout контейнера и доступны через `docker logs`.

---

## 🎯 Проблема

**Было:** Логи backup записывались только в `/var/log/backup.log` внутри контейнера. Чтобы их посмотреть, нужно было:
```bash
docker exec <container> cat /var/log/backup.log
```

**Недостатки:**
- ❌ Нужен доступ внутрь контейнера
- ❌ Не интегрируется с системами мониторинга
- ❌ Неудобно для централизованного сбора логов

---

## 💡 Решение

**Стало:** Логи backup доступны через стандартный `docker logs`:
```bash
docker-compose logs -f app | grep backup
```

**Преимущества:**
- ✅ Не нужно заходить в контейнер
- ✅ Работает с любой системой мониторинга Docker логов
- ✅ Централизованный сбор через Loki, ELK, Splunk и т.д.
- ✅ Простая настройка алертов

---

## 🔧 Техническая реализация

### Изменения в Dockerfile

Добавлена строка в startup скрипт:

```dockerfile
# Create startup script that runs both cron and the app
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'touch /var/log/backup.log' >> /app/start.sh && \
    echo 'crond -b -l 2' >> /app/start.sh && \
    echo 'tail -f /var/log/backup.log &' >> /app/start.sh && \  # ← НОВОЕ
    echo 'exec npm start' >> /app/start.sh && \
    chmod +x /app/start.sh
```

### Как работает

При запуске контейнера:

1. `touch /var/log/backup.log` - создает файл логов
2. `crond -b -l 2` - запускает cron демон
3. **`tail -f /var/log/backup.log &`** - транслирует логи в stdout
   - `tail -f` читает файл в реальном времени
   - `&` запускает в фоновом режиме
   - stdout попадает в Docker logs
4. `exec npm start` - запускает приложение

### Архитектура

```
┌─────────────────────────────────────────┐
│           Docker Container              │
│                                         │
│  ┌────────────┐                         │
│  │    cron    │                         │
│  │   daemon   │                         │
│  └─────┬──────┘                         │
│        │                                │
│        ├─> /app/scripts/backup-db.sh   │
│        │                                │
│        └─> /var/log/backup.log ◄───┐   │
│                    │                │   │
│                    │            ┌───┴───┐│
│                    └───────────►│ tail  ││
│                                 │  -f   ││
│                                 └───┬───┘│
│                                     │    │
│                                     ▼    │
│                                  stdout  │
└─────────────────────────────────────┼───┘
                                      │
                                      ▼
                              Docker Logs API
                                      │
                                      ▼
                           docker logs / monitoring
```

---

## 📊 Использование

### Базовые команды

**Все логи контейнера:**
```bash
docker-compose -f docker-compose.prod.yml logs -f app
```

**Только backup логи:**
```bash
docker-compose -f docker-compose.prod.yml logs app | grep backup
```

**Real-time мониторинг:**
```bash
docker-compose -f docker-compose.prod.yml logs -f app 2>&1 | grep --line-buffered backup
```

### Примеры вывода

**При запуске контейнера:**
```
app_1  | > server@1.0.0 start
app_1  | > node server.js
app_1  | 
app_1  | {"level":30,"time":1736345678123,"msg":"Server listening on port 4000"}
```

**При выполнении backup:**
```
app_1  | Starting database backup...
app_1  | Source: /app/database.sqlite
app_1  | Target: /app/backups/database_backup_20260109_030001.sqlite
app_1  | ✓ Backup completed successfully: database_backup_20260109_030001.sqlite (2.3M)
app_1  | Rotating old backups (keeping last 30 days)...
app_1  | ✓ Backup rotation completed. Total backups: 4
app_1  | Compressing backups older than 7 days...
app_1  | ✓ Compression completed
app_1  | Backup process finished successfully at Sun Jan  9 03:00:15 UTC 2026
```

**При ошибке backup:**
```
app_1  | ERROR: Database file not found at /app/database.sqlite
```

---

## 🔌 Интеграция с мониторингом

### Grafana Loki

```yaml
# promtail-config.yml
scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
```

Алерт на ошибки backup:
```yaml
# loki-rules.yml
groups:
  - name: backup_alerts
    rules:
      - alert: BackupFailed
        expr: |
          count_over_time({container="meditation-app"} |= "backup" |= "ERROR" [5m]) > 0
        annotations:
          summary: "Database backup failed"
```

### ELK Stack

```json
// Logstash filter
filter {
  if [container][name] == "meditation-app" {
    if "backup" in [message] {
      mutate {
        add_tag => ["backup"]
      }
      if "ERROR" in [message] or "failed" in [message] {
        mutate {
          add_tag => ["backup_error"]
        }
      }
    }
  }
}
```

### Простой скрипт мониторинга

```bash
#!/bin/bash
# monitor-backup.sh - Проверка ошибок backup

LOGS=$(docker-compose -f docker-compose.prod.yml logs --since 24h app 2>&1 | grep -i backup)

if echo "$LOGS" | grep -iq "error\|failed"; then
    echo "⚠️ ALERT: Backup errors detected in last 24h"
    echo "$LOGS" | grep -i "error\|failed"
    # Отправить уведомление (email, telegram, slack и т.д.)
    exit 1
else
    echo "✓ No backup errors in last 24h"
    exit 0
fi
```

Добавить в crontab хоста:
```cron
# Проверка backup каждый день в 10:00
0 10 * * * /path/to/monitor-backup.sh
```

---

## 🎨 Best Practices

### 1. Ротация Docker логов

Чтобы логи не заполнили диск, настройте ротацию:

```yaml
# docker-compose.prod.yml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"      # Максимум 10MB на файл
        max-file: "3"        # Держать 3 файла (30MB всего)
```

### 2. Фильтрация логов

Создайте алиасы для удобства:

```bash
# ~/.bashrc или ~/.zshrc
alias backup-logs='docker-compose -f docker-compose.prod.yml logs app | grep backup'
alias backup-errors='docker-compose -f docker-compose.prod.yml logs app | grep -i "backup.*error"'
alias backup-today='docker-compose -f docker-compose.prod.yml logs --since $(date +%Y-%m-%d) app | grep backup'
```

### 3. Структурированные логи

Скрипт backup уже выводит структурированные сообщения:
- `Starting database backup...` - начало
- `✓ Backup completed successfully` - успех
- `ERROR:` - ошибка
- `Backup process finished` - завершение

Это позволяет легко парсить логи в системах мониторинга.

---

## 🔍 Troubleshooting

### Проблема: Не вижу backup логи в docker logs

**Проверка 1: tail работает?**
```bash
docker exec <container> ps aux | grep tail
# Должен быть процесс: tail -f /var/log/backup.log
```

**Проверка 2: Файл существует?**
```bash
docker exec <container> ls -la /var/log/backup.log
```

**Проверка 3: Запустите backup вручную**
```bash
docker exec <container> /app/scripts/backup-db.sh
# Сразу проверьте docker logs
docker logs <container> --tail=50
```

### Проблема: Слишком много логов

**Решение 1: Ротация Docker логов**
```yaml
logging:
  options:
    max-size: "5m"
    max-file: "2"
```

**Решение 2: Фильтровать только нужное**
```bash
docker logs <container> 2>&1 | grep -E "backup|ERROR|WARN"
```

---

## 📈 Мониторинг метрик

Помимо логов, рекомендуется мониторить:

### Размер backup файлов

```bash
#!/bin/bash
# backup-metrics.sh

BACKUP_DIR="./backups"
TOTAL_SIZE=$(du -sb "$BACKUP_DIR" | cut -f1)
FILE_COUNT=$(find "$BACKUP_DIR" -name "*.sqlite*" | wc -l)
LATEST=$(ls -t "$BACKUP_DIR"/database_backup_*.sqlite* 2>/dev/null | head -1)
LATEST_SIZE=$(stat -f%z "$LATEST" 2>/dev/null || echo 0)

echo "backup_total_size_bytes $TOTAL_SIZE"
echo "backup_file_count $FILE_COUNT"
echo "backup_latest_size_bytes $LATEST_SIZE"
```

Интеграция с Prometheus Node Exporter:
```bash
# Экспорт в textfile collector
/path/to/backup-metrics.sh > /var/lib/node_exporter/textfile_collector/backup.prom
```

---

## ✅ Итог

### Что получили

✅ **Доступность** - логи backup через `docker logs`  
✅ **Интеграция** - работает с любой системой мониторинга  
✅ **Централизация** - все логи в одном месте  
✅ **Алерты** - легко настроить уведомления  
✅ **Удобство** - не нужно заходить в контейнер  

### Обратная совместимость

Файл `/var/log/backup.log` **сохраняется** внутри контейнера:
- Можно читать напрямую если нужно
- История backup сохраняется
- Ничего не сломается в существующих скриптах

### Рекомендации

1. ✅ Используйте `docker logs` для мониторинга
2. ✅ Настройте ротацию Docker логов
3. ✅ Интегрируйте с системой мониторинга
4. ✅ Настройте алерты на ошибки backup
5. ✅ Регулярно проверяйте метрики backup

---

**Обновлено:** 9 января 2026  
**Версия:** 1.0  
**Статус:** ✅ Production Ready

📚 **См. также:**
- `CRON_SETUP_EXPLANATION.md` - настройка cron
- `BACKUP_GUIDE.md` - руководство по backup
- `PRODUCTION_DEPLOYMENT.md` - deployment инструкции
