# Portal BFF 服务

TOPEMS 统一门户后端（Backend for Frontend）。Portal 是**聚合层**，不是万能网关——只承担聚合查询、数据格式适配和 Portal 自身功能，纯代理路由已移除（V60 精简）。

## 定位

| 职责 | 说明 |
| --- | --- |
| 聚合查询 | 合并多个后端服务的数据返回给前端（如仪表盘统计、全局搜索、统一待办） |
| 数据格式适配 | 调用下游服务后将响应转换为 Portal 专有模型，并提供降级/回退逻辑 |
| Portal 专有功能 | 公告、快捷操作、导航菜单、用户待办、用户设置等门户自身业务 |

## 端口与路径

- 服务端口：`8063`（环境变量 `PORTAL_PORT`）
- API 前缀：`/api/portal`
- 旧版别名：`/api/v1/portal`（由 `register_routes_with_legacy_alias` 注册）

## 前端 API 调用指南

### 应通过 Portal BFF 的 API（聚合 / 适配 / 专有）

以下路由注册在 `/api/portal` 前缀下，前端应通过 Portal 访问：

| 路由 | 类型 | 说明 |
| --- | --- | --- |
| `/api/portal/dashboard/stats` | 聚合 | 仪表盘统计（聚合多个服务） |
| `/api/portal/dashboard/business-stats` | 聚合 | 业务统计聚合 |
| `/api/portal/dashboard/unified-todos` | 聚合 | 统一待办（合并多源待办） |
| `/api/portal/dashboard/quick-access` | 专有 | 快捷入口管理 |
| `/api/portal/search` | 聚合 | 全局搜索（跨服务检索） |
| `/api/portal/search/suggestions` | 聚合 | 搜索建议 |
| `/api/portal/quick-actions` | 专有 | 快捷操作 |
| `/api/portal/quick-actions/favorites` | 专有 | 收藏的快捷操作 |
| `/api/portal/navigation/menu` | 专有 | 导航菜单 |
| `/api/portal/navigation/pinned` | 专有 | 固定应用 |
| `/api/portal/announcements` | 专有 | 公告管理 |
| `/api/portal/todos` | 专有 | 用户待办 |
| `/api/portal/user` | 适配 | 用户信息（适配 IAM 返回 + JWT 回退） |
| `/api/portal/settings` | 适配 | 用户设置（适配 IAM preferences + 默认回退） |
| `/api/portal/monitoring/*` | 适配 | 监控数据（适配 Monitor 返回 + 降级） |
| `/api/portal/notifications` | 适配 | 通知（适配 Notification 服务） |
| `/api/portal/services` | 专有 | 服务列表 |

### 应直连后端服务的 API

纯代理路由已从 Portal 移除，前端应直接调用对应后端服务。通过 Vite 代理（`/api/{service}`）访问，无需经过 Portal。

| 业务域 | 后端服务 | 端口 | API 前缀 | 示例 |
| --- | --- | --- | --- | --- |
| 用户/组织/权限管理 | unified-core (IAM) | 8000 | `/api/core/iam` | `/api/core/iam/users` |
| 工单/SLA | unified-core (Master) | 8000 | `/api/core/master` | `/api/core/master/tickets`、`/api/core/master/sla-policies` |
| 文档管理 | unified-core (Doc) | 8000 | `/api/core/doc` | `/api/core/doc/documents` |
| 文件管理 | unified-core (File) | 8000 | `/api/core/file` | `/api/core/file/upload` |
| 邮件 | unified-core (Mail) | 8000 | `/api/core/mail` | `/api/core/mail/send` |
| 即时通讯 | unified-core (IM) | 8000 | `/api/core/im` | `/api/core/im/messages` |
| 审批流程 | unified-core (Flow) | 8000 | `/api/core/flow` | `/api/core/flow/processes` |
| 通知 | unified-core (Notification) | 8000 | `/api/core/notification` | `/api/core/notification/send` |
| 监控（原始 API） | unified-core (Monitor) | 8000 | `/api/core/monitor` | `/api/core/monitor/health`、`/api/core/monitor/metrics` |
| ERP | erp | 8010 | `/api/erp` | `/api/erp/orders` |
| CRM | crm | 8029 | `/api/crm` | `/api/crm/customers` |
| HRM | hrm | 8020 | `/api/hrm` | `/api/hrm/employees` |
| 财务 | finance | 8011 | `/api/finance` | `/api/finance/vouchers` |
| MES | mes | 8030 | `/api/mes` | `/api/mes/work-orders` |
| PDM | pdm | — | `/api/pdm` | `/api/pdm/products` |
| PM | pm | — | `/api/pm` | `/api/pm/projects` |
| SRM | srm | — | `/api/srm` | `/api/srm/suppliers` |
| SCM | scm | — | `/api/scm` | `/api/scm/purchase-orders` |
| WMS | wms | — | `/api/wms` | `/api/wms/inventory` |
| QMS | qms | — | `/api/qms` | `/api/qms/inspections` |
| LIMS | lims | — | `/api/lims` | `/api/lims/samples` |
| EHS | ehs | — | `/api/ehs` | `/api/ehs/incidents` |
| BI/分析 | analytics | — | `/api/bi` | `/api/bi/reports` |
| 主数据 | master-data | — | `/api/master-data` | `/api/master-data/materials` |

> 端口以各服务 `config/services.yaml` 中的 `{SERVICE}_PORT` 为准（服务级 env 模板见 `config/env/_template.env.example`）。前端通过 Vite 代理（`/api/{service}`）访问，详见 `apps/web/vite.config.ts` 中的 `generateServiceProxies`。

### V60 精简说明

以下纯代理路由已从 Portal 移除，前端改为直连 unified-core：

- `/api/portal/tickets` → 直连 `/api/core/master/tickets`
- `/api/portal/tickets/{id}/sla` → 直连 `/api/core/master/tickets/{id}/sla`
- `/api/portal/tickets/sla-stats` → 直连 `/api/core/master/tickets/sla-stats`
- `/api/portal/sla-policies` → 直连 `/api/core/master/sla-policies`

这些路由此前仅转发请求到 unified-core，不做任何数据转换，属于纯代理。移除后减少了 Portal 的路由膨胀和不必要的网络跳数。

## 架构约束

- Portal 不直接操作业务数据库，业务数据通过服务客户端调用下游服务
- `AppState` 持有 9 个服务客户端（Iam/Erp/Finance/Hrm/Mes/Monitor/Crm/Notification/Workflow），仅用于聚合与适配
- 所有聚合路由必须复用 `PortalServiceAggregator`，避免在 handler 中直接拼接多个客户端调用
- 降级策略：当下游服务不可用时，返回空数据/默认值而非 502，保证门户可用性
