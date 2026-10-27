import 'dotenv/config';

const env = typeof process !== 'undefined' ? process.env : {};

const parseList = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const envs = {
  nodeEnv: env.NODE_ENV || 'development',
  isProd: (env.NODE_ENV || 'development') === 'production',
  port: Number(env.PORT || 4000),
  databaseUrl: env.DATABASE_URL || '',
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET || 'dev_access_secret',
    refreshSecret: env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    accessTtl: env.JWT_ACCESS_TTL || '15m',
    refreshTtl: env.JWT_REFRESH_TTL || '7d',
  },
  clientOrigins: parseList(
    env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:8080,http://localhost:8081'
  ),
  upload: {
    driver: env.UPLOAD_DRIVER || 'local',
    dir: env.UPLOAD_DIR || 'uploads',
    maxMb: Number(env.MAX_UPLOAD_MB || 5),
    cloudinaryUrl: env.CLOUDINARY_URL || '',
  },
  mail: {
    host: env.MAIL_HOST || '',
    port: Number(env.MAIL_PORT || 465),
    user: env.MAIL_USER || '',
    pass: env.MAIL_PASS || '',
    from: env.MAIL_FROM || 'Nini Cakes <no-reply@ninicakes.vn>',
  },
  seedSampleData: (env.SEED_SAMPLE_DATA || 'true') === 'true',
  adminEmail: env.ADMIN_EMAIL || 'admin@ninicakes.vn',
  adminPassword: env.ADMIN_PASSWORD || 'Admin@123',
};

export type Envs = typeof envs;
