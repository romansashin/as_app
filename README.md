# 🧘 Приложение для медитации

> Веб-приложение для прослушивания гипнопрактик и медитаций с отслеживанием прогресса

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![Last Updated](https://img.shields.io/badge/updated-January%202026-green.svg)

[🇬🇧 English version](#english-version)

---

## 📖 О проекте

Полнофункциональное веб-приложение для прослушивания медитаций и гипнопрактик с возможностью отслеживания личного прогресса. Поддерживает фоновое воспроизведение, управление с экрана блокировки и OAuth авторизацию через Google/Yandex.

### ✨ Основные возможности

- 🎵 **Аудиоплеер с визуальным таймером** - красивый интерфейс с прогресс-баром
- 📱 **Фоновое воспроизведение** - аудио продолжает играть даже с выключенным экраном (Wake Lock API + Media Session API)
- 📊 **Отслеживание прогресса** - автоматический подсчет прослушиваний (засчитывается после 30 секунд)
- 🔐 **OAuth авторизация** - вход через Google или Yandex
- 🌐 **DEV режим** - работа без авторизации для разработки и демо
- 💾 **Персональные данные** - прогресс привязан к аккаунту и доступен с любого устройства
- 🎨 **Современный UI** - адаптивный дизайн на Tailwind CSS

### 🛠 Технологический стек

#### Backend
- **Node.js** - серверная платформа
- **Fastify** - быстрый веб-фреймворк
- **SQLite** - легковесная база данных
- **Passport.js** - OAuth авторизация (Google, Yandex)

#### Frontend
- **React 18** - UI библиотека
- **Vite** - быстрая сборка и dev-сервер
- **Tailwind CSS** - utility-first CSS фреймворк
- **Wake Lock API** - предотвращение засыпания устройства
- **Media Session API** - управление с экрана блокировки

#### DevOps
- **Docker** - контейнеризация
- **Docker Compose** - оркестрация сервисов
- **nginx** - reverse proxy (в production)

---

## 🚀 Быстрый старт

### Предварительные требования

- Node.js >= 18.x
- npm >= 9.x
- (опционально) Docker и Docker Compose

### Установка и запуск

1. **Клонируйте репозиторий**

```bash
git clone https://github.com/romansashin/as_app.git
cd as_app
```

2. **Установите зависимости**

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

3. **Запустите в DEV режиме**

```bash
npm run dev
```

Приложение будет доступно:
- 🌐 Frontend: http://localhost:5173
- 🔌 Backend: http://localhost:4000

**В DEV режиме авторизация отключена** - можно сразу пользоваться приложением без настройки OAuth.

---

## 🐳 Docker (рекомендуется)

### Development режим

```bash
docker-compose up
```

### Production режим

```bash
# 1. Скопируйте и настройте переменные окружения
cp env.production.example .env
nano .env

# 2. Запустите контейнеры
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ⚙️ Production настройка

### 1. Настройка OAuth

<details>
<summary>📘 Google OAuth</summary>

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Создайте OAuth 2.0 Client ID
5. Добавьте Authorized redirect URIs:
   - `http://localhost:4000/auth/google/callback` (для dev)
   - `https://yourdomain.com/auth/google/callback` (для production)
6. Скопируйте Client ID и Client Secret

</details>

<details>
<summary>📙 Yandex OAuth</summary>

1. Перейдите в [Yandex OAuth](https://oauth.yandex.ru/)
2. Создайте новое приложение
3. Укажите Callback URL:
   - `http://localhost:4000/auth/yandex/callback` (для dev)
   - `https://yourdomain.com/auth/yandex/callback` (для production)
4. Получите доступ к `login:email` и `login:info`
5. Скопируйте Client ID и Client Secret

</details>

### 2. Переменные окружения

Создайте файл `/server/.env`:

```bash
cp server/env.example server/.env
```

Заполните переменные:

```env
NODE_ENV=production
PORT=4000
SESSION_SECRET=your-random-secret-key-here-32chars

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

YANDEX_CLIENT_ID=your-yandex-client-id
YANDEX_CLIENT_SECRET=your-yandex-client-secret

FRONTEND_URL=https://yourdomain.com
```

**⚠️ Важно:** Используйте надежный `SESSION_SECRET` (минимум 32 случайных символа)

### 3. Сборка и запуск

```bash
# Сборка frontend
cd client && npm run build

# Запуск production сервера
cd ../server && npm start
```

---

## 📁 Структура проекта

```
as_app/
├── client/                 # React приложение
│   ├── src/
│   │   ├── pages/         # Страницы (Login, Catalog, Category, Practice)
│   │   ├── components/    # Переиспользуемые компоненты
│   │   └── utils/         # API клиент и утилиты
│   ├── public/            # Статические файлы
│   └── dist/              # Сборка (генерируется)
├── server/                # Fastify API сервер
│   ├── server.js          # Главный файл сервера
│   ├── auth.js            # OAuth конфигурация
│   ├── db.js              # SQLite база данных
│   ├── data/
│   │   └── content.json   # Контент медитаций
│   └── database.sqlite    # База данных (генерируется)
├── docker-compose.yml     # Dev окружение
├── docker-compose.prod.yml # Production окружение
└── README.md
```

---

## 🗄️ База данных

SQLite база с двумя таблицами:

**users**
- `id` - уникальный ID
- `provider` - OAuth провайдер (google/yandex)
- `provider_id` - ID пользователя у провайдера
- `email` - email пользователя
- `created_at` - дата регистрации

**user_progress**
- `id` - уникальный ID записи
- `user_id` - ссылка на users.id
- `practice_id` - ID практики
- `listened_at` - дата и время прослушивания

В DEV режиме используется фиктивный `user_id = 1`.

---

## 📚 Документация

- 🚀 [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md) - Полная инструкция по deployment
- 🏗️ [System Architecture](./SYSTEM_ARCHITECTURE.md) - Архитектура системы
- 💾 [Backup Guide](./BACKUP_GUIDE.md) - Резервное копирование базы данных
- 🐳 [Docker Deployment](./DOCKER_DEPLOYMENT.md) - Детали Docker развертывания
- 🎵 [Audio Playback Features](./AUDIO_PLAYBACK_FEATURES.md) - Возможности аудиоплеера
- 🚪 [Logout Feature](./LOGOUT_FEATURE.md) - Функция выхода из системы
- 📋 [Release Notes v1.2](./RELEASE_v1.2.md) - Что нового в версии 1.2

---

## 🔒 Безопасность

- ✅ OAuth 2.0 авторизация
- ✅ Защищенные cookie сессии (httpOnly, secure в production)
- ✅ CORS настроен для конкретного домена
- ✅ `.env` файлы в `.gitignore`
- ✅ Секреты не хранятся в коде

**Примечание:** В DEV режиме используется fallback для `SESSION_SECRET`. В production обязательно установите свой секретный ключ!

---

## 🤝 Вклад в проект

Проект создан для портфолио, но форки и предложения приветствуются!

1. Сделайте форк проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Закоммитьте изменения (`git commit -m 'Add some AmazingFeature'`)
4. Запушьте в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

## 📝 Лицензия

Этот проект распространяется под лицензией MIT. См. файл [LICENSE](./LICENSE) для подробностей.

**TL;DR:** Вы можете свободно использовать, изменять и распространять этот код, даже в коммерческих проектах. Автор не несет ответственности за любые проблемы, связанные с использованием кода.

---

## 👤 Автор

**Roman Sashin** — IT-разработчик, специализируюсь на автоматизации бизнеса и разработке приложений

- 🌐 Website: [sashin.net](https://sashin.net)
- 📧 Email: [roman@sashin.net](mailto:roman@sashin.net)
- 💬 Telegram: [@romansashin](https://t.me/romansashin)
- 💼 GitHub: [@romansashin](https://github.com/romansashin)

---

## ⭐️ Благодарности

Спасибо за интерес к проекту! Если он был полезен, поставьте ⭐️

---

<a name="english-version"></a>

# 🧘 Meditation App

> Web application for listening to hypnotherapy and meditation practices with progress tracking

## 📖 About

A full-featured web application for listening to meditations and hypnotherapy sessions with personal progress tracking. Supports background playback, lock screen controls, and OAuth authentication via Google/Yandex.

## ✨ Key Features

- 🎵 **Audio Player with Visual Timer** - beautiful interface with progress bar
- 📱 **Background Playback** - audio continues playing even with screen off (Wake Lock API + Media Session API)
- 📊 **Progress Tracking** - automatic listening count (recorded after 30 seconds)
- 🔐 **OAuth Authentication** - login via Google or Yandex
- 🌐 **DEV Mode** - works without authentication for development and demo
- 💾 **Personal Data** - progress tied to account and accessible from any device
- 🎨 **Modern UI** - responsive design with Tailwind CSS

## 🛠 Tech Stack

**Backend:** Node.js, Fastify, SQLite, Passport.js  
**Frontend:** React 18, Vite, Tailwind CSS, Wake Lock API, Media Session API  
**DevOps:** Docker, Docker Compose, nginx

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/romansashin/as_app.git
cd as_app

# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Run in DEV mode
npm run dev
```

Visit http://localhost:5173

**In DEV mode** authentication is disabled - you can use the app immediately without OAuth setup.

## 🐳 Docker (Recommended)

```bash
# Development
docker-compose up

# Production
cp env.production.example .env
# Edit .env with your credentials
docker-compose -f docker-compose.prod.yml up -d --build
```

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 👤 Author

**Roman Sashin** — IT Developer, Business Automation & App Development

- 🌐 Website: [sashin.net](https://sashin.net)
- 📧 Email: [roman@sashin.net](mailto:roman@sashin.net)
- 💬 Telegram: [@romansashin](https://t.me/romansashin)
- 💼 GitHub: [@romansashin](https://github.com/romansashin)

---

⭐️ Star this repo if you find it useful!
