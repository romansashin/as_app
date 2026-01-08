# Карта архитектуры системы

**Проект:** Приложение для медитации (as_app)  
**Версия:** 1.2.0  
**Дата составления:** 8 января 2026  
**Назначение:** Внешний аудит архитектуры для профессионального ревью

---

## 1. Обзор проекта

### Название и назначение
Веб-приложение для прослушивания гипнопрактик и медитаций с отслеживанием прогресса.

### Основная проблема
Предоставление пользователям доступа к аудио-практикам для медитации и релаксации с возможностью отслеживания своего прогресса, включая фоновое воспроизведение аудио при выключенном экране устройства.

### Целевые пользователи
- Индивидуальные пользователи, заинтересованные в медитации, гипнопрактиках и улучшении сна
- Доступ через веб-браузер на десктопных и мобильных устройствах
- Аутентификация через Google или Yandex OAuth

---

## 2. Технологический стек

### Backend
- **Язык и runtime:** Node.js (v20+, модули ES6)
- **Веб-фреймворк:** Fastify v4.24.3
- **База данных:** SQLite v5.1.6
- **Аутентификация:** 
  - Passport.js через @fastify/passport v2.4.0
  - passport-google-oauth20 v2.0.0
  - passport-yandex v0.0.4
- **Сессии:** @fastify/secure-session v5.1.0 (httpOnly cookies)
- **CORS:** @fastify/cors v8.4.0
- **Статические файлы:** @fastify/static v6.12.0
- **Переменные окружения:** dotenv v16.3.1

### Frontend
- **Язык и фреймворк:** React v18.2.0
- **Сборщик:** Vite v5.0.8
- **Роутинг:** react-router-dom v6.21.1
- **Стилизация:** Tailwind CSS v3.4.0
- **Markdown:** react-markdown v9.0.1

### Инфраструктура
- **Контейнеризация:** Docker (multi-stage build), Docker Compose
- **Базовый образ:** node:20-alpine
- **Процесс сборки:** 
  - Development: 2 контейнера (client + server с hot-reload)
  - Production: 1 контейнер (Fastify раздает API + статику React)

### Внешние зависимости
- **OAuth провайдеры:** Google OAuth 2.0, Yandex OAuth
- **Аудио-плеер:** Playerjs (интеграция через iframe)
- **Хранилище аудио:** Внешний CDN (Selectel Storage)

---

## 3. Высокоуровневая архитектура

### Основные компоненты

#### 3.1 Client (React SPA)
**Ответственность:**
- Пользовательский интерфейс
- Роутинг на стороне клиента (SPA)
- Управление состоянием (локальное, React hooks)
- Интеграция с аудиоплеером
- Wake Lock API для предотвращения сна устройства
- Media Session API для управления с экрана блокировки

**Основные модули:**
- `pages/` - страницы приложения (LoginPage, CatalogPage, CategoryPage, PracticePage)
- `components/` - переиспользуемые компоненты (Header, Footer, Layout, Card, Button, AudioPlayer)
- `utils/api.js` - API клиент для взаимодействия с backend

#### 3.2 Server (Fastify)
**Ответственность:**
- REST API для контента и прогресса
- OAuth аутентификация (Google, Yandex)
- Управление сессиями
- Работа с базой данных SQLite
- В production: раздача статических файлов React

**Основные модули:**
- `server.js` - главный файл сервера, маршрутизация
- `auth.js` - OAuth стратегии и маршруты
- `db.js` - операции с базой данных
- `data/content.json` - статическое хранилище контента

#### 3.3 Database (SQLite)
**Ответственность:**
- Хранение пользователей
- Хранение истории прослушиваний
- Связь пользователей с их прогрессом

### Взаимодействие компонентов

**Development режим:**
```
Browser → Client (Vite :5173) → Server (Fastify :4000) → SQLite
                                      ↓
                                OAuth Providers
```

**Production режим:**
```
Browser → Server (Fastify :4000) → SQLite
          ├── Static: React SPA
          ├── /api/*: REST API
          └── /auth/*: OAuth
                ↓
          OAuth Providers
```

**Коммуникация:**
- Client → Server: HTTP/HTTPS (fetch API с credentials: 'include')
- Server → Database: Синхронные SQL запросы через sqlite3
- Server → OAuth: HTTPS redirects и callbacks

---

## 4. Модели данных и состояние

### 4.1 Схема базы данных (SQLite)

#### Таблица `users`
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,           -- 'google' или 'yandex'
  provider_id TEXT NOT NULL,        -- уникальный ID от OAuth провайдера
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_id)
)
```

**Назначение:** Хранение аутентифицированных пользователей. Связка `provider + provider_id` уникальна, что предотвращает дубликаты при повторных входах.

#### Таблица `user_progress`
```sql
CREATE TABLE user_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  practice_id TEXT NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)

CREATE INDEX idx_user_progress_user_practice 
  ON user_progress(user_id, practice_id)
```

**Назначение:** История прослушиваний. Каждое прослушивание записывается отдельной строкой (нет UNIQUE constraint), что позволяет отслеживать количество прослушиваний.

### 4.2 Структуры данных контента

#### JSON файл `data/content.json`
```json
{
  "categories": [
    {
      "id": "c1",
      "title": "Сон",
      "image_url": "PLACEHOLDER"
    }
  ],
  "practices": [
    {
      "id": "p1",
      "category_id": "c1",
      "title": "Засыпание",
      "audio_url": "https://...",
      "audio_title": "Вводная лекция",
      "description_md": "# Засыпание\n\n..."
    }
  ]
}
```

**Особенности:**
- Хранится как статический JSON файл на сервере
- Связь через `category_id`
- Markdown-описание для гибкого форматирования

### 4.3 Управление состоянием

#### Client-side state
- **React hooks:** `useState`, `useEffect` для локального состояния компонентов
- **Нет глобального state management** (Redux, Zustand и т.п.)
- **Session state:** Информация о пользователе загружается при инициализации из `/api/me`

**Пример состояния в PracticePage:**
- `practice` - текущая практика
- `listenCount` - количество прослушиваний
- `playbackTime` - текущее время воспроизведения
- `sessionRecordedRef` - флаг записи прослушивания (useRef для предотвращения дубликатов)
- `wakeLockRef` - ссылка на активный Wake Lock

#### Server-side state
- **Сессии:** Хранятся в зашифрованных httpOnly cookies через @fastify/secure-session
- **User state:** Сериализация/десериализация через Passport.js
- **Database connections:** Синглтон SQLite connection

**DEV режим:** Если OAuth credentials отсутствуют, используется фиктивный `user_id = 1` для всех операций.

---

## 5. API интерфейс

### 5.1 HTTP endpoints

#### Контент
**GET /api/content**
- Назначение: Получение всех категорий и практик
- Авторизация: Не требуется
- Ответ: `{ categories: [...], practices: [...] }`

#### Прогресс пользователя
**GET /api/progress**
- Назначение: Получение статистики прослушиваний текущего пользователя
- Авторизация: DEV режим - user_id=1, Production - из сессии
- Ответ: `{ "p1": 5, "p2": 3 }` (practice_id → count)

**POST /api/progress**
- Назначение: Запись нового прослушивания
- Авторизация: DEV режим - user_id=1, Production - из сессии
- Body: `{ practice_id: "p1" }`
- Ответ: `{ success: true, id: 123 }`

#### Аутентификация
**GET /api/me**
- Назначение: Получение информации о текущем пользователе
- Авторизация: Обязательна (session)
- Ответ: `{ user: { id, provider, email, created_at } }`
- Ошибка: 401 если не авторизован

**GET /auth/google**
- Назначение: Инициация OAuth flow через Google
- Редирект: На Google consent screen

**GET /auth/google/callback**
- Назначение: Callback после успешной авторизации Google
- Редирект: На FRONTEND_URL (главную страницу)

**GET /auth/yandex** и **GET /auth/yandex/callback**
- Аналогично Google OAuth

**POST /auth/logout**
- Назначение: Завершение сессии
- Действия: `request.logout()` + `request.session.delete()`
- Ответ: `{ success: true }`

#### Утилиты
**GET /health**
- Назначение: Healthcheck для мониторинга
- Ответ: `{ status: "ok" }`

### 5.2 Механизм аутентификации

**Стратегия:**
1. OAuth 2.0 через Google или Yandex
2. После успешной авторизации создается/находится пользователь в БД по `provider_id`
3. `user.id` сохраняется в сессии (Passport serialization)
4. Сессия хранится в зашифрованном httpOnly cookie
5. При последующих запросах сессия автоматически десериализуется

**Защита:**
- httpOnly cookies (защита от XSS)
- secure flag в production (только HTTPS)
- CORS ограничен FRONTEND_URL
- SESSION_SECRET для шифрования сессий

**DEV режим:**
- Если OAuth credentials отсутствуют, авторизация не требуется
- Все операции выполняются от имени `user_id = 1`

### 5.3 Ключевые контракты

**Запись прослушивания (POST /api/progress):**
```javascript
// Request
{ practice_id: "p1" }

// Success Response (201)
{ success: true, id: 456 }

// Error Response (400)
{ error: "practice_id is required" }

// Error Response (500)
{ error: "Failed to add progress", details: "..." }
```

**Получение прогресса (GET /api/progress):**
```javascript
// Response (200)
{
  "p1": 5,   // practice_id: количество прослушиваний
  "p2": 3,
  "p3": 1
}

// Пустой прогресс
{}
```

---

## 6. Процессы и потоки

### 6.1 Поток аутентификации (Production)

1. Пользователь открывает приложение
2. Frontend запрашивает GET /api/me
3. Если 401 → редирект на /login
4. Пользователь выбирает Google/Yandex
5. Клик → GET /auth/google (или /auth/yandex)
6. Редирект на OAuth provider
7. Пользователь подтверждает доступ
8. OAuth provider → GET /auth/google/callback с authorization code
9. Backend обменивает code на access token
10. Backend извлекает profile (provider_id, email)
11. Backend находит или создает пользователя в БД
12. Backend сохраняет user.id в сессии
13. Редирект на FRONTEND_URL
14. Frontend снова запрашивает GET /api/me → успех
15. Приложение доступно

### 6.2 Поток прослушивания практики

1. Пользователь открывает /practice/:id
2. Frontend загружает:
   - GET /api/content (практика и категория)
   - GET /api/progress (текущий счетчик)
3. Отображается аудиоплеер (Playerjs iframe)
4. Пользователь нажимает Play
5. Frontend:
   - Запрашивает Wake Lock (если поддерживается)
   - Настраивает Media Session API
   - Запускает таймер на 30 секунд
6. Через 30 секунд:
   - POST /api/progress { practice_id }
   - Backend записывает в user_progress
7. Frontend обновляет счетчик:
   - GET /api/progress
   - Обновляет UI
8. При уходе со страницы Wake Lock освобождается

### 6.3 Поток logout

1. Пользователь кликает "Выйти" в Header
2. Frontend → POST /auth/logout
3. Backend:
   - `request.logout()` (Passport)
   - `request.session.delete()` (удаление сессии)
4. Backend → { success: true }
5. Frontend:
   - DEV режим: `window.location.reload()`
   - Production: `navigate('/login')`

**Важно:** Прогресс привязан к user_id в БД, а не к сессии, поэтому сохраняется после logout.

### 6.4 Поток данных от действия до персистентности

**Пример: Запись прослушивания**

```
User Action (Play) 
  → Client State (playEventFiredRef = true)
  → Timer (30 sec)
  → Client API call (POST /api/progress)
  → Server Handler (/api/progress)
  → Auth Check (request.user?.id || 1)
  → DB Operation (INSERT INTO user_progress)
  → Response ({ success: true, id })
  → Client Refresh (GET /api/progress)
  → Client State Update (setListenCount)
  → UI Re-render (показать новый счетчик)
```

---

## 7. Архитектура развертывания

### 7.1 Development режим

**Компоненты:**
- Client: Vite dev server на порту 5173
- Server: Fastify на порту 4000
- Database: SQLite файл в server/database.sqlite

**Запуск:**
```bash
npm run dev  # Одновременно запускает client и server через concurrently
```

**API URLs:**
- Client использует: `http://localhost:4000`
- OAuth callbacks: `http://localhost:4000/auth/*/callback`
- CORS origin: `http://localhost:5173`

**Hot Reload:** Vite HMR для client, nodemon не используется (ручной перезапуск сервера).

### 7.2 Production режим

**Компоненты:**
- Единый Fastify сервер на порту 4000
- Раздает статические файлы React из client/dist
- Обрабатывает API и Auth маршруты
- SQLite база данных

**Процесс сборки:**
```bash
# 1. Сборка frontend
cd client && npm run build  # → client/dist/

# 2. Запуск сервера
cd server && NODE_ENV=production npm start
```

**API URLs:**
- Client использует: `https://api.sashin.net/as-app`
- OAuth callbacks: `https://api.sashin.net/as-app/auth/*/callback`
- CORS origin: `https://sashin.net`

**Static Serving:**
- Все API запросы: `/api/*`
- Все Auth запросы: `/auth/*`
- Все остальное: React SPA (SPA fallback через setNotFoundHandler)

### 7.3 Docker Development

**docker-compose.yml:**
- 2 сервиса: client и app (server)
- Volumes: монтирование локальных директорий для hot reload
- Ports: 5173 (client), 4000 (server)

### 7.4 Docker Production

**Dockerfile (multi-stage):**

**Stage 1 (client-builder):**
- Базовый образ: node:20-alpine
- Копирование client/
- `npm install` + `npm run build`
- Результат: client/dist/

**Stage 2 (final):**
- Базовый образ: node:20-alpine
- Копирование server/
- `npm install --production`
- Копирование client/dist из stage 1
- Expose 4000
- CMD: `npm start`

**docker-compose.prod.yml:**
- 1 сервис: app
- Volume: ./server/database.sqlite (персистентность данных)
- Healthcheck: wget на /api/content
- Restart policy: unless-stopped

### 7.5 Конфигурация окружения

**Переменные окружения (server/.env):**
```
NODE_ENV=production
PORT=4000
SESSION_SECRET=<32+ байт hex>
GOOGLE_CLIENT_ID=<от Google Cloud Console>
GOOGLE_CLIENT_SECRET=<от Google Cloud Console>
YANDEX_CLIENT_ID=<от Yandex OAuth>
YANDEX_CLIENT_SECRET=<от Yandex OAuth>
BACKEND_URL=https://api.sashin.net/as-app
FRONTEND_URL=https://sashin.net
```

**Переменные окружения (client - build time):**
```
VITE_API_URL=https://api.sashin.net/as-app (опционально, есть дефолт)
```

**Автоматическое переключение:**
- `import.meta.env.DEV` (Vite) определяет dev/prod режим
- В dev: API_URL = localhost:4000
- В prod: API_URL = https://api.sashin.net/as-app

---

## 8. Внешние зависимости

### 8.1 OAuth провайдеры

**Google OAuth 2.0**
- **URL:** https://console.cloud.google.com/apis/credentials
- **Назначение:** Аутентификация пользователей через Google аккаунты
- **Scope:** profile, email
- **Данные:** provider_id (Google User ID), email
- **Callback URL:** ${BACKEND_URL}/auth/google/callback
- **Условие работы:** GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET должны быть настроены

**Yandex OAuth**
- **URL:** https://oauth.yandex.ru/
- **Назначение:** Аутентификация пользователей через Yandex аккаунты
- **Permissions:** login:email, login:info
- **Данные:** provider_id (Yandex User ID), email
- **Callback URL:** ${BACKEND_URL}/auth/yandex/callback
- **Условие работы:** YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET должны быть настроены

### 8.2 Аудио CDN

**Selectel Storage**
- **URL:** https://cb8a68a7-0a51-4e51-a5a3-31d034ec73fe.selstorage.ru/
- **Назначение:** Хранение и раздача аудиофайлов для практик
- **Формат:** M4A (audio/mp4)
- **Интеграция:** Прямые ссылки в content.json

### 8.3 Внешние библиотеки с особым назначением

**Playerjs**
- **Файлы:** client/public/playerjs.js, playerjs.html
- **Назначение:** Кроссбраузерный аудиоплеер с расширенными возможностями
- **Интеграция:** Через iframe в компоненте AudioPlayer
- **Особенности:** 
  - Поддержка различных форматов
  - Работа с CDN
  - События play/pause/timeupdate

**Wake Lock API**
- **Браузерное API:** navigator.wakeLock
- **Назначение:** Предотвращение автоматического засыпания устройства
- **Поддержка:** Chrome/Edge (Desktop+Android), Safari (iOS 16.4+, macOS)
- **Использование:** Активируется при нажатии Play, освобождается при уходе

**Media Session API**
- **Браузерное API:** navigator.mediaSession
- **Назначение:** Управление воспроизведением с экрана блокировки
- **Поддержка:** Chrome/Edge (Desktop+Android), Safari (iOS+macOS), Firefox (Desktop)
- **Метаданные:** Название практики, категория, artwork

---

## 9. Неявные предположения и ограничения

### 9.1 Условия работы системы

**Обязательные:**
- Node.js 16+ с поддержкой ES6 modules
- Доступ к файловой системе для SQLite
- Для Production: HTTPS (для secure cookies)
- Для OAuth: Корректные CLIENT_ID и CLIENT_SECRET
- Внешний CDN с аудиофайлами доступен

**Необязательные:**
- OAuth credentials (без них работает DEV режим)
- Reverse proxy (nginx/traefik) для маршрутизации в production

### 9.2 Требования браузера/платформы

**Минимальные требования:**
- Современный браузер с поддержкой ES6
- JavaScript включен
- Cookies включены (для сессий)

**Для полной функциональности:**
- **Wake Lock API:** Chrome/Edge 84+, Safari 16.4+
- **Media Session API:** Chrome/Edge 73+, Safari 14+, Firefox 82+
- **Iframe поддержка:** Не блокируется (для Playerjs)

**Мобильные:**
- iOS 16.4+ для полной поддержки фонового воспроизведения
- iOS < 16.4 - частичная поддержка (только Media Session)
- Android с Chrome - полная поддержка

### 9.3 Неочевидные связности

**1. Режим работы определяется наличием OAuth credentials**
- Если GOOGLE_CLIENT_ID или YANDEX_CLIENT_ID отсутствуют → DEV режим
- Все пользователи в DEV режиме работают под user_id = 1
- Header не показывается в DEV режиме

**2. Прогресс привязан к user_id, не к сессии**
- Logout не удаляет прогресс
- Прогресс доступен с любого устройства после входа
- Смена аккаунта показывает другой прогресс

**3. OAuth callbacks должны использовать BACKEND_URL**
- BACKEND_URL ≠ FRONTEND_URL в типичном сценарии
- API и OAuth живут на поддомене (api.sashin.net)
- Frontend живет на главном домене (sashin.net)

**4. Запись прослушивания происходит ровно один раз за сессию**
- Используется `playEventFiredRef` для отслеживания
- Промотка аудио не создает новые записи
- Только первое нажатие Play запускает 30-секундный таймер

**5. Production сервер раздает статику**
- В production frontend НЕ отдельный сервер
- Fastify раздает client/dist/ как статические файлы
- SPA fallback через setNotFoundHandler

### 9.4 Ограничения масштабируемости

**SQLite:**
- Однопоточная запись
- Не подходит для высоконагруженных систем (тысячи concurrent writes)
- Нет распределенного масштабирования

**Сессии:**
- Хранятся в памяти процесса (через secure-session)
- При рестарте сервера сессии теряются
- Невозможно горизонтальное масштабирование без внешнего session store

**Контент:**
- Хранится как статический JSON файл
- Требует рестарта сервера для обновления
- Нет CMS для управления контентом

**Отсутствие rate limiting:**
- API не защищено от abuse
- Рекомендуется добавить в production

---

## 10. Контекст эволюции

### 10.1 Основные версии

**v1.0 (23 декабря 2025)**
- Базовая функциональность: каталог, практики, аудиоплеер
- OAuth через Google и Yandex
- SQLite для хранения прогресса
- Счетчик прослушиваний (запись после 30 сек)
- Docker support
- DEV режим без авторизации

**v1.1 (24 декабря 2025)**
- UI улучшения (навигация, склонение слов, цвета)
- Wake Lock API для предотвращения сна устройства
- Визуальный таймер с обратным отсчетом
- Footer со ссылкой на службу заботы
- Улучшенная документация

**v1.2 (24 декабря 2025)**
- **Фоновое воспроизведение:** Wake Lock + Media Session API
- **Функция Logout:** Полноценная система выхода с сохранением прогресса
- **DEV Mode Header:** Header показывается в DEV режиме с визуальным отличием
- Исправление бага с Header
- Обширная документация (11 новых файлов)

### 10.2 Значимые изменения архитектуры

**Удаление UNIQUE constraint из user_progress (v1.0):**
- **Было:** UNIQUE(user_id, practice_id) - одна запись на практику
- **Стало:** Множественные записи разрешены
- **Причина:** Необходимость отслеживать количество прослушиваний

**Добавление фонового воспроизведения (v1.2):**
- Интеграция Wake Lock API в PracticePage
- Настройка Media Session API с метаданными
- Обработка visibilitychange для восстановления Wake Lock
- HTML5 audio атрибуты: playsinline, preload="auto"

**Вынос logout роута из setupAuthRoutes (v1.2):**
- **Было:** logout только при наличии OAuth
- **Стало:** logout доступен всегда (даже в DEV)
- **Причина:** Унификация поведения для DEV и Production

**Автоматическое определение режима работы:**
- Проверка наличия OAuth credentials
- Условная регистрация стратегий и роутов
- Fallback на user_id = 1 в отсутствие авторизации

### 10.3 Архитектурные добавления

**Header компонент (v1.2):**
- Не существовал в v1.0-1.1
- Добавлен для отображения user info и кнопки logout
- Автоматическое скрытие в DEV режиме (обновлено)
- Показывается на всех страницах кроме /login

**Layout компонент:**
- Добавлена интеграция Header
- Структура: Header → Content (flex-grow) → Footer

**API URLs конфигурация:**
- Разделение BACKEND_URL и FRONTEND_URL
- OAuth callbacks теперь используют BACKEND_URL
- Автоматическое переключение dev/prod в client/src/utils/api.js

### 10.4 Паттерны технического долга

**Контент как статический JSON:**
- Преимущество: Простота
- Недостаток: Нет динамического управления
- Вероятная эволюция: Переход на CMS или admin panel

**Отсутствие тестов:**
- Ни unit, ни integration тестов не обнаружено
- Тестирование ручное (описано в TESTING_*.md)

**SQLite для production:**
- Адекватно для малых нагрузок
- Ограничение: Не масштабируется горизонтально
- Вероятная эволюция: PostgreSQL или MySQL при росте

**In-memory сессии:**
- Простота реализации через secure-session
- Ограничение: Потеря сессий при рестарте
- Вероятная эволюция: Redis session store

---

## Заключение

Система представляет собой типичный full-stack JavaScript монолит с четким разделением на client и server. Архитектура ориентирована на простоту развертывания и поддержки для небольших и средних нагрузок. Использование SQLite и отсутствие внешних зависимостей (кроме OAuth провайдеров и CDN) минимизирует operational complexity.

Основные сильные стороны:
- Автоматическое переключение между DEV и Production режимами
- Полноценная OAuth интеграция с двумя провайдерами
- Современные веб-API (Wake Lock, Media Session) для улучшения UX
- Docker-ready архитектура
- Хорошая документированность

Основные ограничения:
- Масштабируемость (SQLite, in-memory sessions)
- Отсутствие тестов
- Статический контент без CMS
- Нет rate limiting и продвинутого мониторинга

Система находится в состоянии production-ready для малых и средних аудиторий с потенциалом постепенной эволюции в более масштабируемую архитектуру при необходимости.

---

**Версия документа:** 1.0  
**Составлен:** 8 января 2026  
**Источники:** Codebase as_app v1.2.0 + документация в корневой директории
