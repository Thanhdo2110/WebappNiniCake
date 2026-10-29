# ===== Nini Cakes API (Express + TSX + Prisma) =====
FROM node:22-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# Prisma (schema engine) cần OpenSSL – image slim không kèm sẵn
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Cài dependency toàn workspace (cần devDeps cho prisma + tsx)
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY customer-web/package.json ./customer-web/
COPY admin-web/package.json ./admin-web/
# Bao gồm devDependencies (prisma CLI + tsx) để container chạy độc lập, không cần npx tải lúc khởi động
RUN npm ci --include=dev

# Source của shared + server (kèm migration)
COPY shared ./shared
COPY server ./server
RUN cd server && npx prisma generate

EXPOSE 4000
# Khởi động: chờ MySQL (compose đã healthcheck), migrate + seed, rồi chạy API
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && (npx tsx prisma/seed.ts || echo '[seed] Bỏ qua - dữ liệu đã tồn tại.') && npx tsx src/server.ts"]
