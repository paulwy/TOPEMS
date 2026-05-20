# TOPEMS - 化工新材料企业数字化平台

TOPEMS 是一个面向高科技添加剂、精细化工、新材料研发生产型企业的全业务数字化平台。

## 核心理念

- **对外**：10个可独立商业化产品，均可单独私有化部署、独立售卖
- **对内**：统一账号、统一权限、统一文件、统一消息，聚合为完整一体化平台
- **架构**：微服务架构，支持独立部署、独立迭代

## 系统组成

### 中台底座系统（4个）

| 系统 | 说明 | 优先级 |
|------|------|--------|
| topems-iam | 统一身份与权限中台 | ⭐⭐⭐ 最高 |
| topems-flow | 统一OA流程中台 | ⭐⭐⭐ 最高 |
| topems-doc | 统一文件管理系统 | ⭐⭐⭐ 最高 |
| topems-mobile | 统一移动工作台 | ⭐⭐ 中 |
| topems-im | 即时通讯 | ⭐⭐ 中 |

### 商业化独立产品（10个）

| 产品 | 说明 | 优先级 |
|------|------|--------|
| topems-rs | 科研研发管理系统 | ⭐⭐⭐ 最高 |
| topems-lims | 实验室信息管理系统 | ⭐⭐⭐ 最高 |
| topems-qms | 质量合规管理系统 | ⭐⭐ 高 |
| topems-ehs | 安全环保职业健康系统 | ⭐⭐ 高 |
| topems-erp | 新材料专用ERP | ⭐⭐ 高 |
| topems-srm | 供应商管理系统 | ⭐⭐ 中 |
| topems-gis | 厂区工程空间数字化 | ⭐⭐ 中 |
| topems-bi | 数据大屏报表中台 | ⭐⭐ 中 |
| topems-ai | 智能AI知识库 | ⭐⭐⭐ 高 |

## 分阶段落地规划

### 第一阶段：基础底座搭建（2-3个月）

- topems-iam - 统一身份与权限中台
- topems-flow - 统一OA流程中台
- topems-doc - 统一文件管理系统
- topems-ai - 智能AI知识库

### 第二阶段：核心产品打造（3-4个月）

- topems-rs - 科研研发系统
- topems-lims - 实验室管理系统

### 第三阶段：质量安全供应链（3-4个月）

- topems-qms - 质量合规系统
- topems-ehs - 安全环保系统
- topems-erp - 新材料ERP
- topems-srm - 供应商管理系统

### 第四阶段：空间数据能力（2-3个月）

- topems-gis - 厂区空间数字化
- topems-bi - 数据可视化
- topems-mobile - 移动工作台
- topems-im - 即时通讯

## 技术栈

### 前端技术栈

- React 18.x
- TypeScript 5.x
- Vite 6.x
- Zustand 4.x
- Tailwind CSS
- React Router 6.x
- Lucide React

### 后端技术栈

- Rust 1.77+
- Axum 0.8.x
- SQLx 0.8.x

### 数据层

- PostgreSQL 15+
- Redis 7+
- pgvector (向量数据库)

## 快速开始

### 环境要求

- Node.js 18+
- Rust 1.77+
- PostgreSQL 15+
- Redis 7+

### 启动开发环境

```bash
# 启动基础设施
cd infrastructure/docker
docker-compose up -d postgres redis

# 启动中台底座（以 topems-doc 为例）
cd platform/topems-doc
cargo run
```

详细开发指南请参考各子系统的 README.md。

## 文档

- 架构设计文档
- 详细设计文档
- API 文档

## 版本

v1.0.0  
更新日期: 2026-05-20  
维护团队: TOPEMS 开发团队
