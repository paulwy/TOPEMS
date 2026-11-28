# TOPEMS 模块化单体部署手册

> 文档版本：v1.0
> 更新日期：2026-09-16
> 适用版本：TOPEMS v5.15.0+

> **环境边界（2026-11-13 实测）**：本文为 2026-09 的部署方式记录（docker/systemd 口径），**不是当前本机生产**。当前 xingzhai 生产机为 **macOS launchd**：`com.topems.server`（`/Users/xingzhai/topems/bin/topems-server`，`:8099`）+ `com.topems.nginx`（80/443 直接 `proxy_pass http://127.0.0.1:8099`），生产库 `topems_prod`。当前部署以 `docs/deploy/macos-deployment.md` 为准。

---

## 概述

TOPEMS 已从 32 个独立微服务迁移到模块化单体架构，统一入口为 `svc/server/`。

### 架构变化

| 架构 | 说明 |
|------|------|
| 旧架构 | 32 个独立微服务 |
| 新架构 | 7 个核心模块组的模块化单体（27 个模块已接入） |

### 核心模块组

| 模块组 | 模块 | Feature Flag |
|--------|------|--------------|
| core | unified-core, monitor, plugin-registry, search, communication, integration, mobile | `module-core`, `module-monitor`, `module-plugin-registry`, `module-search`, `module-communication`, `module-integration`, `module-mobile` |
| erp | erp, scm, srm, pm, rd | `module-erp`, `module-scm`, `module-srm`, `module-pm`, `module-rd` |
| finance | finance | `module-finance` |
| crm | crm | `module-crm` |
| wms | mes, wms, tms, qms, lims, ehs | `module-mes`, `module-wms`, `module-tms`, `module-qms`, `module-lims`, `module-ehs` |

---

## 环境要求

### 硬件要求

| 资源 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 4 核 | 8 核+ |
| 内存 | 8 GB | 16 GB+ |
| 磁盘 | 50 GB | 100 GB+ |

### 软件要求

| 软件 | 版本 |
|------|------|
| Rust | 1.70+ |
| Node.js | 18+ |
| pnpm | 9+ |
| PostgreSQL | 14+（推荐 pgvector/pg18） |
| Redis | 7+ |
| Docker | 20+（可选，用于数据库基础设施） |

---

## 快速开始

### 1. 克隆仓库

```bash
git clone <repository-url>
cd topems
```

### 2. 配置环境变量

```bash
# 复制生产环境配置文件
cp .env.production /opt/topems/config/.env

# 编辑配置文件
vi /opt/topems/config/.env
```

### 3. 配置数据库

```bash
# 使用 Docker Compose 启动数据库基础设施
> ⚠️ **2026-10-08 起 docker-compose 部署已弃用**（Docker 卸载；本机生产走 macOS launchd `scripts/deploy-prod.sh`，Linux 目标机用 systemd 模板 `scripts/deploy/install.sh`）；本节为历史部署方式参考。
cd deploy/docker
docker-compose up -d postgres redis rabbitmq
```

### 4. 构建前端

```bash
cd apps/web
pnpm install
pnpm build
```

### 5. 构建后端

```bash
cd /Users/air/TOPEMS
cargo build --release -p topems-server --features "module-core module-monitor module-plugin-registry module-search module-communication module-integration module-mobile"
```

### 6. 启动服务

```bash
# 启动统一入口服务
./target/release/topems-server
```

---

## 生产环境配置

### 环境变量

| 变量 | 说明 | 生产环境建议 |
|------|------|--------------|
| `ENVIRONMENT` | 环境标识 | `production` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `DATABASE_URL` | 数据库连接 | 修改为生产数据库地址 |
| `DATABASE_MAX_CONNECTIONS` | 连接池大小 | `100` |
| `JWT_SECRET` | JWT 密钥 | 强随机值（≥32 字符） |
| `JWT_REFRESH_SECRET` | JWT 刷新密钥 | 强随机值（≥32 字符） |
| `SESSION_SECRET` | Session 密钥 | 强随机值（≥32 字符） |
| `PLUGIN_REGISTRATION_TOKEN` | 插件注册令牌 | 强随机值（hex 32） |

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| unified-core | 8000 | 核心服务（IAM, Doc, Flow, File, Monitor） |
| erp | 8010 | ERP 服务 |
| finance | 8011 | 财务服务 |
| ai | 8013 | AI 服务 |
| hrm | 8020 | HRM 服务 |
| pm | 8023 | PM 服务 |
| crm | 8029 | CRM 服务 |
| mes | 8030 | MES 服务 |
| wms | 8041 | WMS 服务 |
| qms | 8050 | QMS 服务 |
| bi | 8060 | BI 服务 |
| mobile | 8070 | 移动端服务 |

---

## Docker 部署

### Docker Compose

```bash
cd deploy/docker

# 启动数据库基础设施
docker-compose up -d postgres redis rabbitmq

# 启动应用服务
docker-compose up -d topems-server
```

### Docker 镜像

```bash
# 构建后端镜像
docker build -t topems-server -f svc/server/Dockerfile .

# 构建前端镜像
docker build -t topems-web -f apps/web/Dockerfile .
```

---

## 数据库迁移

### 运行迁移

```bash
# 使用迁移脚本
./scripts/migrate.sh

# 或使用 sqlx
sqlx migrate run --database-url $MIGRATE_URL
```

### 验证迁移

```bash
# 检查数据库 schema
psql $DATABASE_URL -c "\dt"
```

---

## 监控和日志

### Prometheus 监控

```bash
# Prometheus 指标
curl http://localhost:8000/metrics

# 健康检查
curl http://localhost:8000/health
```

### 日志

```bash
# 查看服务日志
docker logs -f topems-server

# 查看应用日志
tail -f /var/log/topems/server.log
```

---

## 故障排除

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 数据库连接失败 | 检查 DATABASE_URL 和数据库服务状态 |
| JWT 认证失败 | 检查 JWT_SECRET 配置 |
| 端口冲突 | 检查端口分配，修改环境变量 |
| 内存不足 | 增加内存或减少 DATABASE_MAX_CONNECTIONS |

### 日志级别调试

```bash
# 临时设置日志级别为 debug
export LOG_LEVEL=debug
./target/release/topems-server
```

---

## 相关文档

- [API 文档](../api/README.md)
- [Core 组模块 API](../api/API_CORE.md)
- [架构路线图](../archive/misc/TOPEMS_Architecture_Roadmap_v2.md)
- [项目总结报告](../archive/misc/PROJECT_COMPLETION_REPORT.md)
