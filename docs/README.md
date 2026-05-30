# TOPEMS 文档索引

## 📚 核心文档

| 文档 | 说明 | 路径 |
|------|------|------|
| **README** | 项目主文档 | [README.md](../README.md) |
| **实施方案** | 项目整体实施方案 | [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) |
| **UI设计方案** | 界面设计规范 | [UI_DESIGN_SPEC.md](./UI_DESIGN_SPEC.md) |
| **技术规范** | 开发技术标准 | [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) |
| **架构设计** | 系统架构设计 | [architecture/overview.md](./architecture/overview.md) |
| **用户指南** | 完整使用指南 | [guides/USER_GUIDE.md](./guides/USER_GUIDE.md) |
| **API文档** | API接口汇总 | [API_OVERVIEW.md](./API_OVERVIEW.md) |

## 🏗 架构文档

| 文档 | 说明 | 路径 |
|------|------|------|
| 系统架构 | 整体架构设计 | [architecture/overview.md](./architecture/overview.md) |
| 服务设计 | 各服务详细设计 | [architecture/overview.md#3-服务架构设计](./architecture/overview.md#3-服务架构设计) |
| 数据架构 | 数据库设计方案 | [architecture/overview.md#4-数据架构设计](./architecture/overview.md#4-数据架构设计) |

## 🔧 开发规范

| 文档 | 说明 | 路径 |
|------|------|------|
| 后端规范 | Rust开发标准 | [TECHNICAL_SPEC.md#1-后端技术规范](./TECHNICAL_SPEC.md#1-后端技术规范-rust) |
| 前端规范 | React开发标准 | [TECHNICAL_SPEC.md#2-前端技术规范](./TECHNICAL_SPEC.md#2-前端技术规范-react) |
| 数据库规范 | SQL书写标准 | [TECHNICAL_SPEC.md#3-数据库规范](./TECHNICAL_SPEC.md#3-数据库规范) |
| API规范 | REST API设计 | [TECHNICAL_SPEC.md#4-api设计规范](./TECHNICAL_SPEC.md#4-api设计规范) |
| 安全规范 | 安全开发标准 | [TECHNICAL_SPEC.md#5-安全规范](./TECHNICAL_SPEC.md#5-安全规范) |
| 测试规范 | 测试编写标准 | [TECHNICAL_SPEC.md#6-测试规范](./TECHNICAL_SPEC.md#6-测试规范) |

## 🎨 UI设计

| 文档 | 说明 | 路径 |
|------|------|------|
| 色彩系统 | 配色规范 | [UI_DESIGN_SPEC.md#3-视觉规范](./UI_DESIGN_SPEC.md#3-视觉规范) |
| 字体系统 | 字体规范 | [UI_DESIGN_SPEC.md#3-视觉规范](./UI_DESIGN_SPEC.md#3-视觉规范) |
| 组件库 | UI组件规范 | [UI_DESIGN_SPEC.md#4-组件库](./UI_DESIGN_SPEC.md#4-组件库) |
| 布局系统 | 页面布局规范 | [UI_DESIGN_SPEC.md#5-布局系统](./UI_DESIGN_SPEC.md#5-布局系统) |
| 交互规范 | 交互动效规范 | [UI_DESIGN_SPEC.md#6-交互规范](./UI_DESIGN_SPEC.md#6-交互规范) |

## 📡 API 文档

| 服务 | 端口 | API 文档 |
|------|------|---------|
| **API汇总** | - | [API_OVERVIEW.md](./API_OVERVIEW.md) |
| 研发管理 | 8005 | [API_RS.md](./API_RS.md) |
| 实验室管理 | 8006 | [API_LIMS.md](./API_LIMS.md) |
| 质量管理 | 8007 | [API_QMS.md](./API_QMS.md) |
| 安全环保 | 8008 | [API_EHS.md](./API_EHS.md) |
| 认证服务 | 8002 | [API_AUTH.md](./API_AUTH.md) |
| 工作流 | 8004 | [API_WORKFLOW.md](./API_WORKFLOW.md) |
| 报表服务 | 8011 | [API_REPORT.md](./API_REPORT.md) |
| 供应商管理 | 8010 | [API_SRM.md](./API_SRM.md) |
| 产品数据管理 | 8015 | [API_PDM.md](./API_PDM.md) |
| 通知服务 | - | [API_NOTIFICATION.md](./API_NOTIFICATION.md) |

## 📂 文档结构

```
docs/
├── README.md                      # 文档索引
├── IMPLEMENTATION_PLAN.md         # 实施方案 ⭐
├── UI_DESIGN_SPEC.md              # UI设计方案 ⭐
├── TECHNICAL_SPEC.md              # 技术规范 ⭐
├── API_OVERVIEW.md                # API汇总 ⭐
├── architecture/
│   └── overview.md                # 架构设计
├── guides/
│   └── USER_GUIDE.md             # 用户指南
├── services/
│   ├── AI_SETUP_GUIDE.md
│   ├── SERVICE_OPTIMIZATION_GUIDE.md
│   └── SHARED_LIBRARY_GUIDE.md
├── API_*.md                       # 各服务API文档
└── logo.svg
```

## 🔍 快速链接

- **问题反馈**: GitHub Issues
- **功能建议**: GitHub Discussions
- **源码**: [GitHub Repository](https://github.com/your-org/topems)

---

**文档版本**: v2.0  
**最后更新**: 2026-05-30

**⭐ 标记为核心文档，包含项目最重要的设计和规范**
