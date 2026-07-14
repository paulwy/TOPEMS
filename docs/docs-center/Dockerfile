FROM nginx:alpine

LABEL maintainer="TOPEMS <support@topems.com>"
LABEL description="TOPEMS Documentation Center"

# 复制文档
COPY . /usr/share/nginx/html

# 配置 Nginx
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~ ^/(user-manuals|superpowers|api)/ { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
