# TOPEMS 架构改进路径实施方案

> 文档版本: v1.6
> 创建日期: 2026-06-08
> 最后更新: 2026-06-08
> 状态: API 版本管理和 Schema 隔离工具完成

---

## 1. 执行摘要

### 1.1 当前状态
- ✅ 微服务架构清晰，27个后端服务已在运行
- ✅ 数据库架构：单库多 Schema（`hrm.*`、`erp.*`、`pm.*` 等）
- ✅ 已清理的重复：ERP 的重复员工/部门/合同功能
- ✅ 已实现：统一的服务间调用机制（Service Client）
- ✅ 已实现：事件驱动架构（Redis Pub/Sub）
- ✅ 已实现：统一错误处理机制（TopemsError）
- ✅ 已实现：完整的服务发现和配置管理
- ✅ 已实现：统一日志初始化（所有使用 shared 库的服务）
- ✅ 已实现：标准化健康检查组件
- ✅ 已实现：健康检查组件已推广到所有服务
- ✅ 已创建：Schema 隔离和事件驱动使用指南
- ✅ 已创建：健康检查组件使用指南
- ✅ 已创建：综合使用示例

### 1.2 目标
- **近期**：统一服务调用机制，完善架构规范 ✅ 完成
- **中期**：引入事件驱动，优化服务发现，完善健康检查 ✅ 全部完成
- **长期**：为未来可能的物理数据库分离做准备

---

## 2. 阶段一：立即可做（现在 - 1个月）✅ 完成

### 2.1 在 shared 库中创建服务调用客户端 ✅ 已完成

#### 目标
建立统一的服务间调用机制，确保模块间通过 API 而非直接数据库访问。

#### 任务清单
- [x] 创建 `shared/lib/src/service_client/` 目录
- [x] 实现 `BaseClient`：基础 HTTP 客户端
- [x] 实现 `HrmClient`：HRM 服务调用客户端
- [x] 实现 `IamClient`：IAM 服务调用客户端
- [x] 在 ERP 模块中集成使用示例
- [x] 编写使用文档（SCHEMA_ISOLATION_GUIDE.md）

#### 相关文件
```
/shared/lib/src/
├── service_client/
│   ├── mod.rs
│   ├── base_client.rs
│   ├── hrm_client.rs
│   ├── iam_client.rs
│   └── error.rs
```

---

### 2.2 完善 Schema 隔离规范 ✅ 已完成

#### 目标
明确每个模块的数据边界，禁止跨 Schema 直接查询。

#### 规则
- **HRM 模块**：只操作 `hrm.*` 表
- **ERP 模块**：只操作 `erp.*` 表
- **PM 模块**：只操作 `pm.*` 表
- 如需访问其他模块数据 → 使用服务客户端

#### 验证方法
- SQL 审查脚本：检查模块是否查询了非自己的 Schema
- 代码审查：禁止直接 JOIN 跨 Schema 表

#### 相关文档
[SCHEMA_ISOLATION_GUIDE.md](file:///Users/air/TOPEMS/docs/SCHEMA_ISOLATION_GUIDE.md)

---

### 2.3 完善 shared 库基础组件 ✅ 已完成

#### 任务
- [x] 统一错误处理类型（TopemsError）
- [x] 支持 ServiceClientError 和 EventError 自动转换
- [x] 统一日志初始化
- [x] 增强健康检查组件
- [x] 完善健康检查中间件（提供简化的辅助函数）
- [ ] 增加 API 版本管理支持

#### 统一日志初始化详情
所有使用 `topems-shared` 库的服务都已更新，使用统一的 `init_logging(service_name)` 函数初始化日志系统：

- services/ 目录下的 23 个服务全部更新
- platform/ 目录下的 topems-flow 和 topems-doc 已更新
- 统一的日志格式和服务名称标识

#### 健康检查组件增强
在 `topems-shared` 库中增强了健康检查相关组件：

1. **HealthState** - 健康检查状态结构体，包含服务名称、数据库连接和系统指标
2. **standard_health_check** - 标准化的健康检查处理函数
3. **check_database_health** - 数据库健康检查辅助函数
4. **create_health_router** - 创建标准健康检查路由的便捷函数
5. **metrics_middleware** - 指标收集中间件
6. **create_metrics_router** - 创建系统指标路由的便捷函数
7. **ServiceHealth** 实现了 IntoResponse trait，直接提供符合 HTTP 标准的响应
   - 健康状态返回 200 OK
   - 不健康状态返回 503 Service Unavailable
8. **SimpleHealthConfig** - 简化的健康配置结构体，便于服务快速集成
9. **simple_health_check** - 简化的健康检查函数，接受 SimpleHealthConfig 参数
10. **build_health_response** - 快速构建健康响应的辅助函数

#### 已集成新健康检查组件的服务
- [x] services/report-service（完整实现示例，包含数据库健康检查）
- [x] services/notification-service（完整实现示例，包含数据库健康检查）
- [x] services/topems-portal/backend（简化实现，无数据库连接）
- [x] services/topems-crm/backend（简化实现，无数据库连接）
- [x] services/topems-mes/backend（简化实现）
- [x] services/topems-qms/backend（简化实现）
- [x] services/topems-wms/backend（简化实现）
- [x] services/topems-srm/backend（简化实现）
- [x] services/topems-scm/backend（简化实现）
- [x] services/topems-mail/backend（已实现完整健康检查）
- [x] services/topems-pdm/backend（简化实现）
- [x] services/topems-mobile/backend（简化实现）
- [x] services/topems-integration/backend（简化实现）
- [x] services/topems-im/backend（简化实现）
- [x] services/topems-gis/backend（简化实现）
- [x] services/topems-ehs/backend（简化实现）
- [x] services/topems-bi/backend（简化实现）
- [x] services/topems-ai/backend（简化实现）
- [x] services/topems-hrm/backend（已实现完整健康检查）
- [x] services/topems-erp/backend（已实现完整健康检查）
- [x] services/topems-lims/backend（简化实现）
- [x] services/topems-rs/backend（简化实现）
- [x] services/topems-pm/backend（简化实现）

#### 相关文档
[健康检查组件使用指南.md](file:///Users/air/TOPEMS/docs/健康检查组件使用指南.md)

---

## 3. 阶段二：中期改进（1-3个月） ✅ 核心部分完成

### 3.1 事件驱动架构（基于 Redis）✅ 已完成

#### 目标
解耦模块间的依赖，通过事件通知而非直接调用。

#### 实现
- 使用 Redis Pub/Sub
- shared 库提供 `EventPublisher` 和 `EventSubscriber`

#### 事件示例
- `hrm.employee.created`：员工创建事件
- `pm.project.updated`：项目更新事件

#### 相关文件
```
/shared/lib/src/
├── event/
│   ├── mod.rs
│   ├── error.rs
│   ├── event.rs
│   ├── publisher.rs
│   └── subscriber.rs
```

#### 相关文档
[EVENT_DRIVEN_GUIDE.md](file:///Users/air/TOPEMS/docs/EVENT_DRIVEN_GUIDE.md)

---

### 3.2 服务发现 ✅ 已实现

#### 方案
- 基于配置的服务注册表
- `ServiceRegistry` 管理所有服务配置
- 支持服务 URL 和端口查找

#### 相关文件
```
/shared/lib/src/
├── config/
│   ├── mod.rs
│   └── services.rs
```

---

### 3.3 部分模块独立数据库（可选）

#### 优先尝试
- **BI 模块**：可考虑使用专门的 OLAP 库（如 ClickHouse）
- **IM（即时通讯）**：可考虑独立数据库

---

## 4. 阶段三：长期优化（3-6个月）

### 4.1 数据库架构演进评估
根据业务增长，评估是否需要全面物理分离

### 4.2 服务网格考虑
- Istio 或 Linkerd
- 自动熔断、限流、追踪

---

## 5. 问题追踪与解决记录

### 5.1 已解决问题

| 问题 | 状态 | 解决日期 |
|------|------|---------|
| ERP 和 HRM 重复员工管理 | ✅ 已解决 | 2026-06-08 |
| ERP 重复项目合同/预算 | ✅ 已解决 | 2026-06-08 |
| 前端 API 调用错误 | ✅ 已解决 | 2026-06-08 |
| 缺乏统一服务间调用机制 | ✅ 已解决 | 2026-06-08 |
| 缺乏事件驱动机制 | ✅ 已解决 | 2026-06-08 |
| 缺乏统一错误处理 | ✅ 已解决 | 2026-06-08 |
| 缺乏服务发现 | ✅ 已实现 | 2026-06-08 |
| 缺乏统一日志初始化 | ✅ 已解决 | 2026-06-08 |
| 缺乏标准化健康检查组件 | ✅ 已解决 | 2026-06-08 |

### 5.2 待解决问题

| 问题 | 优先级 | 计划解决时间 |
|------|--------|-------------|
| Schema 隔离执行不严格 | 🟡 P1 | 2周内 |
| 增加 API 版本管理支持 | 🟢 P2 | 1-2个月内 |

---

## 6. 数据所有权明确清单

| 数据领域 | 负责模块 | 备注 |
|----------|---------|------|
| 公司、部门、员工 | HRM | 唯一数据源 |
| 资产、财务、办公 | ERP | 仅管理自身数据 |
| 项目、项目合同 | PM | 与 HRM 合同不同 |
| 客户、联系人、商机 | CRM | 独立 |
| 供应商、采购 | SCM | 独立 |

---

## 7. 实施优先级矩阵

| 优先级 | 行动 | 状态 |
|--------|------|------|
| 🔴 P0 | 创建服务调用客户端 | ✅ 已完成 |
| 🔴 P0 | 在 ERP 中集成使用示例 | ✅ 已完成 |
| 🔴 P0 | 完善 Schema 隔离文档 | ✅ 已完成 |
| 🔴 P0 | 事件驱动基础框架 | ✅ 已完成 |
| 🔴 P0 | 统一错误处理机制 | ✅ 已完成 |
| 🟡 P1 | 统一日志初始化 | ✅ 已完成 |
| 🟡 P1 | 增强健康检查组件 | ✅ 已完成 |
| 🟡 P1 | 完善健康检查中间件（提供简化辅助函数） | ✅ 已完成 |
| 🟡 P1 | 在更多服务中推广健康检查组件 | ✅ 已完成（所有服务已更新） |
| 🟢 P2 | 增加 API 版本管理支持 | ✅ 已完成 |
| 🟢 P2 | 完善 Schema 隔离执行工具 | ✅ 已完成 |

---

## 8. 风险评估与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 服务调用增加延迟 | 中 | 引入缓存，异步处理 |
| 过度设计 | 高 | 按需演进，避免过早优化 |
| 迁移成本 | 中 | 渐进式，保持向后兼容 |

---

## 9. 参考文档

- [微服务设计模式](https://microservices.io/patterns/)
- [数据库架构演进](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/database-per-service.html)
- [Schema 隔离指南](file:///Users/air/TOPEMS/docs/SCHEMA_ISOLATION_GUIDE.md)
- [事件驱动架构指南](file:///Users/air/TOPEMS/docs/EVENT_DRIVEN_GUIDE.md)

---

**本文档将持续更新，记录架构改进的每一步。**

