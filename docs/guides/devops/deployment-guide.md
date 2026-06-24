# TOPEMS 服务部署指南

## 目录

- [部署方式概述](#部署方式概述)
- [Docker Compose 部署](#docker-compose-部署)
- [Kubernetes 部署](#kubernetes-部署)
- [系统服务部署](#系统服务部署systemd)
- [Nginx 配置](#nginx-配置)
- [配置管理](#配置管理)
- [部署验证](#部署验证)

---

## 部署方式概述

| 部署方式 | 适用场景 | 优点 | 缺点 |
|----------|----------|------|------|
| Docker Compose | 开发/测试/小规模生产 | 部署简单，易于管理 | 扩展性有限 |
| Kubernetes | 大规模生产 | 高可用，弹性扩展 | 复杂度高 |
| Systemd + 直接运行 | 传统服务器 | 资源占用少 | 无容器隔离 |

---

## Docker Compose 部署

### 前置条件

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
apt-get install docker-compose-plugin

# 验证安装
docker version
docker compose version
```

### 部署步骤

#### 1. 准备配置文件

```bash
# 创建部署目录
mkdir -p /opt/topems
cd /opt/topems

# 复制环境变量模板
cp deploy/env/.env.production.template .env

# 编辑环境变量
vim .env
```

关键配置项：

```env
# 数据库配置
DATABASE_URL=postgresql://topems:password@postgres:5432/topems

# JWT 密钥（必须修改）
JWT_SECRET=your_secure_jwt_secret_here

# 服务端口
PORTAL_SERVICE_PORT=8080
UNIFIED_CORE_PORT=8001
```

#### 2. 启动基础设施服务（监控）

```bash
cd /opt/topems/deploy/monitoring
docker compose up -d

# 验证服务
docker compose ps
```

#### 3. 启动核心服务

```bash
cd /opt/topems
docker compose -f docker-compose.services.yml up -d

# 查看服务状态
docker compose ps
```

#### 4. 验证部署

```bash
# 检查 Portal 健康状态
curl http://localhost:8080/health

# 检查 API 文档
curl http://localhost:8080/api/docs
```

### Docker Compose 文件说明

| 文件 | 说明 |
|------|------|
| `docker-compose.services.yml` | 核心业务服务 |
| `docker-compose.full.yml` | 完整部署（含监控） |
| `deploy/monitoring/docker-compose.yml` | 监控组件 |

### 服务网络

所有服务通过 `topems_network` 桥接网络通信：

```yaml
networks:
  topems_network:
    driver: bridge
```

服务间通信使用服务名作为主机名：
- `postgres:5432` - 数据库
- `redis:6379` - 缓存
- `portal:8080` - API 网关

---

## Kubernetes 部署

### 前置条件

```bash
# 安装 kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
mv kubectl /usr/local/bin/

# 安装 Helm
curl -fsSL https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz | tar -xz
mv linux-amd64/helm /usr/local/bin/
```

### 部署步骤

#### 1. 创建命名空间

```bash
kubectl create namespace topems
```

#### 2. 创建 Secret

```bash
# 创建数据库密钥
kubectl create secret generic topems-secrets \
  --from-literal= database-url="postgresql://topems:password@postgres:5432/topems" \
  --from-literal= jwt-secret="your_jwt_secret" \
  --namespace=topems
```

#### 3. 部署配置

```bash
# 部署 GIS 服务（示例）
kubectl apply -f deploy/k8s/gis-deployment.yaml

# 部署其他服务（批量）
kubectl apply -f deploy/k8s/

# 查看部署状态
kubectl get pods -n topems
```

### Kubernetes 资源配置

#### Deployment 示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: topems-portal
  namespace: topems
spec:
  replicas: 2
  selector:
    matchLabels:
      app: topems-portal
  template:
    metadata:
      labels:
        app: topems-portal
    spec:
      containers:
        - name: portal
          image: topems-portal:latest
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
```

#### HPA（水平自动扩展）示例

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: topems-portal-hpa
  namespace: topems
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: topems-portal
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### 服务访问

```bash
# 通过 NodePort 访问
kubectl get svc -n topems

# 通过 Ingress 访问（需配置 Ingress Controller）
kubectl apply -f deploy/k8s/ingress.yaml
```

---

## 系统服务部署（Systemd）

### 适用场景

适用于没有 Docker/Kubernetes 环境的传统服务器部署。

### 安装步骤

```bash
# 以 root 身份运行安装脚本
cd /opt/topems
./deploy/scripts/install.sh --prefix /opt/topems --user topems
```

### 服务管理

```bash
# 启动所有服务
systemctl start topems.target

# 停止所有服务
systemctl stop topems.target

# 重启所有服务
systemctl restart topems.target

# 查看服务状态
systemctl status topems.target

# 查看单个服务状态
systemctl status topems-unified-core.service
```

### 服务列表

| 服务单元 | 说明 |
|----------|------|
| `topems.target` | 整体服务目标 |
| `topems-portal.service` | API 网关 |
| `topems-unified-core.service` | 核心服务 |
| `topems-ai.service` | AI 服务 |
| `topems-analytics.service` | 分析服务 |
| `topems-manufacturing.service` | 生产服务 |
| `topems-quality-assurance.service` | 质量服务 |
| `topems-hrm.service` | HRM 服务 |
| `topems-crm.service` | CRM 服务 |
| `topems-pm.service` | PM 服务 |
| `topems-erp.service` | ERP 服务 |
| `topems-gis.service` | GIS 服务 |
| `topems-rs.service` | 资源服务 |
| `topems-scm.service` | SCM 服务 |
| `topems-wms.service` | WMS 服务 |
| `topems-mobile.service` | 移动服务 |
| `topems-monitor.service` | 监控服务 |

### 日志管理

```bash
# 查看实时日志
journalctl -u topems-unified-core -f

# 查看最近 100 行日志
journalctl -u topems-unified-core -n 100

# 查看指定时间范围的日志
journalctl -u topems-unified-core --since "2024-01-01 00:00:00"
```

---

## Nginx 配置

### 配置文件位置

- 开发环境: `deploy/nginx/topems.conf`
- 生产环境: `/etc/nginx/conf.d/topems.conf`

### 配置示例

```nginx
upstream topems_portal {
    server localhost:8080;
}

upstream topems_core {
    server localhost:8001;
}

server {
    listen 80;
    server_name topems.example.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name topems.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    client_max_body_size 100M;

    location / {
        proxy_pass http://topems_portal;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://topems_portal;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /core/ {
        proxy_pass http://topems_core;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 验证配置

```bash
# 测试配置语法
nginx -t

# 重载配置
nginx -s reload
```

---

## 配置管理

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ENVIRONMENT` | 运行环境 | production |
| `LOG_LEVEL` | 日志级别 | info |
| `DATABASE_URL` | 数据库连接 | - |
| `REDIS_URL` | Redis 连接 | - |
| `JWT_SECRET` | JWT 密钥 | - |
| `PORTAL_SERVICE_PORT` | Portal 端口 | 8080 |

### 配置优先级

1. 环境变量（最高优先级）
2. 配置文件（`.env`）
3. 默认值（最低优先级）

### 生产环境配置检查清单

- [ ] 修改 `JWT_SECRET` 为强随机密钥
- [ ] 配置正确的 `DATABASE_URL`
- [ ] 配置 `CORS_ALLOWED_ORIGINS`
- [ ] 配置 SMTP 邮件发送
- [ ] 启用 HTTPS
- [ ] 配置备份策略

---

## 部署验证

### 健康检查

```bash
# 检查所有服务健康状态
curl http://localhost:8080/health

# 检查数据库连接
psql $DATABASE_URL -c "SELECT 1"

# 检查 Redis 连接
redis-cli ping
```

### 性能验证

```bash
# 检查服务响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/health

# 检查并发处理能力
wrk -t12 -c400 -d30s http://localhost:8080/api/health
```

### 日志检查

```bash
# 检查错误日志
grep -i error /opt/topems/logs/*.log | tail -100

# 检查访问日志
tail -f /var/log/nginx/access.log
```

---

## 回滚操作

### Docker Compose 回滚

```bash
# 查看历史版本
docker compose ps

# 回滚到上一个版本
docker compose rollback

# 回滚到指定版本
docker compose rollback --to <revision>
```

### Kubernetes 回滚

```bash
# 查看部署历史
kubectl rollout history deployment/topems-portal -n topems

# 回滚到上一个版本
kubectl rollout undo deployment/topems-portal -n topems

# 回滚到指定版本
kubectl rollout undo deployment/topems-portal -n topems --to-revision=<version>
```

---

## 扩展阅读

- [监控告警运维指南](./monitoring-alerting.md)
- [数据库维护指南](./database-maintenance.md)
- [日志管理指南](./logging-guide.md)
