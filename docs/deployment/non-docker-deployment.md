# TOPEMS 部署指南（非 Docker）

本文档介绍如何在 Linux 服务器上直接部署 TOPEMS 系统，不使用 Docker。

## 目录

1. [系统要求](#系统要求)
2. [准备工作](#准备工作)
3. [安装步骤](#安装步骤)
4. [配置说明](#配置说明)
5. [服务管理](#服务管理)
6. [监控配置](#监控配置)
7. [更新升级](#更新升级)
8. [故障排查](#故障排查)

---

## 系统要求

### 硬件要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 4核 | 8核+ |
| 内存 | 8GB | 16GB+ |
| 存储 | 50GB | 100GB+ SSD |
| 网络 | 100Mbps | 1Gbps |

### 软件要求

| 软件 | 版本要求 |
|------|----------|
| 操作系统 | Ubuntu 22.04 / CentOS 8 / Debian 11 |
| PostgreSQL | 15+ |
| Redis | 7+ (可选) |
| Rust | 1.75+ |
| Node.js | 18+ |
| Nginx | 1.20+ |

---

## 准备工作

### 1. 安装依赖软件

**Ubuntu/Debian:**

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git build-essential

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安装 Redis (可选)
sudo apt install -y redis-server

# 安装 Nginx
sudo apt install -y nginx

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

**CentOS/RHEL:**

```bash
# 更新系统
sudo yum update -y

# 安装基础工具
sudo yum install -y curl wget git gcc make

# 安装 PostgreSQL
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 安装 Redis (可选)
sudo yum install -y redis
sudo systemctl enable redis
sudo systemctl start redis

# 安装 Nginx
sudo yum install -y nginx

# 安装 Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 2. 配置 PostgreSQL

```bash
# 创建数据库用户和数据库
sudo -u postgres psql

postgres=# CREATE USER topems WITH PASSWORD 'your_password';
postgres=# CREATE DATABASE topems OWNER topems;
postgres=# GRANT ALL PRIVILEGES ON DATABASE topems TO topems;
postgres=# \q

# 配置 PostgreSQL 允许本地连接
sudo vim /etc/postgresql/15/main/pg_hba.conf
# 添加:
# local   all             topems                                  md5
# host    all             topems          127.0.0.1/32            md5

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 3. 安装 pgvector (可选，用于 AI 功能)

```bash
# 安装 pgvector 扩展
sudo apt install -y postgresql-15-pgvector

# 或从源码安装
cd /tmp
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# 在数据库中启用扩展
sudo -u postgres psql -d topems
topems=# CREATE EXTENSION vector;
topems=# \q
```

---

## 安装步骤

### 1. 获取源码

```bash
# 克隆仓库
git clone https://github.com/topems/topems.git
cd topems
```

### 2. 运行安装脚本

```bash
# 运行安装脚本
sudo ./deploy/scripts/install.sh

# 或指定自定义安装目录
sudo ./deploy/scripts/install.sh --prefix /opt/topems --user topems
```

安装脚本会：
- 创建目录结构 (`/opt/topems/bin`, `/opt/topems/config`, `/opt/topems/data`, `/opt/topems/logs`)
- 创建服务用户 `topems`
- 编译所有后端服务
- 构建前端应用
- 安装 systemd 服务配置

### 3. 初始化数据库

```bash
# 运行数据库初始化脚本
sudo ./deploy/scripts/setup-db.sh \
  --host localhost \
  --port 5432 \
  --user topems \
  --password your_password \
  --database topems \
  --create-user \
  --create-db \
  --init-schema
```

### 4. 配置环境变量

```bash
# 复制配置模板
sudo cp /opt/topems/config/.env.template /opt/topems/config/.env

# 编辑配置文件
sudo vim /opt/topems/config/.env

# 重要配置项:
# DATABASE_URL=postgresql://topems:your_password@localhost:5432/topems
# JWT_SECRET=your_strong_jwt_secret
# REDIS_URL=redis://localhost:6379
```

---

## 配置说明

### 服务端口配置

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| Portal | 8080 | API 网关 |
| Unified Core | 8001 | IAM, Doc, Flow, File, Communication, Tenant, Billing, Plugin |
| AI | 8002 | AI 服务 |
| Analytics | 8003 | BI, Report |
| Manufacturing | 8004 | MES, PDM |
| Quality Assurance | 8005 | QMS, LIMS, EHS |
| HRM | 8006 | 人力资源管理 |
| CRM | 8007 | 客户关系管理 |
| PM | 8008 | 项目管理 |
| ERP | 8009 | 企业资源计划 |
| GIS | 8010 | 地理信息系统 |
| RS | 8011 | 研发管理 |
| SCM | 8012 | 供应链管理 |
| WMS | 8013 | 仓库管理 |
| Mobile | 8014 | 移动服务 |
| Monitor | 8015 | 监控服务 |

### Nginx 反向代理配置

```nginx
# /etc/nginx/sites-available/topems.conf
upstream topems_portal {
    server localhost:8080;
}

server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    # 前端静态文件
    location / {
        root /opt/topems/web;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://topems_portal;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 支持
    location /ws/ {
        proxy_pass http://topems_portal;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/topems.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 服务管理

### 启动服务

```bash
# 启动所有服务
sudo systemctl start topems.target

# 启动单个服务
sudo systemctl start topems-unified-core.service
```

### 停止服务

```bash
# 停止所有服务
sudo systemctl stop topems.target

# 停止单个服务
sudo systemctl stop topems-hrm.service
```

### 重启服务

```bash
# 重启所有服务
sudo systemctl restart topems.target

# 重启单个服务
sudo systemctl restart topems-ai.service
```

### 查看服务状态

```bash
# 查看所有服务状态
sudo ./deploy/scripts/manage.sh status

# 查看单个服务状态
sudo systemctl status topems-unified-core.service
```

### 查看日志

```bash
# 查看服务日志
sudo journalctl -u topems-unified-core -f

# 查看所有服务日志
sudo journalctl -u topems.target -f
```

### 使用管理脚本

```bash
# 查看帮助
./deploy/scripts/manage.sh help

# 列出所有服务
./deploy/scripts/manage.sh list

# 启动服务
./deploy/scripts/manage.sh start hrm

# 停止服务
./deploy/scripts/manage.sh stop ai

# 查看日志
./deploy/scripts/manage.sh logs unified-core
```

---

## 监控配置

### 安装 Prometheus

```bash
# 下载 Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xzf prometheus-2.45.0.linux-amd64.tar.gz

# 安装
sudo cp prometheus-2.45.0.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-2.45.0.linux-amd64/promtool /usr/local/bin/

# 创建用户
sudo useradd -r -s /bin/false prometheus

# 创建目录
sudo mkdir -p /opt/topems/data/prometheus
sudo chown -R prometheus:prometheus /opt/topems/data/prometheus

# 复制配置
sudo cp deploy/monitoring/prometheus/prometheus.yml /opt/topems/config/
sudo cp deploy/monitoring/prometheus/alerts.yml /opt/topems/config/

# 安装 systemd 服务
sudo cp deploy/systemd/prometheus.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus
```

### 安装 Grafana

```bash
# 下载 Grafana
wget https://dl.grafana.com/oss/release/grafana-10.0.0.linux-amd64.tar.gz
tar xzf grafana-10.0.0.linux-amd64.tar.gz

# 安装
sudo cp -r grafana-10.0.0 /usr/share/grafana
sudo cp grafana-10.0.0/bin/grafana-server /usr/local/bin/

# 创建用户
sudo useradd -r -s /bin/false grafana

# 创建目录
sudo mkdir -p /opt/topems/data/grafana /opt/topems/logs/grafana
sudo chown -R grafana:grafana /opt/topems/data/grafana /opt/topems/logs/grafana

# 复制配置
sudo cp deploy/monitoring/grafana/grafana.ini /opt/topems/config/

# 安装 systemd 服务
sudo cp deploy/systemd/grafana.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable grafana
sudo systemctl start grafana
```

访问 Grafana: `http://localhost:3000` (默认用户: admin/admin)

---

## 更新升级

### 手动更新

```bash
# 拉取最新代码
git pull origin main

# 运行更新脚本
sudo ./deploy/scripts/update.sh --restart

# 或更新特定服务
sudo ./deploy/scripts/update.sh --services hrm,crm --restart
```

### 自动更新（CI/CD）

配置 GitHub Actions 后，可以通过以下方式触发部署：

1. **标签触发**: 创建新版本标签
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **手动触发**: 在 GitHub Actions 页面手动运行 `deploy.yml` workflow

---

## 故障排查

### 服务无法启动

```bash
# 检查服务状态
sudo systemctl status topems-unified-core.service

# 查看详细日志
sudo journalctl -u topems-unified-core.service -n 100

# 检查配置文件
cat /opt/topems/config/.env

# 检查数据库连接
psql -h localhost -U topems -d topems -c "SELECT 1;"
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接配置
sudo vim /etc/postgresql/15/main/pg_hba.conf

# 测试连接
psql -h localhost -U topems -d topems
```

### 前端无法访问

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 检查 Nginx 配置
sudo nginx -t

# 检查前端文件
ls -la /opt/topems/web/

# 检查 Portal 服务
curl http://localhost:8080/health
```

### 性能问题

```bash
# 检查系统资源
top
htop

# 检查内存使用
free -m

# 检查磁盘使用
df -h

# 检查数据库连接数
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# 查看 Prometheus 指标
curl http://localhost:9090/api/v1/query?query=up
```

---

## 安全建议

1. **修改默认密码**: 更改数据库密码、JWT 密钥、Grafana 密码
2. **启用 HTTPS**: 配置 SSL 证书
3. **防火墙配置**: 只开放必要端口
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
4. **定期备份**: 配置数据库自动备份
5. **日志审计**: 定期检查系统日志

---

## 附录

### 服务依赖关系

```
topems.target
├── topems-portal.service (依赖所有服务)
├── topems-unified-core.service (核心服务)
├── topems-ai.service
├── topems-analytics.service
├── topems-manufacturing.service
├── topems-quality-assurance.service
├── topems-hrm.service
├── topems-crm.service
├── topems-pm.service
├── topems-erp.service
├── topems-gis.service
├── topems-rs.service
├── topems-scm.service
├── topems-wms.service
├── topems-mobile.service
└── topems-monitor.service
```

### 目录结构

```
/opt/topems/
├── bin/                    # 服务二进制文件
│   ├── unified-core-service
│   ├── ai-service
│   ├── ...
├── config/                 # 配置文件
│   ├── .env
│   ├── prometheus.yml
│   ├── alerts.yml
│   ├── grafana.ini
├── data/                   # 数据目录
│   ├── files/
│   ├── plugins/
│   ├── prometheus/
│   ├── grafana/
├── logs/                   # 日志目录
├── web/                    # 前端静态文件
└── releases/               # 版本发布目录
```

---

如有问题，请查看项目文档或提交 Issue。