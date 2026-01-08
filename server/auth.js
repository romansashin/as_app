import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as YandexStrategy } from 'passport-yandex';
import { findUserByProviderId, createUser } from './db.js';

export function setupOAuth(fastifyPassport) {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    fastifyPassport.use(
      'google',
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4000'}/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await findUserByProviderId('google', profile.id);
            
            if (!user) {
              const email = profile.emails?.[0]?.value || null;
              user = await createUser('google', profile.id, email);
            }
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  // Yandex OAuth Strategy
  if (process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET) {
    fastifyPassport.use(
      'yandex',
      new YandexStrategy(
        {
          clientID: process.env.YANDEX_CLIENT_ID,
          clientSecret: process.env.YANDEX_CLIENT_SECRET,
          callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4000'}/auth/yandex/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await findUserByProviderId('yandex', profile.id);
            
            if (!user) {
              const email = profile.emails?.[0]?.value || null;
              user = await createUser('yandex', profile.id, email);
            }
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }
}

export function setupAuthRoutes(fastify, fastifyPassport) {
  // Google Auth Routes
  fastify.get(
    '/auth/google',
    { preValidation: fastifyPassport.authenticate('google', { scope: ['profile', 'email'] }) },
    () => {}
  );

  fastify.get(
    '/auth/google/callback',
    {
      preValidation: fastifyPassport.authenticate('google', {
        successRedirect: process.env.FRONTEND_URL || 'http://localhost:5173',
        failureRedirect: '/login',
      }),
    },
    () => {}
  );

  // Yandex Auth Routes
  fastify.get(
    '/auth/yandex',
    { preValidation: fastifyPassport.authenticate('yandex') },
    () => {}
  );

  fastify.get(
    '/auth/yandex/callback',
    {
      preValidation: fastifyPassport.authenticate('yandex', {
        successRedirect: process.env.FRONTEND_URL || 'http://localhost:5173',
        failureRedirect: '/login',
      }),
    },
    () => {}
  );

  // Logout
  fastify.post('/auth/logout', async (request, reply) => {
    request.logout();
    request.session.delete();
    return { success: true };
  });
}

