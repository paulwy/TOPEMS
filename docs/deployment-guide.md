# TOPEMS 部署指南

## 概述

TOPEMS 支持多种部署方式，适用于不同的环境和需求。

## 环境要求

### 基础环境

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 4 核 | 8 核+ |
| 内存 | 8 GB | 16 GB+ |
| 磁盘 | 50 GB | 100 GB+ |
| 操作系统 | macOS 12+ / Ubuntu 20.04+ | macOS 14+ / Ubuntu 22.04+ |

### 必需软件

| 软件 | 版本 | 说明 |
|------|------|------|
| Rust | 1.70+ | 后端编译 |
| Node.js | 18+ | 前端构建 |
| PostgreSQL | 14+ | 数据库（建议启用 pgvector） |
| Redis | 7+ | 缓存/向量 |
| Ollama | latest | AI 模型（可选） |

## 核心服务

TOPEMS 核心服务包括：

| 服务 | 端口 | 说明 |
|------|------|------|
| IAM | 8000 | 身份认证与权限管理 |
| HRM | 8011 | 人力资源管理 |
| Mail | 8054 | 邮件服务 |
| File | 8050 | 统一文件服务 |

### 启动核心服务

```bash
# 自动检测数据库环境并启动所有核心服务
bash scripts/start-local.sh

# 查看服务状态
bash scripts/start-local.sh status

# 停止所有服务
bash scripts/start-local.sh stop
```

## 部署方式

### 方式一：本地开发部署（推荐）

适用于开发环境和团队协作。

```bash
# 1. 克隆项目
git clone https://github.com/your-org/topems.git
cd topems

# 2. 安装依赖
brew install rust node pnpm postgresql redis ollama

# 3. 初始化数据库
bash scripts/start-local.sh

# 4. 启动服务
bash scripts/start-local.sh

# 5. 启动前端
cd frontend && pnpm install && pnpm dev
```

### 方式二：Docker 部署

适用于快速部署和测试。

```bash
# 1. 启动基础服务
docker compose up -d postgres redis

# 2. 启动所有服务
docker compose up -d

# 3. 检查状态
docker compose ps
```

### 方式三：生产环境部署

适用于生产环境部署。

#### 1. 准备服务器

```bash
# Ubuntu 22.04
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安装 Redis
sudo apt install -y redis-server

# 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh
```

#### 2. 配置数据库

```bash
# 创建数据库
sudo -u postgres psql << 'EOF'
CREATE USER topems WITH PASSWORD 'your_secure_password';
CREATE DATABASE topems OWNER topems;
ALTER USER topems CREATEDB;
EOF
```

#### 3. 编译服务

```bash
# 编译所有服务
cargo build --release --workspace

# 或单独编译
cargo build --release -p topems-iam
cargo build --release -p topems-hrm
```

#### 4. 配置服务

```bash
# 创建服务用户
sudo useradd -r -s /bin/false topems

# 创建配置目录
sudo mkdir -p /etc/topems
sudo chown topems:topems /etc/topems
```

#### 5. 使用 systemd 管理服务

```ini
# /etc/systemd/system/topems-iam.service
[Unit]
Description=TOPEMS IAM Service
After=network.target postgresql.service

[Service]
Type=simple
User=topems
WorkingDirectory=/opt/topems
Environment=DATABASE_URL=postgres://topems:password@localhost:5432/topems
Environment=SERVER_PORT=8000
ExecStart=/opt/topems/topems-iam
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable topems-iam
sudo systemctl start topems-iam
```

## 数据库配置

### 环境变量

```bash
# 本地开发
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# Docker 环境
DATABASE_URL=postgres://topems:topems@host.docker.internal:5432/topems

# 生产环境
DATABASE_URL=postgres://topems:secure_password@db.example.com:5432/topems
```

### 连接池配置

```bash
# 环境变量
DATABASE_MAX_CONNECTIONS=20
DATABASE_MIN_CONNECTIONS=5
DATABASE_CONNECTION_TIMEOUT=30s
```

## AI 配置

### Ollama 配置

```bash
# 启动 Ollama
ollama serve

# 拉取模型
ollama pull qwen2.5:7b-instruct

# 验证
curl http://localhost:11434/api/tags
```

### 环境变量

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
AI_PROVIDER=ollama
```

## 邮件服务配置

### SMTP 配置

邮件服务支持通过环境变量配置 SMTP：

```bash
# SMTP 服务器配置
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USERNAME=topmap@163.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_ADDRESS=topmap@163.com

# 或使用 .env.mail 文件
cp .env.mail .env.mail.local
```

### 邮件服务端口

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| SERVER_PORT | 8054 | 邮件服务监听端口 |
| SMTP_PORT | 465 | SMTP 端口（SSL） |

### 验证邮件服务

```bash
# 检查服务状态
curl http://localhost:8054/health

# 预期响应
{"code":200,"success":true,"data":"healthy","message":"健康检查"}
```

## Redis 配置

### Docker 启动

```bash
docker run -d \
  --name topems-redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes
```

### 本地启动

```bash
# macOS
brew services start redis

# Ubuntu
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 初始化向量索引

```bash
bash scripts/init-vector-index.sh
```

## Nginx 反向代理配置

```nginx
# /etc/nginx/sites-available/topems

upstream iam_backend {
    server 127.0.0.1:8000;
}

upstream hrm_backend {
    server 127.0.0.1:8011;
}

upstream mail_backend {
    server 127.0.0.1:8054;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name api.topems.local;

    # IAM API
    location /api/v1/ {
        proxy_pass http://iam_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # HRM API
    location /hrm/api/ {
        proxy_pass http://hrm_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Mail API
    location /mail/api/ {
        proxy_pass http://mail_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl http2;
    server_name api.topems.local;

    ssl_certificate /etc/ssl/topems.crt;
    ssl_certificate_key /etc/ssl/topems.key;

    # 同上配置...
}
```

## 监控配置

### Prometheus 配置

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'topems'
    static_configs:
      - targets: ['localhost:8000', 'localhost:8011', 'localhost:8054']
    metrics_path: /metrics
```

### Grafana 配置

```bash
# 启动 Grafana
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

## 备份策略

### 数据库备份

```bash
# 每日备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=/var/backups/topems

# 备份数据库
pg_dump -U topems -d topems | gzip > $BACKUP_DIR/topems_$DATE.sql.gz

# 保留 30 天备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Redis 备份

```bash
# 持久化 Redis
redis-cli BGSAVE

# 复制备份
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb
```

## 安全配置

### 防火墙配置

```bash
# Ubuntu
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### SSL 证书

```bash
# 使用 Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.topems.local
```

## 故障排查

### 服务无法启动

```bash
# 检查日志
journalctl -u topems-iam -n 100

# 检查端口占用
lsof -i :8000  # IAM
lsof -i :8011  # HRM
lsof -i :8054  # Mail

# 检查数据库连接
psql -U topems -d topems -c "SELECT 1"

# 检查邮件服务环境变量
echo $SMTP_HOST $SMTP_PORT $SMTP_USERNAME
```

### 数据库迁移失败

```bash
# 检查迁移脚本
psql -U topems -d topems -c "SELECT * FROM schema_migrations;"

# 手动执行迁移
psql -U topems -d topems -f migrations/001_init.sql
```

### Redis 连接失败

```bash
# 检查 Redis
redis-cli ping

# 查看 Redis 日志
tail -f /var/log/redis/redis-server.log
```

## 性能优化

### PostgreSQL 优化

```sql
-- 启用并行查询
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- 调整共享缓冲区
ALTER SYSTEM SET shared_buffers = '4GB';

-- 启用页面压缩
ALTER SYSTEM SET compress = on;
```

### Redis 优化

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
```

## 升级指南

### 版本升级

```bash
# 1. 备份数据
./scripts/backup.sh

# 2. 停止服务
bash scripts/stop-all.sh

# 3. 更新代码
git pull origin main

# 4. 编译新版本
cargo build --release --workspace

# 5. 运行数据库迁移
psql -U topems -d topems -f migrations/upgrade.sql

# 6. 重启服务
bash scripts/start-local.sh
```

## 联系支持

- 文档: https://docs.topems.local
- 问题反馈: https://github.com/your-org/topems/issues
- 技术支持: support@topems.local
