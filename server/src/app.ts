import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'node:path';
import fs from 'node:fs';

import apiRouter from './routes/index.js';
import { envs } from './config/env.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';
import { uploadService } from './services/upload.service.js';
import { buildSitemap } from './services/seo.service.js';
import { openApiSpec } from './docs/openapi.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.set('x-powered-by', false);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (envs.isProd) {
          return cb(null, envs.clientOrigins.includes(origin));
        }
        return cb(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  app.use(morgan(envs.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 400,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Quý khách gửi quá nhiều yêu cầu. Vui lòng thử lại sau một phút.' },
  });
  app.use('/api/', globalLimiter);

  // Ảnh upload nội bộ
  const staticUploadDir = uploadService.staticDir();
  if (!fs.existsSync(staticUploadDir)) {
    fs.mkdirSync(path.join(staticUploadDir, 'images'), { recursive: true });
  }
  app.use('/uploads', express.static(staticUploadDir, { maxAge: '7d' }));

  const v1 = express.Router();
  v1.use(apiRouter);
  app.use('/api/v1', v1);

  // Swagger/OpenAPI docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: 'Nini Cakes API' }));
  app.get('/openapi.json', (_req, res) => res.json(openApiSpec));

  // SEO: sitemap động (prod nên set PUBLIC_SITE_URL)
  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const xml = await buildSitemap();
      res.type('application/xml').set('Cache-Control', 'public, max-age=600').send(xml);
    } catch {
      res.status(500).type('application/xml').send('<?xml version="1.0"?><error>sitemap unavailable</error>');
    }
  });
  app.get('/robots.txt', (_req, res) =>
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${process.env.PUBLIC_SITE_URL || 'https://ninicakes.vn'}/sitemap.xml\n`)
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
