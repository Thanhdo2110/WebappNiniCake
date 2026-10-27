# ===== Nini Cakes - Storefront (customer-web) =====
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY customer-web/package.json customer-web/
COPY admin-web/package.json admin-web/
RUN npm ci

COPY shared ./shared
COPY customer-web ./customer-web
RUN npm -w customer-web run build

FROM nginx:1.27-alpine AS run
COPY customer-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/customer-web/dist /usr/share/nginx/html
EXPOSE 80
