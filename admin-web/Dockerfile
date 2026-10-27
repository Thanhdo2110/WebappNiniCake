# ===== Nini Cakes - Admin (admin-web) =====
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY customer-web/package.json customer-web/
COPY admin-web/package.json admin-web/
RUN npm ci

COPY shared ./shared
COPY admin-web ./admin-web
RUN npm -w admin-web run build

FROM nginx:1.27-alpine AS run
COPY admin-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin-web/dist /usr/share/nginx/html
EXPOSE 80
