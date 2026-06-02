# TOPEMS 本地开发指南

## ✅ 当前状态

**PostgreSQL 和 Redis 容器已成功运行！**
**所有 17 个微服务均已就绪！**

```
✅ topems-postgres: 正常运行 (端口 5432)
✅ topems-redis:    正常运行 (端口 6379)
✅ 17个微服务:      全部可用
```

---

## 🚀 启动服务

### 1. 一键启动所有服务（推荐）

```bash
cd /Users/xingzhai/TOPEMS
chmod +x scripts/start-all-services.sh
./scripts/start-all-services.sh
```

### 2. 单独启动服务（如果需要）

#### 核心服务

```bash
# IAM 身份认证
cd /Users/xingzhai/TOPEMS/services/topems-iam/backend
cargo run
# 服务地址: http://localhost:8002

# DOC 文档管理
cd /Users/xingzhai/TOPEMS/services/topems-doc/backend
cargo run
# 服务地址: http://localhost:8001

# AI 智能服务
cd /Users/xingzhai/TOPEMS/services/topems-ai/backend
cargo run
# 服务地址: http://localhost:8003

# FLOW 工作流
cd /Users/xingzhai/TOPEMS/services/topems-flow/backend
cargo run
# 服务地址: http://localhost:8004

# RS 研发管理
cd /Users/xingzhai/TOPEMS/services/topems-rs/backend
cargo run
# 服务地址: http://localhost:8005

# LIMS 实验室
cd /Users/xingzhai/TOPEMS/services/topems-lims/backend
cargo run
# 服务地址: http://localhost:8006

# HRM 人力资源
cd /Users/xingzhai/TOPEMS/services/topems-hrm/backend
cargo run
# 服务地址: http://localhost:8010
```

#### 企业增强服务

```bash
# QMS 质量管理
cd /Users/xingzhai/TOPEMS/services/topems-qms/backend
cargo run
# 服务地址: http://localhost:8007

# EHS 安全环保
cd /Users/xingzhai/TOPEMS/services/topems-ehs/backend
cargo run
# 服务地址: http://localhost:8008

# ERP 企业资源
cd /Users/xingzhai/TOPEMS/services/topems-erp/backend
cargo run
# 服务地址: http://localhost:8009

# BI 商业智能
cd /Users/xingzhai/TOPEMS/services/topems-bi/backend
cargo run
# 服务地址: http://localhost:8022
```

#### 生态集成服务

```bash
# SCM 供应链
cd /Users/xingzhai/TOPEMS/services/topems-scm/backend
cargo run
# 服务地址: http://localhost:8016

# SRM 供应商
cd /Users/xingzhai/TOPEMS/services/topems-srm/backend
cargo run
# 服务地址: http://localhost:8018

# MAIL 邮件服务
cd /Users/xingzhai/TOPEMS/services/topems-mail/backend
cargo run
# 服务地址: http://localhost:8026

# NOTIFICATION 通知服务
cd /Users/xingzhai/TOPEMS/services/topems-notification/backend
cargo run
# 服务地址: http://localhost:8023

# PORTAL 统一门户
cd /Users/xingzhai/TOPEMS/services/topems-portal/backend
cargo run
# 服务地址: http://localhost:9021

# MES 制造执行
cd /Users/xingzhai/TOPEMS/services/topems-mes/backend
cargo run
# 服务地址: http://localhost:8014

# CRM 客户关系
cd /Users/xingzhai/TOPEMS/services/topems-crm/backend
cargo run
# 服务地址: http://localhost:8013

# WMS 仓库管理
cd /Users/xingzhai/TOPEMS/services/topems-wms/backend
cargo run
# 服务地址: http://localhost:8020
```

### 3. 启动前端

```bash
cd /Users/xingzhai/TOPEMS/frontend
npm install
npm run dev
```
- 前端地址: http://localhost:3000

---

## 📋 服务地址完整列表

### 基础设施
| 服务 | 地址 | 说明 |
|------|------|------|
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |

### 核心服务
| 服务 | 地址 | 说明 |
|------|------|------|
| IAM | http://localhost:8002 | 身份认证 |
| DOC | http://localhost:8001 | 文档管理 |
| AI | http://localhost:8003 | 智能服务 |
| FLOW | http://localhost:8004 | 工作流 |
| RS | http://localhost:8005 | 研发管理 |
| LIMS | http://localhost:8006 | 实验室管理 |
| HRM | http://localhost:8010 | 人力资源 |

### 企业增强服务
| 服务 | 地址 | 说明 |
|------|------|------|
| QMS | http://localhost:8007 | 质量管理 |
| EHS | http://localhost:8008 | 安全环保 |
| ERP | http://localhost:8009 | 企业资源 |
| BI | http://localhost:8022 | 商业智能 |

### 生态集成服务
| 服务 | 地址 | 说明 |
|------|------|------|
| SCM | http://localhost:8016 | 供应链 |
| SRM | http://localhost:8018 | 供应商 |
| MAIL | http://localhost:8026 | 邮件服务 |
| NOTIFICATION | http://localhost:8023 | 通知服务 |
| PORTAL | http://localhost:9021 | 统一门户 |
| MES | http://localhost:8014 | 制造执行 |
| CRM | http://localhost:8013 | 客户关系 |
| WMS | http://localhost:8020 | 仓库管理 |

### 前端
| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:3001 | 用户界面 |

---

## 🔧 常用命令

### 查看服务状态
```bash
cd /Users/xingzhai/TOPEMS
./scripts/check-services-status.sh
```

### 查看容器状态
```bash
cd /Users/xingzhai/TOPEMS/docker
docker-compose ps
```

### 查看容器日志
```bash
# PostgreSQL 日志
docker logs -f topems-postgres

# Redis 日志
docker logs -f topems-redis
```

### 停止服务
```bash
# 停止 Docker 容器
cd /Users/xingzhai/TOPEMS/docker
docker-compose down

# 停止所有 Rust 服务
killall topems-iam topems-doc topems-ai topems-flow topems-rs topems-lims topems-hrm topems-qms topems-ehs topems-erp topems-bi topems-scm topems-srm topems-mail topems-notification topems-portal topems-mes topems-crm topems-wms
```

### 重新启动服务
```bash
cd /Users/xingzhai/TOPEMS/docker
docker-compose up -d
```

---

## 📝 注意事项

1. **先启动数据库**: 确保 PostgreSQL 和 Redis 容器先启动
2. **等待数据库**: 后端服务会等待数据库准备好才会完全启动
3. **端口占用**: 确保所有服务端口未被占用 (8001-8026, 3001, 5432, 6379)
4. **一键启动**: 推荐使用 scripts/start-all-services.sh 一键启动所有服务
5. **状态检查**: 使用 scripts/check-services-status.sh 查看服务运行状态

---

## 💡 测试建议

1. 先访问 http://localhost:3001
2. 使用测试账号登录（admin/admin123）
3. 测试各个功能模块
4. 检查前端控制台和后端日志

---

## 🎯 下一步

- ✅ 所有核心数据库服务已就绪
- ✅ 所有17个微服务已就绪
- 🚀 现在可以开始本地开发和测试！

---

## 📚 相关文档

- [完整服务状态报告](./docs/COMPLETE_SERVICE_STATUS_REPORT.md)
- [项目指南](./docs/PROJECT_GUIDE.md)
- [服务状态报告](./docs/SERVICE_STATUS_REPORT.md)
