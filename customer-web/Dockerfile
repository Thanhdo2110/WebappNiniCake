# ===== Nini Cakes - Storefront (customer-web) =====
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY customer-web/package.json customer-web/
COPY admin-web/package.json admin-web/
# -w customer-web: build chỉ cần vite + react của chính workspace này,
# không phải prisma CLI hay recharts của workspace khác
RUN npm ci -w customer-web

COPY shared ./shared
COPY customer-web ./customer-web
RUN npm -w customer-web run build

# alpine-slim bỏ layer 38.7 MB nginx-module-xslt/geoip/image-filter/perl/njs —
# nginx.conf chỉ dùng core (proxy_pass, gzip, try_files, add_header, resolver)
FROM nginx:1.27-alpine-slim AS runtime
COPY customer-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/customer-web/dist /usr/share/nginx/html
EXPOSE 80
