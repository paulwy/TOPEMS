# TOPEMS 企业级数字化平台

> 统一身份认证与授权管理、文档管理、AI协作、流程自动化、数据分析、质量管理、供应链管理

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Rust](https://img.shields.io/badge/rust-1.70%2B-orange)
![React](https://img.shields.io/badge/react-18-blue)

## 🌟 功能特性

### 核心服务
- 🔐 **身份认证** - IAM 身份认证，统一权限管理，安全审计
- 📄 **文档管理** - 智能文档管理，版本控制，协作编辑
- 🔀 **流程自动化** - 可视化流程设计，审批工作流
- 📢 **通知服务** - 实时通知，消息推送

### 业务服务
- 🤖 **AI 服务** - 智能问答，文档摘要，自动化建议
- 📊 **数据分析** - 实时报表，数据可视化
- 🏭 **质量管控** - QMS质量管理，EHS安全环保
- 💼 **资源规划** - ERP企业资源，MES制造执行
- 📦 **供应链** - SCM供应链，SRM供应商，CRM客户关系
- 📦 **仓储物流** - WMS仓库管理
- 👥 **人力资源** - HRM人力资源管理
- 🔬 **实验室** - LIMS实验室管理
- 🔬 **研发管理** - RS科研研发
- 🌍 **地理信息** - GIS服务
- 📋 **产品数据** - PDM产品数据管理
- 💬 **即时通讯** - IM即时通讯
- 📈 **商业智能** - BI数据分析
- 📮 **邮件服务** - 邮件发送与模板
- 📱 **移动端** - 移动端API服务
- 🏠 **企业门户** - 统一门户入口
- 🔗 **系统集成** - 系统集成服务

### 技术亮点
- ⚡ **高性能** - Rust 后端，极快响应
- 📱 **响应式** - 完美适配移动端
- 🎨 **现代化** - 优雅的 UI 设计
- 🔒 **安全** - 企业级安全保障
- 🌐 **PWA 支持** - 离线访问，快速启动
- 🎯 **微服务架构** - 20+个独立服务，灵活扩展
- 🔄 **统一架构** - 统一的认证保护和架构规范化

## 📁 项目结构

```
topems/
├── docs/                          # 文档
│   ├── api/                      # API 文档
│   ├── architecture/             # 架构设计
│   ├── deployment/               # 部署指南
│   ├── guides/                   # 用户指南
│   ├── services/                 # 服务文档
│   └── user/                     # 用户手册
├── frontend/                      # 前端应用
│   ├── src/
│   │   ├── components/           # 可复用组件
│   │   ├── pages/               # 页面组件
│   │   ├── hooks/               # 自定义 hooks
│   │   ├── api/                 # API 客户端
│   │   └── store/               # 状态管理
│   └── vite.config.ts           # Vite 配置
├── platform/                      # 核心平台服务
│   ├── topems-iam/              # 身份认证服务 (8000)
│   ├── topems-doc/              # 文档管理服务 (8001)
│   └── topems-flow/             # 工作流服务 (8006)
├── services/                      # 业务应用服务
│   ├── notification-service/     # 通知服务 (8003)
│   ├── topems-integration/      # 集成服务 (8004)
│   ├── topems-portal/           # 企业门户 (8005)
│   ├── topems-erp/              # 企业资源计划 (8010)
│   ├── topems-hrm/              # 人力资源管理 (8011)
│   ├── topems-ai/               # AI 知识库 (8013)
│   ├── topems-rs/               # 研发管理系统 (8020)
│   ├── topems-lims/             # 实验室系统 (8022)
│   ├── topems-crm/              # 客户关系管理 (8012)
│   ├── topems-mes/              # 制造执行系统 (8030)
│   ├── topems-qms/              # 质量管理系统 (8031)
│   ├── topems-ehs/              # 安全管理系统 (8032)
│   ├── topems-scm/              # 供应链系统 (8040)
│   ├── topems-srm/              # 供应商管理 (8041)
│   ├── topems-wms/              # 仓库管理系统 (8042)
│   ├── topems-gis/              # 地理信息系统 (8050)
│   ├── topems-im/               # 即时通讯 (8051)
│   ├── topems-bi/               # 商业智能 (8052)
│   ├── report-service/           # 报表服务 (8053)
│   ├── topems-mail/             # 邮件服务 (8054)
│   ├── topems-mobile/           # 移动端服务 (8055)
│   └── topems-pdm/              # 产品数据管理 (8023)
├── shared/                        # 共享库
│   └── lib/                     # topems-shared 库
├── scripts/                       # 管理脚本
├── tools/                         # 开发工具
├── templates/                     # 数据模板
└── docker-compose.yml             # Docker 配置
```

## 🚀 快速开始

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000

### 后端开发

```bash
# 启动单个服务（示例 IAM）
cd platform/topems-iam/backend
cargo run
```

服务运行在 http://localhost:8000

### 数据库初始化

```bash
# 使用脚本初始化数据库
./scripts/init-database.sh
```

## 📖 文档

- [API概览](./docs/api/API_DOCUMENTATION.md) - API 文档总览
- [架构设计](./docs/architecture/overview.md) - 系统架构设计
- [部署指南](./docs/deployment/DEPLOYMENT_GUIDE.md) - 部署指南
- [用户指南](./docs/guides/USER_GUIDE.md) - 用户使用指南
- [服务文档](./docs/services/) - 各个服务详细文档

## 🛠️ 脚本工具

- `scripts/init-database.sh` - 初始化数据库
- `scripts/init-hrm-data.py` - 初始化 HRM 数据
- `scripts/manage-services.sh` - 管理所有服务
- `scripts/start-all.sh` - 启动所有服务
- `scripts/stop-all.sh` - 停止所有服务
- `scripts/cleanup.sh` - 清理临时文件
- `scripts/quick-start.sh` - 快速启动项目

## 📄 许可证

MIT License

## 👥 团队

- Engineering Lead
- Frontend Engineers
- Backend Engineers
- DevOps Engineers

---

**最后更新**: 2026-06-04
**版本**: v2.0.0
