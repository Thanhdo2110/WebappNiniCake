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
  payos: {
    clientId: env.PAYOS_CLIENT_ID || '',
    apiKey: env.PAYOS_API_KEY || '',
    checksumKey: env.PAYOS_CHECKSUM_KEY || '',
    /** Bỏ trống để dùng URL mặc định của SDK (production). Sandbox: https://api-sandbox.payos.vn */
    baseUrl: env.PAYOS_API_BASE_URL || '',
    /** URL công khai của storefront, dùng dựng returnUrl/cancelUrl/webhookUrl */
    publicUrl: (env.PUBLIC_URL || '').replace(/\/+$/, ''),
  },
  seedSampleData: (env.SEED_SAMPLE_DATA || 'true') === 'true',
  adminEmail: env.ADMIN_EMAIL || 'admin@ninicakes.vn',
  adminPassword: env.ADMIN_PASSWORD || 'Admin@123',
};

/** Chỉ bật khi có đủ cả ba key và một URL công khai để PayOS còn quay về. */
export const payosEnabled = Boolean(
  envs.payos.clientId && envs.payos.apiKey && envs.payos.checksumKey && envs.payos.publicUrl
);

const DEMO_SECRETS = new Set([
  'dev_access_secret',
  'dev_access_secret_change_me',
  'dev_refresh_secret',
  'dev_refresh_secret_change_me',
]);

/** Production không được chạy bằng secret demo: ai đọc được repo là forge được token admin.
    Lưu ý: ADMIN_PASSWORD ở đây chỉ là biến trang trí — mật khẩu admin nằm trong DB,
    phải đổi bằng tài khoản admin chứ không đổi được qua env. */
export function assertProductionSecrets() {
  if (!envs.isProd) return;
  const weak: string[] = [];
  if (DEMO_SECRETS.has(envs.jwt.accessSecret)) weak.push('JWT_ACCESS_SECRET');
  if (DEMO_SECRETS.has(envs.jwt.refreshSecret)) weak.push('JWT_REFRESH_SECRET');
  if (weak.length) {
    throw new Error(
      `NODE_ENV=production nhưng vẫn còn ${weak.join(', ')} ở giá trị demo. Tạo file .env từ .env.example, đặt chuỗi ngẫu nhiên khác rồi chạy lại docker compose.`
    );
  }
}

export type Envs = typeof envs;
