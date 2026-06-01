# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies based on lock file
COPY package*.json ./
RUN npm ci

# Copy all local files into the image
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine AS production

WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy static assets from builder stage
COPY --from=builder /app/dist .

# Add nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
