# TOPEMS 完整服务状态报告

**生成时间**: 2026-06-02  
**版本**: 2.0.0  
**状态**: ✅ 所有服务正常运行

---

## 📊 服务架构概览

TOPEMS 企业数字化平台采用微服务架构，共包含 17 个核心服务，分为三大类：

1. **核心服务** (7个) - 基础业务和基础设施
2. **企业增强服务** (4个) - 质量管理、资源规划等
3. **生态集成服务** (6个) - 供应链、客户关系等

---

## ✅ 服务状态详情

### 1. 核心服务

| 序号 | 服务名称 | 端口 | 健康状态 | 功能描述 | 路径 |
|------|----------|------|----------|----------|------|
| 1 | IAM 身份认证 | 8002 | ✅ 健康 | 用户认证、权限管理、统一登录 | services/topems-iam |
| 2 | DOC 文档管理 | 8001 | ✅ 健康 | 文件上传、文档协作、版本控制 | services/topems-doc |
| 3 | AI 智能服务 | 8003 | ✅ 健康 | 智能问答、文档分析、自动化建议 | services/topems-ai |
| 4 | FLOW 工作流 | 8004 | ✅ 健康 | 流程设计、审批引擎、任务管理 | services/topems-flow |
| 5 | RS 研发管理 | 8005 | ✅ 健康 | 科研项目、研发记录、配方管理 | services/topems-rs |
| 6 | LIMS 实验室 | 8006 | ✅ 健康 | 样品管理、实验记录、仪器管理 | services/topems-lims |
| 7 | HRM 人力资源 | 8010 | ✅ 健康 | 员工管理、考勤记录、组织架构 | services/topems-hrm |

### 2. 企业增强服务

| 序号 | 服务名称 | 端口 | 健康状态 | 功能描述 | 路径 |
|------|----------|------|----------|----------|------|
| 8 | QMS 质量管理 | 8007 | ✅ 健康 | 质量检验、问题追踪、质量报告 | services/topems-qms |
| 9 | EHS 安全环保 | 8008 | ✅ 健康 | 环境监测、安全检查、事故管理 | services/topems-ehs |
| 10 | ERP 企业资源 | 8009 | ✅ 健康 | 资源规划、资产管理、财务管理 | services/topems-erp |
| 11 | BI 商业智能 | 8022 | ✅ 健康 | 数据分析、报表生成、可视化 | services/topems-bi |

### 3. 生态集成服务

| 序号 | 服务名称 | 端口 | 健康状态 | 功能描述 | 路径 |
|------|----------|------|----------|----------|------|
| 12 | SCM 供应链 | 8016 | ✅ 健康 | 采购管理、库存监控、物流追踪 | services/topems-scm |
| 13 | SRM 供应商 | 8018 | ✅ 健康 | 供应商信息、资质管理、合作记录 | services/topems-srm |
| 14 | MAIL 邮件服务 | 8026 | ✅ 健康 | 邮件发送、接收管理、模板配置 | services/topems-mail |
| 15 | NOTIFICATION 通知 | 8023 | ✅ 健康 | 消息推送、通知订阅、多渠道发送 | services/topems-notification |
| 16 | PORTAL 统一门户 | 9021 | ✅ 健康 | 单点登录、首页聚合、服务导航 | services/topems-portal |
| 17 | MES 制造执行 | 8014 | ✅ 健康 | 生产计划、车间管理、过程控制 | services/topems-mes |
| 18 | CRM 客户关系 | 8013 | ✅ 健康 | 客户管理、销售追踪、服务记录 | services/topems-crm |
| 19 | WMS 仓库管理 | 8020 | ✅ 健康 | 仓储管理、库存盘点、出库入库 | services/topems-wms |

---

## 🌐 基础设施服务

| 服务 | 端口 | 状态 | 用途 |
|------|------|------|------|
| PostgreSQL | 5432 | ✅ 运行中 | 主数据库 |
| Redis | 6379 | ✅ 运行中 | 缓存和会话 |

---

## 🚀 快速开始

### 一键启动所有服务

```bash
cd /Users/xingzhai/TOPEMS
chmod +x scripts/start-all-services.sh
./scripts/start-all-services.sh
```

### 检查服务状态

```bash
chmod +x scripts/check-services-status.sh
./scripts/check-services-status.sh
```

### 访问应用

- **前端应用**: http://localhost:3000
- **API 文档**: 各服务的 /api/docs 或 /swagger-ui

---

## 💡 常用命令

### Docker 相关
```bash
# 查看容器状态
cd /Users/xingzhai/TOPEMS/docker
docker-compose ps

# 查看容器日志
docker logs -f topems-postgres
docker logs -f topems-redis

# 启动/停止容器
docker-compose up -d
docker-compose down
```

### 服务管理
```bash
# 启动所有服务
./scripts/start-all-services.sh

# 检查服务状态
./scripts/check-services-status.sh

# 停止所有服务
killall topems-iam topems-doc topems-ai topems-flow topems-rs topems-lims topems-hrm topems-qms topems-ehs topems-erp topems-bi topems-scm topems-srm topems-mail topems-notification topems-portal topems-mes topems-crm topems-wms
```

---

## 📝 技术栈

### 后端
- **语言**: Rust 1.70+
- **框架**: Axum
- **数据库**: PostgreSQL
- **缓存**: Redis
- **ORM**: SQLx

### 前端
- **框架**: React 18
- **构建工具**: Vite
- **状态管理**: Zustand

### 部署
- **容器化**: Docker + Docker Compose
- **架构**: 微服务

---

## 🎯 测试账号

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 管理员 | admin | admin123 | 完整权限 |
| 普通用户 | user | user123 | 基础权限 |
| 访客 | guest | guest123 | 只读权限 |

---

## 🔧 故障排查

### 端口冲突
```bash
# 检查端口占用
lsof -i :8002
lsof -i :3000
```

### 数据库连接
- 确保 PostgreSQL 容器正常运行
- 检查 .env 文件中的数据库配置
- 查看服务日志获取详细错误信息

### 服务无法启动
1. 检查 Docker 容器状态
2. 查看服务日志
3. 确保端口未被占用
4. 检查依赖服务是否正常

---

## 📚 相关文档

- [项目指南](./PROJECT_GUIDE.md)
- [服务启动指南](./SERVICE_STARTUP_GUIDE.md)
- [API 文档](./API_OVERVIEW.md)
- [技术规格](./TECHNICAL_SPEC.md)

---

**报告生成时间**: 2026-06-02  
**最后更新**: 2026-06-02  
**维护者**: TOPEMS 开发团队
