# TOPEMS 部署指南

## 概述

TOPEMS 是一个基于微服务架构的企业级数字化平台，支持多种部署方式，适用于不同的环境和需求。

## 环境要求

### 基础环境

| 组件 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 4 核 | 8 核+ |
| 内存 | 8 GB | 16 GB+ |
| 磁盘 | 50 GB | 100 GB+ |
| 操作系统 | macOS 12+ / Ubuntu 20.04+ / Windows 10+ | macOS 14+ / Ubuntu 22.04+ / Windows 11 |

### 必需软件

| 软件 | 版本 | 说明 |
|------|------|------|
| Rust | 1.70+ | 后端编译 |
| Node.js | 18+ | 前端构建 |
| PostgreSQL | 14+ | 数据库（建议启用 pgvector） |
| Redis | 7+ | 缓存/向量 |
| Ollama | latest | AI 模型（可选） |

## 服务总览

TOPEMS 共包含 **20 个服务**，端口分配遵循统一规范：

| 业务域 | 段位 | 服务 | 端口 |
|--------|------|------|------|
| 核心服务 | 8000-8009 | unified-core（IAM + Doc + Flow + File + Monitor + AI） | 8000 |
| 经营管理 | 8010-8019 | erp(8010), finance(8011), ai(8013) | - |
| 协同办公 | 8020-8029 | hrm(8020), pm(8023), crm(8029) | - |
| 生产制造 | 8030-8039 | mes(8030), pdm(8031) | - |
| 供应链 | 8040-8049 | scm(8040), wms(8041), srm(8042) | - |
| 质量/研发 | 8050-8059 | qms(8050), lims(8051), ehs(8052), rd(8053) | - |
| 数据分析 | 8060-8069 | bi(8060), report(8061), portal(8063) | - |
| 基础设施 | 8070-8079 | mobile(8070), gis(8071), integration(8072) | - |

## 部署方式

### 方式一：本地开发部署（推荐 - 默认方式）

适用于开发环境和团队协作。**完全本地进程，不依赖 Docker**。

```bash
# 1. 克隆项目
git clone https://github.com/your-org/topems.git
cd topems

# 2. 安装系统依赖（macOS 示例）
brew install rust node pnpm postgresql@16 redis ollama
brew services start postgresql@16
brew services start redis

# 3. 配置环境
cp .env.example .env
# 编辑 .env，配置 JWT 密钥（必须！）
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env

# 4. 创建数据库
createdb topems

# 5. 一键启动所有服务（推荐）
./scripts/start-local.sh
# 或
pnpm dev

# 6. 单独启动（如需精细控制）
./scripts/topems.sh start iam           # 启动后端
cd apps/web && pnpm install && pnpm dev  # 启动前端
cd apps/core && pnpm install && pnpm dev # 启动 core
```

> **Docker 仅作为可选的容器化方案**，不是本地开发的必需项。详细说明见 [本地部署指南](../getting-started/local-deployment.md)。

### 方式二：Docker 部署（可选）

适用于快速部署和测试，**不是默认方式**。

```bash
# 1. 启动所有服务（含数据库）
docker compose up -d

# 2. 检查状态
docker compose ps

# 3. 查看日志
docker compose logs -f unified-core

# 4. 停止服务
docker compose down
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

# 安装 Ollama（可选）
curl -fsSL https://ollama.com/install.sh | sh
```

#### 2. 配置数据库

```bash
# 创建数据库用户和数据库
sudo -u postgres psql << 'EOF'
CREATE USER topems WITH PASSWORD 'your_secure_password';
CREATE DATABASE topems OWNER topems;
ALTER USER topems CREATEDB;
EOF

# 安装 pgvector 扩展
sudo apt install -y postgresql-14-pgvector
sudo -u postgres psql -d topems -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### 3. 编译服务

```bash
# 编译所有服务
cargo build --release --workspace

# 或单独编译
cargo build --release -p topems-unified-core
cargo build --release -p topems-hrm
cargo build --release -p topems-ai
```

#### 4. 使用 systemd 管理服务

```ini
# /etc/systemd/system/topems-core.service
[Unit]
Description=TOPEMS Unified Core Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=topems
WorkingDirectory=/opt/topems
Environment=DATABASE_URL=postgres://topems:password@localhost:5432/topems
Environment=SERVER_PORT=8000
ExecStart=/opt/topems/topems-unified-core
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable topems-core
sudo systemctl start topems-core
```

## 服务管理

### 使用统一脚本（推荐）

```bash
# 查看帮助
./scripts/topems.sh --help

# 启动所有服务
./scripts/topems.sh start

# 启动指定服务
./scripts/topems.sh start erp hrm

# 查看服务状态
./scripts/topems.sh status

# 停止所有服务
./scripts/topems.sh stop

# 重启服务
./scripts/topems.sh restart

# 查看日志
./scripts/topems.sh logs
```

### Docker 管理

```bash
# 启动指定服务
docker compose up -d unified-core erp hrm

# 查看单个服务日志
docker compose logs -f topems-erp

# 重新构建服务
docker compose build topems-ai

# 清理容器
docker compose down -v
```

## 数据库配置

### 环境变量

```bash
# 本地开发
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# Docker 环境
DATABASE_URL=postgres://topems:topems@postgres:5432/topems

# 生产环境
DATABASE_URL=postgres://topems:secure_password@db.example.com:5432/topems
```

### 连接池配置

```bash
DATABASE_MAX_CONNECTIONS=20
DATABASE_MIN_CONNECTIONS=5
DATABASE_CONNECTION_TIMEOUT=30s
```

## AI 配置

### Ollama 配置

```bash
# 启动 Ollama 服务
ollama serve

# 拉取模型
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text

# 验证服务
curl http://localhost:11434/api/tags
```

### 环境变量

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b-instruct
OLLAMA_VECTOR_DIMENSION=3584
EMBEDDING_MODEL=nomic-embed-text

VECTOR_INDEX_PREFIX=topems
VECTOR_SEARCH_LIMIT=10
VECTOR_SIMILARITY_THRESHOLD=0.75
```

## 邮件服务配置

### SMTP 配置

```bash
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USERNAME=topmap@163.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_ADDRESS=topmap@163.com
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

## Nginx 反向代理配置

```nginx
# /etc/nginx/sites-available/topems

upstream unified-core {
    server 127.0.0.1:8000;
}

upstream erp {
    server 127.0.0.1:8010;
}

upstream hrm {
    server 127.0.0.1:8020;
}

upstream ai {
    server 127.0.0.1:8013;
}

server {
    listen 80;
    server_name app.topems.local;

    # 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 核心服务 API
    location /api/iam/ {
        proxy_pass http://unified-core/api/iam/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/doc/ {
        proxy_pass http://unified-core/api/doc/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # ERP API
    location /api/erp/ {
        proxy_pass http://erp/api/erp/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # HRM API
    location /api/hrm/ {
        proxy_pass http://hrm/api/hrm/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # AI API
    location /api/ai/ {
        proxy_pass http://ai/api/ai/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 健康检查
    location /health {
        proxy_pass http://unified-core/health;
    }
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
      - targets: ['localhost:8000', 'localhost:8010', 'localhost:8020', 'localhost:8013']
    metrics_path: /metrics
```

### Grafana 配置

```bash
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

## 备份策略

### 数据库备份

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=/var/backups/topems

pg_dump -U topems -d topems | gzip > $BACKUP_DIR/topems_$DATE.sql.gz

find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Redis 备份

```bash
redis-cli BGSAVE
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
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.topems.local
```

## 故障排查

### 服务无法启动

```bash
# 检查日志
./scripts/topems.sh logs

# 检查端口占用
lsof -i :8000
lsof -i :8010

# 检查数据库连接
psql -U topems -d topems -c "SELECT 1"

# 检查 Redis
redis-cli ping
```

### AI 服务无响应

```bash
# 检查 Ollama
curl http://localhost:11434/api/tags

# 检查 AI 服务
curl http://localhost:8013/health

# 检查环境变量
cat .env | grep -E "(OLLAMA|AI)"
```

## 性能优化

### PostgreSQL 优化

```sql
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET work_mem = '64MB';
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

```bash
# 1. 备份数据
pg_dump -U topems -d topems | gzip > backup_$(date +%Y%m%d).sql.gz

# 2. 停止服务
./scripts/topems.sh stop

# 3. 更新代码
git pull origin main

# 4. 编译新版本
cargo build --release --workspace

# 5. 重启服务
./scripts/topems.sh start
```

## 附录

### 服务端口汇总

| 服务名称 | 端口 | 协议 | 说明 |
|----------|------|------|------|
| unified-core | 8000 | HTTP | 统一核心服务（含IAM/Doc/Flow/File/Mail/IM/Notification） |
| erp | 8010 | HTTP | 企业资源计划 |
| hrm | 8020 | HTTP | 人力资源管理 |
| pm | 8023 | HTTP | 项目管理 |
| crm | 8029 | HTTP | 客户关系管理 |
| mes | 8030 | HTTP | 生产执行系统 |
| pdm | 8031 | HTTP | 产品数据管理 |
| scm | 8040 | HTTP | 供应链管理 |
| wms | 8041 | HTTP | 仓储管理 |
| srm | 8042 | HTTP | 供应商管理 |
| qms | 8050 | HTTP | 质量管理 |
| lims | 8051 | HTTP | 实验室信息管理 |
| ehs | 8052 | HTTP | 环境健康安全 |
| rd | 8053 | HTTP | 研发管理 |
| bi | 8060 | HTTP | 商业智能 |
| report | 8061 | HTTP | 报表服务 |
| portal | 8063 | HTTP | 企业门户 |
| ai | 8013 AI 智能服务 |
| mobile | 8070 | HTTP | 移动服务 |
| gis | 8071 | HTTP | 地理信息服务 |
| integration | 8072 | HTTP | 集成服务 |
| frontend | 3000 | HTTP | 前端应用 |
| postgresql | 5432 | TCP | 数据库 |
| redis | 6379 | TCP | 缓存/向量 |
| ollama | 11434 | HTTP | AI 模型服务 |

### 环境变量汇总

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DATABASE_URL | 数据库连接URL | postgres://topems:topems@localhost:5432/topems |
| REDIS_URL | Redis连接URL | redis://localhost:6379 |
| JWT_SECRET | JWT密钥 | - |
| JWT_EXPIRY_HOURS | JWT过期时间（小时） | 24 |
| CORE_PORT | 核心服务端口 | 8000 |
| AI_PORT | AI服务端口 | 8013 |
| OLLAMA_BASE_URL | Ollama服务地址 | http://localhost:11434 |
| OLLAMA_MODEL | 使用的AI模型 | qwen2.5:7b-instruct |
| SMTP_HOST | SMTP服务器 | - |
| SMTP_PORT | SMTP端口 | 465 |
| RUST_LOG | 日志级别 | info |

## 联系支持

- 文档: https://docs.topems.local
- 问题反馈: https://github.com/your-org/topems/issues
- 技术支持: support@topems.local
