# TOPEMS Frontend Dockerfile
# 多阶段构建优化镜像大小

# 阶段1: 构建阶段
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production=false

COPY . .

ENV VITE_API_BASE_URL=http://nginx:80
ENV NODE_ENV=production

RUN npm run build

# 阶段2: 运行阶段
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TOPEMS Health</title></head><body><h1>TOPEMS Frontend OK</h1></body></html>' > /usr/share/nginx/html/health.html

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
