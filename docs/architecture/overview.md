# TOPEMS 系统架构设计

## 概述

TOPEMS是一个基于微服务架构的企业级数字化平台，提供统一的身份认证、文档管理、AI协作、流程自动化等功能。

## 架构设计原则

1. **微服务架构** - 每个服务独立部署、独立扩展
2. **统一认证** - 集中化的IAM服务提供统一认证
3. **API优先** - RESTful API设计，前后端分离
4. **高可用性** - 服务健康检查，自动重启
5. **可观察性** - 日志、监控、追踪完整覆盖

## 系统架构图

```
                    ┌───────────────────────────────────┐
                    │           Frontend UI             │
                    │     React + TypeScript + Vite    │
                    └─────────────────────┬─────────────┘
                                          │
                                          │
┌─────────────────────────────────────────┼─────────────────────────────────────────┐
│                                         │                                         │
│              Nginx / API Gateway        │                                         │
│                                         │                                         │
└─────────────────────────────────────────┼─────────────────────────────────────────┘
                                          │
                                          │
                    ┌─────────────────────┴─────────────┐
                    │       Platform Services (Core)    │
                    │  IAM (8000) • DOC (8001) • FLOW (8006)│
                    └─────────────────────┬─────────────┘
                                          │
                                          │
                    ┌─────────────────────┴─────────────┐
                    │     Business Services (20+)      │
                    │  Notification (8003) • AI (8013) • │
                    │  ERP (8010) • HRM (8011) • etc.  │
                    └─────────────────────┬─────────────┘
                                          │
                                          │
                    ┌─────────────────────┴─────────────┐
                    │      Data Layer (PostgreSQL)      │
                    └───────────────────────────────────┘
```

## 核心服务详解

### 1. IAM 身份认证服务 (Port 8000)

**职责**：
- 用户认证与授权
- 权限管理
- JWT Token生成与验证
- 用户会话管理

**主要端点**：
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/register` - 用户注册
- `GET /api/v1/auth/me` - 获取当前用户信息
- `POST /api/v1/auth/logout` - 用户登出

### 2. DOC 文档管理服务 (Port 8001)

**职责**：
- 文档上传/下载
- 文档版本管理
- 文档权限控制
- 文档分类与搜索

**主要端点**：
- `GET /api/v1/documents` - 获取文档列表
- `POST /api/v1/documents` - 上传文档
- `GET /api/v1/documents/:id` - 获取文档详情

### 3. FLOW 工作流服务 (Port 8006)

**职责**：
- 工作流定义管理
- 流程实例执行
- 审批流程处理
- 流程版本控制

**主要端点**：
- `GET /api/v1/workflows` - 获取工作流列表
- `POST /api/v1/workflows` - 创建工作流
- `POST /api/v1/workflows/:id/instances` - 启动工作流实例

### 4. Notification 通知服务 (Port 8003)

**职责**：
- 实时消息通知
- WebSocket长连接
- 消息历史记录
- 消息推送

**主要端点**：
- `GET /api/v1/notifications` - 获取通知列表
- `GET /api/v1/notifications/unread-count` - 获取未读数量
- `PUT /api/v1/notifications/:id/read` - 标记已读

## 服务配置表

| 服务名称 | 端口 | 功能描述 | API前缀 |
|---------|-----|---------|---------|
| topems-iam | 8000 | 身份认证与授权 | /api/v1 |
| topems-pm | 8001 | 项目管理 | /api/v1 |
| notification-service | 8002 | 实时通知 | /api/v1 |
| topems-flow | 8004 | 工作流引擎 | /api/v1 |
| topems-portal | 8003 | 企业门户 | /api/v1 |
| topems-integration | 8005 | 系统集成 | /api/v1 |
| topems-erp | 8010 | 企业资源计划 | /api/v1 |
| topems-hrm | 8011 | 人力资源管理 | /api/v1 |
| topems-ai | 8013 | AI知识库 | /api/v1 |
| topems-rs | 8020 | 研发管理 | /api/v1 |
| topems-lims | 8022 | 实验室管理 | /api/v1 |
| topems-crm | 8012 | 客户关系管理 | /api/v1 |
| topems-mes | 8030 | 制造执行 | /api/v1 |
| topems-qms | 8031 | 质量管理 | /api/v1 |
| topems-ehs | 8032 | 安全管理 | /api/v1 |
| topems-scm | 8040 | 供应链 | /api/v1 |
| topems-srm | 8041 | 供应商管理 | /api/v1 |
| topems-wms | 8042 | 仓库管理 | /api/v1 |
| topems-file | 8050 | 文件存储 | /api/v1 |
| topems-mail | 8051 | 邮件服务 | /api/v1 |
| topems-im | 8052 | 即时通讯 | /api/v1 |
| topems-gis | 8053 | 地理信息 | /api/v1 |
| topems-bi | 8060 | 商业智能 | /api/v1 |
| report-service | 8061 | 报表服务 | /api/v1 |
| topems-ai | 8062 | AI服务 | /api/v1 |
| topems-mobile | 8070 | 移动端服务 | /api/v1 |
| topems-pdm | 8023 | 产品数据管理 | /api/v1 |
| topems-doc | 8024 | 文档管理 | /api/v1 |
| topems-pm | 8001 | 统一项目管理 | /api/v1 |

## 技术栈

### 后端
- **语言**: Rust 1.70+
- **Web框架**: Axum
- **数据库**: PostgreSQL
- **ORM**: SQLx
- **认证**: JWT
- **实时通信**: WebSocket

### 前端
- **语言**: TypeScript
- **框架**: React 18
- **构建工具**: Vite
- **UI库**: Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router

### DevOps
- **容器化**: Docker
- **编排**: Docker Compose
- **监控**: Prometheus (可选)

## 数据库设计

### 数据库策略
- **单一主数据库**: 所有服务共享一个PostgreSQL实例
- **Schema隔离**: 每个服务使用独立的Schema
- **连接池**: 每个服务有自己的连接池
- **事务管理**: 服务内部事务，跨服务需要Saga模式

### 主要Schema
- `public` - 共享表
- `iam` - IAM服务表
- `doc` - 文档服务表
- `flow` - 工作流服务表
- `notification` - 通知服务表
- 以及其他业务服务Schema

## 安全设计

### 认证
- JWT Token认证
- Token刷新机制
- 权限验证中间件
- RBAC权限模型

### 数据安全
- HTTPS强制
- 敏感数据加密存储
- SQL注入防护
- XSS防护
- CSRF防护

## 扩展设计

### 水平扩展
每个微服务可独立扩展，支持负载均衡

### 数据库扩展
- 读写分离
- 按服务分库
- 缓存层（Redis）

### 消息队列
- 异步处理
- 事件驱动
- 服务解耦

## 监控与运维

### 健康检查
- 每个服务提供 `/health` 端点
- 前端自动健康检查与服务状态显示
- 响应式状态更新

### 日志
- 结构化日志
- 统一日志格式
- 日志聚合（可选ELK）

## 迭代规划

### Version 2.0 (当前)
- 完善所有核心服务
- 统一架构与配置
- 完整的文档体系

### Version 2.1
- 性能优化
- 缓存层实现
- 消息队列集成

### Version 2.2
- K8s部署
- 弹性伸缩
- 更完善的监控体系

---
**版本**: 2.0.0
**最后更新**: 2026-06-04
