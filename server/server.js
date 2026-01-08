import Fastify from 'fastify';
import cors from '@fastify/cors';
import secureSession from '@fastify/secure-session';
import fastifyPassport from '@fastify/passport';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  initDB,
  getUserById,
  getUserProgress,
  addUserProgress
} from './db.js';
import { setupOAuth, setupAuthRoutes } from './auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({ logger: true });

// CORS
await fastify.register(cors, {
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
  credentials: true
});

// Session
await fastify.register(secureSession, {
  secret: process.env.SESSION_SECRET || '12345678901234567890123456789012',
  cookie: {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
});

// Passport
await fastify.register(fastifyPassport.initialize());
await fastify.register(fastifyPassport.secureSession());

// DB
await initDB();
fastify.log.info('Database initialized');

// Passport session
fastifyPassport.registerUserSerializer(async (user) => user.id);
fastifyPassport.registerUserDeserializer(async (id) => {
  return await getUserById(id);
});

// OAuth стратегии (только если есть переменные окружения)
const hasOAuthConfig = 
  (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
  (process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET);

if (hasOAuthConfig) {
  setupOAuth(fastifyPassport);
  setupAuthRoutes(fastify, fastifyPassport);
  fastify.log.info('OAuth authentication enabled');
} else {
  fastify.log.warn('OAuth credentials not found - running in DEV mode without authentication');
}

// Logout роут доступен всегда (даже в DEV режиме)
fastify.post('/auth/logout', async (request, reply) => {
  try {
    if (request.user) {
      request.logout();
    }
    if (request.session) {
      request.session.delete();
    }
    return { success: true };
  } catch (error) {
    fastify.log.error('Logout error:', error);
    return { success: true }; // Всё равно считаем успешным
  }
});

// Health
fastify.get('/health', async () => ({ status: 'ok' }));

// Me
fastify.get(
  '/api/me',
  { preValidation: fastifyPassport.authenticate('session', { authInfo: false }) },
  async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await getUserById(request.user.id);
    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }

    return {
      user: {
        id: user.id,
        provider: user.provider,
        email: user.email,
        created_at: user.created_at
      }
    };
  }
);

// Content API (ЕДИНСТВЕННЫЙ)
fastify.get('/api/content', async (request, reply) => {
  try {
    const contentPath = join(__dirname, 'data', 'content.json');
    const raw = await readFile(contentPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ error: 'Failed to load content' });
  }
});

// Progress GET (авторизация временно отключена для dev)
fastify.get('/api/progress', async (request, reply) => {
  try {
    // DEV режим: используем фиктивный user_id = 1 если нет авторизации
    const userId = request.user?.id || 1;
    fastify.log.info(`GET /api/progress - userId: ${userId}`);
    const progress = await getUserProgress(userId);
    return progress || {};
  } catch (error) {
    fastify.log.error('Error in GET /api/progress:', error);
    return reply.code(500).send({ error: 'Failed to get progress' });
  }
});

// Progress POST (авторизация временно отключена для dev)
fastify.post('/api/progress', async (request, reply) => {
  try {
    const { practice_id } = request.body;
    if (!practice_id || typeof practice_id !== 'string') {
      fastify.log.warn(`Invalid practice_id received: ${JSON.stringify(request.body)}`);
      return reply.code(400).send({ error: 'practice_id is required' });
    }

    // DEV режим: используем фиктивный user_id = 1 если нет авторизации
    const userId = request.user?.id || 1;
    fastify.log.info(`POST /api/progress - userId: ${userId}, practice_id: ${practice_id}`);
    
    const result = await addUserProgress(userId, practice_id);
    fastify.log.info(`Progress added successfully - id: ${result.id}`);
    
    return reply.code(201).send({ success: true, id: result.id });
  } catch (error) {
    fastify.log.error('Error in POST /api/progress:', error.message);
    fastify.log.error('Error stack:', error.stack);
    fastify.log.error('Error details:', error);
    return reply.code(500).send({ error: 'Failed to add progress', details: error.message });
  }
});

// Production static serving
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = join(__dirname, '../client/dist');
  
  await fastify.register(fastifyStatic, {
    root: clientDistPath,
    prefix: '/',
  });

  // SPA fallback - все остальные роуты отдают index.html
  fastify.setNotFoundHandler(async (request, reply) => {
    // Если это API запрос, возвращаем 404
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    
    // Для всех остальных запросов отдаем index.html
    try {
      const indexHtml = await readFile(join(clientDistPath, 'index.html'), 'utf-8');
      reply.type('text/html').send(indexHtml);
    } catch (err) {
      fastify.log.error(err);
      reply.code(404).send({ error: 'Not found' });
    }
  });
}

// Start
const start = async () => {
  try {
    const port = Number(process.env.PORT || 4000);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();