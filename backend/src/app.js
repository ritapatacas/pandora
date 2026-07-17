import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createTuyaService } from './tuya/service.js';
import { createDevicesRouter } from './routes/devices.js';
import { createCommandsRouter } from './routes/commands.js';

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

  let tuya;
  try {
    tuya = createTuyaService(env);
  } catch (e) {
    console.warn('Tuya service init failed:', e.message);
    app.use('/api/devices', (_req, res) =>
      res.status(503).json({ error: 'Tuya not configured', detail: e.message })
    );
    app.use('/api/commands', (_req, res) =>
      res.status(503).json({ error: 'Tuya not configured', detail: e.message })
    );
    app.get('/api/health', (_req, res) => res.json({ ok: true, tuya: false }));
    return app;
  }

  app.use('/api/devices', createDevicesRouter(tuya));
  app.use('/api/commands', createCommandsRouter(tuya));
  app.get('/api/health', (_req, res) => res.json({ ok: true, tuya: true }));

  return app;
}
