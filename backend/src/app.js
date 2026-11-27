import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createTuyaService } from './tuya/service.js';
import { createHaService } from './ha/service.js';
import { createDevicesRouter } from './routes/devices.js';
import { createCommandsRouter } from './routes/commands.js';

/**
 * LIGHT_PROVIDER=ha   → Home Assistant (local network)
 * LIGHT_PROVIDER=tuya → Tuya Cloud (default)
 */
function createLightService(env) {
  const provider = (env.LIGHT_PROVIDER || 'tuya').trim().toLowerCase();
  return provider === 'ha' ? createHaService(env) : createTuyaService(env);
}

export function createApp(env = process.env) {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN || true,
      credentials: true,
    })
  );
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: env.RATE_LIMIT_MAX ? Number(env.RATE_LIMIT_MAX) : 120,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Optional shared secret. When API_KEY is set, every /api route except
  // /api/health requires the X-API-Key header. The Next.js server adds it.
  const apiKey = (env.API_KEY || '').trim();
  if (apiKey) {
    const expected = Buffer.from(apiKey);
    app.use('/api', (req, res, next) => {
      if (req.path === '/health') return next();
      const given = Buffer.from(req.get('x-api-key') || '');
      const ok = given.length === expected.length && crypto.timingSafeEqual(given, expected);
      if (!ok) return res.status(401).json({ error: 'Unauthorized' });
      next();
    });
  }

  let lights;
  try {
    lights = createLightService(env);
  } catch (e) {
    console.warn('Light service init failed:', e.message);
    app.use('/api/devices', (_req, res) =>
      res.status(503).json({ error: 'Light provider not configured', detail: e.message })
    );
    app.use('/api/commands', (_req, res) =>
      res.status(503).json({ error: 'Light provider not configured', detail: e.message })
    );
    app.get('/api/health', (_req, res) => res.json({ ok: true, provider: false }));
    return app;
  }

  app.use('/api/devices', createDevicesRouter(lights));
  app.use('/api/commands', createCommandsRouter(lights));
  app.get('/api/health', (_req, res) => res.json({ ok: true, provider: true }));

  return app;
}
