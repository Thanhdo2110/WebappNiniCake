# ===== Nini Cakes API (Express + TSX + Prisma) =====
FROM node:22-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# Prisma (schema engine) cần OpenSSL – image slim không kèm sẵn
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# package.json của cả 4 workspace + lockfile: npm ci cần bộ này khớp với lock
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY customer-web/package.json ./customer-web/
COPY admin-web/package.json ./admin-web/

# Source của shared + server (kèm migration)
COPY shared ./shared
COPY server ./server

# --omit=dev bỏ toàn bộ devDependencies: typescript, eslint, prettier,
# typescript-eslint, vitest, @types/* và deps của hai SPA (react, recharts,
# lucide-react, vite). prisma CLI + tsx đã chuyển sang dependencies vì CMD gọi
# chúng lúc container khởi động. Không compile TS: shared/package.json trỏ
# main vào src/index.ts nên Node ESM thuần sẽ không nạp được.
RUN npm ci --omit=dev -w server \
  && cd server && npx prisma generate \
  && rm -rf /root/.npm

EXPOSE 4000
# Khởi động: chờ MySQL (compose đã healthcheck), migrate + seed, rồi chạy API
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && (npx tsx prisma/seed.ts || echo '[seed] Bỏ qua - dữ liệu đã tồn tại.') && npx tsx src/server.ts"]
