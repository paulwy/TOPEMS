# TOPEMS 部署指南

## 概述

本文档详细描述了 TOPEMS 企业管理系统的部署方法，包括开发环境、测试环境和生产环境的部署配置。

---

## 系统架构

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层                                  │
│   [浏览器]    [移动端]    [第三方系统]                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API网关层                                 │
│                    [Nginx Load Balancer]                       │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   前端服务    │   │   前端服务    │   │   前端服务    │
│   (Portal)    │   │   (Portal)    │   │   (Portal)    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        服务层                                    │
│  IAM | DOC | FLOW | RS | LIMS | QMS | EHS | SRM | PDM | BI | IM │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据层                                    │
│           [PostgreSQL主库]      [PostgreSQL从库]                │
│           [Redis缓存]           [Redis集群]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端 | React | 18+ |
| 前端框架 | Next.js | 14+ |
| UI框架 | TailwindCSS | 3+ |
| 后端 | Rust | 1.70+ |
| 后端框架 | Axum | 0.7+ |
| 数据库 | PostgreSQL | 15+ |
| 缓存 | Redis | 7+ |
| 消息队列 | RabbitMQ | 3.12+ |
| API网关 | Nginx | 1.25+ |
| 容器 | Docker | 24+ |
| 编排 | Kubernetes | 1.28+ |

---

## 环境要求

### 硬件要求

| 环境 | CPU | 内存 | 存储 | 网络 |
|------|-----|------|------|------|
| 开发环境 | 4核 | 8GB | 100GB | 100Mbps |
| 测试环境 | 8核 | 16GB | 200GB | 1Gbps |
| 生产环境 | 16核+ | 32GB+ | 500GB+ | 10Gbps |

### 软件要求

| 软件 | 版本 | 说明 |
|------|------|------|
| Docker | 24.0+ | 容器运行时 |
| Docker Compose | 2.20+ | 容器编排 |
| kubectl | 1.28+ | Kubernetes命令行 |
| Helm | 3.12+ | Kubernetes包管理 |
| Rust | 1.70+ | 后端开发 |
| Node.js | 20+ | 前端开发 |
| npm | 10+ | 包管理 |

---

## 开发环境部署

### 1. 克隆代码

```bash
git clone https://github.com/topems/topems.git
cd topems
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# 数据库配置
POSTGRES_USER=topems
POSTGRES_PASSWORD=topems_secret
POSTGRES_DB=topems
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis配置
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7200

# 服务端口配置
IAM_PORT=8080
PORTAL_PORT=3000
RS_PORT=8081
LIMS_PORT=8082
```

### 3. 启动数据库

```bash
# 使用Docker启动PostgreSQL和Redis
docker-compose up -d postgres redis
```

### 4. 运行后端服务

```bash
# 进入服务目录
cd services/topems-iam/backend

# 构建并运行
cargo run --release
```

### 5. 运行前端服务

```bash
# 进入前端目录
cd services/topems-portal/frontend

# 安装依赖
npm install

# 开发模式运行
npm run dev
```

### 6. 访问系统

打开浏览器访问：http://localhost:3000

---

## Docker Compose 部署

### 1. 使用预构建镜像

```bash
# 启动所有服务
docker-compose up -d
```

### 2. 构建本地镜像

```bash
# 构建所有镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### 3. 查看服务状态

```bash
# 查看运行中的容器
docker-compose ps

# 查看服务日志
docker-compose logs -f <service_name>
```

### 4. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

---

## Kubernetes 部署

### 1. 准备工作

```bash
# 创建命名空间
kubectl create namespace topems

# 创建Secret
kubectl apply -f k8s/secrets.yaml
```

### 2. 部署数据库

```bash
# 部署PostgreSQL
kubectl apply -f k8s/postgres/deployment.yaml
kubectl apply -f k8s/postgres/service.yaml

# 部署Redis
kubectl apply -f k8s/redis/deployment.yaml
kubectl apply -f k8s/redis/service.yaml
```

### 3. 部署服务

```bash
# 部署所有服务
kubectl apply -f k8s/services/

# 部署前端
kubectl apply -f k8s/frontend/
```

### 4. 部署Ingress

```bash
# 部署Nginx Ingress Controller
kubectl apply -f k8s/ingress/nginx.yaml

# 部署Ingress规则
kubectl apply -f k8s/ingress/topems-ingress.yaml
```

### 5. 验证部署

```bash
# 查看Pod状态
kubectl get pods -n topems

# 查看服务
kubectl get services -n topems

# 查看Ingress
kubectl get ingress -n topems
```

---

## 配置说明

### Nginx 配置

主要配置项：

| 配置项 | 说明 |
|--------|------|
| `worker_processes` | 工作进程数 |
| `worker_connections` | 最大连接数 |
| `upstream` | 后端服务配置 |
| `ssl_certificate` | SSL证书路径 |
| `ssl_protocols` | SSL协议版本 |
| `limit_req_zone` | 限流配置 |

### 数据库配置

```postgresql
-- 创建数据库
CREATE DATABASE topems;

-- 创建用户
CREATE USER topems WITH PASSWORD 'topems_secret';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE topems TO topems;
```

### Redis 配置

```redis
# redis.conf
bind 0.0.0.0
port 6379
requirepass your-redis-password
maxmemory 2gb
maxmemory-policy allkeys-lru
```

---

## 安全配置

### 1. HTTPS 配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/tls.crt;
    ssl_certificate_key /etc/nginx/ssl/tls.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
}
```

### 2. 安全头

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. 限流配置

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

location /api/ {
    limit_req zone=api_limit burst=50 nodelay;
}
```

---

## 监控与日志

### 1. Prometheus 监控

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: topems-services
  namespace: topems
spec:
  selector:
    matchLabels:
      app: topems
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

### 2. Grafana 仪表盘

- 导入仪表盘ID：12345
- 配置数据源：Prometheus

### 3. ELK 日志收集

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*.log
    output.elasticsearch:
      hosts: ["elasticsearch:9200"]
```

---

## 备份与恢复

### 1. 数据库备份

```bash
# 备份数据库
pg_dump -h localhost -U topems topems > backup.sql

# 压缩备份
pg_dump -h localhost -U topems topems | gzip > backup.sql.gz
```

### 2. 数据库恢复

```bash
# 恢复数据库
psql -h localhost -U topems topems < backup.sql

# 从压缩文件恢复
gunzip -c backup.sql.gz | psql -h localhost -U topems topems
```

### 3. 定时备份脚本

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/topems"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U topems topems | gzip > ${BACKUP_DIR}/backup_${DATE}.sql.gz

# 保留最近30天的备份
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete
```

---

## 故障排查

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 服务无法启动 | 端口被占用 | 检查端口占用，修改配置 |
| 数据库连接失败 | 数据库未启动 | 启动数据库服务 |
| 登录失败 | JWT密钥错误 | 检查JWT_SECRET配置 |
| 页面无法访问 | Nginx配置错误 | 检查Nginx日志 |
| 性能问题 | 资源不足 | 增加资源配置 |

### 日志查看

```bash
# 查看容器日志
docker logs <container_id>

# 查看Kubernetes Pod日志
kubectl logs <pod_name> -n topems

# 查看Nginx日志
tail -f /var/log/nginx/error.log
```

---

## 升级指南

### 1. 备份数据

```bash
# 备份数据库
pg_dump -h localhost -U topems topems > backup_before_upgrade.sql
```

### 2. 停止旧版本服务

```bash
docker-compose down
```

### 3. 更新代码

```bash
git pull origin main
```

### 4. 运行数据库迁移

```bash
cargo run --bin migrate
```

### 5. 启动新版本服务

```bash
docker-compose up -d
```

---

## 性能优化

### 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_users_email ON users(email);

-- 查询优化
EXPLAIN ANALYZE SELECT * FROM projects WHERE status = 'active';
```

### Redis 缓存

```rust
// 使用Redis缓存
let cache_key = format!("project:{}", project_id);
if let Some(data) = redis.get(&cache_key).await {
    return serde_json::from_str(&data)?;
}

// 查询数据库
let project = db.query(...).await?;

// 存入缓存
redis.set(&cache_key, serde_json::to_string(&project)?).await?;
```

### 连接池配置

```rust
// 数据库连接池
let pool = PgPoolOptions::new()
    .max_connections(100)
    .connect(&database_url)
    .await?;
```

---

## 附录

### 端口映射

| 服务 | 端口 | 说明 |
|------|------|------|
| IAM | 8080 | 身份认证服务 |
| Portal | 3000 | 前端门户 |
| RS | 8081 | 研发管理 |
| LIMS | 8082 | 实验室管理 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| Nginx | 80/443 | 反向代理 |

### 目录结构

```
topems/
├── services/           # 微服务代码
│   ├── topems-iam/     # IAM服务
│   ├── topems-portal/  # 前端门户
│   └── ...
├── k8s/               # Kubernetes配置
├── docker-compose.yml  # Docker Compose配置
└── .env               # 环境变量
```

---

**文档版本**: v1.0  
**最后更新**: 2024-01-01  
**适用版本**: TOPEMS v1.0
