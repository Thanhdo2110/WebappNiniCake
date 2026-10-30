# ===== Nini Cakes - Admin (admin-web) =====
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY customer-web/package.json customer-web/
COPY admin-web/package.json admin-web/
RUN npm ci -w admin-web

COPY shared ./shared
COPY admin-web ./admin-web
RUN npm -w admin-web run build

# alpine-slim: bỏ 38.7 MB module nginx (xslt/geoip/image-filter/perl/njs) mà nginx.conf không dùng
FROM nginx:1.27-alpine-slim AS runtime
COPY admin-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin-web/dist /usr/share/nginx/html
EXPOSE 80
