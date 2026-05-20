# TOPEMS - 化工新材料企业数字化平台

TOPEMS 是面向高科技添加剂、精细化工、新材料研发生产型企业的全业务数字化平台。

## 📦 项目概览

### 中台底座系统
| 服务 | 状态 | 端口 | 说明 |
|-----|------|------|------|
| **topems-doc** | ✅ 可用 | 8001 | 统一文档管理服务 |
| topems-iam | ⏳ 待开发 | 8002 | 统一身份认证与权限 |
| topems-flow | ⏳ 待开发 | 8004 | 统一OA流程中台 |
| topems-mobile | ⏳ 待开发 | 8005 | 统一移动工作台 |
| topems-im | ⏳ 待开发 | 8006 | 即时通讯 |

### 业务独立产品
| 服务 | 优先级 | 说明 |
|-----|--------|------|
| topems-ai | ⭐⭐⭐ | 智能AI知识库 |
| topems-rs | ⭐⭐⭐ | 科研研发管理系统 |
| topems-lims | ⭐⭐⭐ | 实验室信息管理系统 |
| topems-qms | ⭐⭐ | 质量合规管理系统 |
| topems-ehs | ⭐⭐ | 安全环保职业健康系统 |
| topems-erp | ⭐⭐ | 新材料专用ERP |
| topems-srm | ⭐ | 供应商管理系统 |
| topems-gis | ⭐ | 厂区空间数字化系统 |
| topems-bi | ⭐ | 数据大屏与报表中台 |

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Rust 1.77+
- PostgreSQL 15+
- Redis 7+

### 启动服务

#### 1. 确保数据库服务运行
```bash
brew services list
```

#### 2. 启动 TOPEMS-DOC 文档管理
详见 [GETTING_STARTED.md](GETTING_STARTED.md)

## 📖 文档

- [GETTING_STARTED.md](GETTING_STARTED.md) - 快速启动指南
- [infrastructure/DOCKER_TROUBLESHOOT.md](infrastructure/DOCKER_TROUBLESHOOT.md) - Docker 故障排查
- [docs/architecture/overview.md](docs/architecture/overview.md) - 架构设计文档

## 🛠 技术栈

| 层级 | 技术 |
|-----|------|
| 前端 | React 18 + TypeScript 5 + Vite 6 |
| 后端 | Rust + Axum + SQLx |
| 数据库 | PostgreSQL 16 + Redis 7 |

## 版本

- v1.0.0 (2026-05-20) - 初始版本

---

**维护团队：TOPEMS Development Team**
