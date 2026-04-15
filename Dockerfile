# Stage 1 — build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG BUILD_CONFIG=production
RUN npx ng build --configuration=${BUILD_CONFIG} --base-href /

# Stage 2 — serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist/portfolio-angular/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
