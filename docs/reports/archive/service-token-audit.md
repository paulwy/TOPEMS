# 服务间认证与"转发用户 token"手工调用审计

> 日期：2026-09-01 ｜ 范围：svc/portal ｜ 目标：识别降级模式（转发用户 token 但下游无该用户权限 → 401 → 静默空结果），区分"用户维度"与"系统级"调用，给出替换建议。

## 一、审计范围与方法

- 扫描 svc/portal/src 全部跨服务调用，聚焦两类模式：
  1. **裸 reqwest 手工调用**（`state.http_client` / `reqwest::Client` 直连下游，非 TypedServiceClient）
  2. **TypedServiceClient + `set_auth_token` / `bearer_auth` 转发**（覆盖 client 内置 service token 为用户 token）
- 精确独立调用点：**14 处**（历史口径"46 处"为含多行匹配的 grep 行数，按调用点计为 14）

## 二、审计矩阵

### ⚠️ 接口存在性核查（决定性发现，2026-09-01 补充）

**portal 的 B 类 4 个全局搜索源指向的接口在全部 svc 代码中均不存在**：

| 调用 | 全库 grep（svc/ 非 portal） | 结论 |
|---|---|---|
| `GET /api/erp/search` | 无定义 | ❌ 接口不存在 |
| `GET /api/crm/search` | 无定义 | ❌ 接口不存在 |
| `GET /api/bi/search` | 无定义（bi 服务实为 svc/analytics，无此接口） | ❌ 接口不存在 |
| `GET /api/doc/search` | 仅 unified-core 有 `/api/core/file/files/search`（路径不符） | ❌ 接口不存在 |

**影响**：4 个搜索源永远 404 → 降级空结果。**B 类的"token 策略"问题不成立**——接口从未实现，讨论用户 token / service token 无意义。应先解决接口存在性（见 §四）。

### A 类：用户维度数据（转发用户 token 正确，保持）—— 7 处

| # | 位置 | 调用目标 | 语义 | 判定 |
|---|---|---|---|---|
| 1 | shared/mod.rs:120 | workflow `get_my_task_stats` | 用户自己的待办统计 | ✅ 用户维度，保持 |
| 2 | aggregation.rs:366 | workflow 待办统计 | 用户自己的待办 | ✅ 保持 |
| 3 | aggregation.rs:419 | workflow 待办统计 | 用户自己的待办 | ✅ 保持 |
| 4 | dashboard.rs:154 | workflow 待办统计 | 用户自己的待办 | ✅ 保持 |
| 5 | todos.rs:252 | notification `get_unread` | 用户自己的未读通知 | ✅ 保持 |
| 6 | todos.rs:296 | notification 待办 | 用户自己的通知待办 | ✅ 保持 |
| 7 | search.rs:304 | notification 通知搜索 | 用户自己的通知 | ✅ 保持 |

**判定依据**：下游接口均按用户身份过滤（`my_*`/`get_unread` 语义），转发用户 token 是**唯一正确**做法，改 service token 会导致跨用户数据泄露。

### B 类：裸 reqwest 系统级全局搜索（转发用户 token → 潜在降级）—— 4 处

| # | 位置 | 调用目标 | 语义 | 判定 |
|---|---|---|---|---|
| 8 | search.rs:236 | `GET /api/erp/search` | ERP 全库搜索（客户/订单/物料） | ⚠️ 潜在降级 |
| 9 | search.rs:258 | `GET /api/crm/search` | CRM 全库搜索 | ⚠️ 潜在降级 |
| 10 | search.rs:280 | `GET /api/bi/search` | BI 全库搜索 | ⚠️ 潜在降级 |
| 11 | search.rs:356 | `GET /api/doc/search` | 文档全库搜索 | ⚠️ 潜在降级 |

**降级模式**：`if let Some(t) = token { req = req.bearer_auth(t); }`——token 存在才转发。若用户 token 缺少下游权限（如普通用户无 `erp:read`）→ 下游 401 → `parse_search_results` 失败 → **该搜索源静默返回空**。全局搜索框结果缺失且无告警。

**安全分析**：不能简单改为 service token——若下游搜索接口**未做用户权限过滤**，service token 将返回全库数据（普通用户可搜到所有客户/订单/员工），**越权泄露风险**。因此处理取决于下游搜索接口的权限语义：

| 选项 | 前提 | 效果 |
|---|---|---|
| A. 保持转发用户 token | 下游搜索接口有 RLS/权限过滤 | 安全，搜索结果=用户可见范围；但无权限用户搜不到该源 |
| B. 改 service token | 全局搜索明确为**管理员/管理功能**，且下游搜索接口自带可见性过滤 | 全量搜索，功能完整；依赖下游过滤防越权 |
| C. 混合：用户 token 优先，401 时 service token 兜底 | 需要区分"认证失败"与"权限不足" | 功能兜底，但权限语义模糊，**不推荐** |

**建议**：先确认下游 `/api/erp/search`、`/api/crm/search`、`/api/bi/search`、`/api/doc/search` 是否含用户权限过滤（RLS / claims 过滤）。有 → 选项 A（现状正确，仅需补降级日志）；无且业务确认全局搜索属管理功能 → 选项 B（改 service token + 下游补过滤）。

### C 类：TypedServiceClient 全量列表搜索（已核查权限语义）—— 3 处

| # | 位置 | 调用目标 | 下游权限过滤现状 | 判定 |
|---|---|---|---|---|
| 12 | search.rs:380 | hrm `list_employees` | ✅ `check_permission(EmployeeRead)` + `get_tenant_id` 按 tenant 过滤 | **保持用户 token 正确**（改 service token 反而越权） |
| 13 | search.rs:422 | workflow `list_instances` | ⚠️ **无 Claims 过滤**，直接全量查 `core_workflow_instances`（unified-core flow/instance.rs:42） | 转发用户 token 仅作认证，普通用户可见全量实例——**下游接口设计问题**，标记下游治理（P2） |
| 14 | search.rs:463 | mes `list_production_orders` | ✅ 已确认有 `check_permission(ProductionOrderRead)`；production_orders 为 mes schema 单组织表（无 tenant_id，有 organization_id），权限隔离成立 | 无越权，无需改动 |

**结论**：C 类 hrm 保持用户 token 正确；workflow 缺用户维度过滤（已修复，见 2026-09-01 list_instances 补过滤）；mes 有 check_permission 权限隔离成立（单组织表无 tenant 维度，无越权）。

### D 类：服务身份（已正确，保持）—— 1 处

| # | 位置 | 调用目标 | 判定 |
|---|---|---|---|
| 15 | announcements.rs:50 | ERP 公告 CRUD 代理（issue_service_token） | ✅ 服务身份正确 |

### E 类：非认证调用（无需处理）

- graphql_helpers.rs：仅 `/health` 健康检查（无 token）
- portal_plugin.rs：plugin 注册用 `X-Plugin-Token`（插件注册机制，非服务间 API）

## 三、核心结论

1. **A 类 7 处用户维度转发正确**——保持，无改动。
2. **B 类 4 处全局搜索源（erp/crm/bi/doc）指向不存在的接口**——永远 404 空结果。**token 策略讨论不成立**——先解决接口存在性。
3. **C 类 3 处**：hrm 有 EmployeeRead + tenant 过滤（用户 token 正确）；workflow `list_instances` 缺用户维度过滤（已修复：2026-09-01 补 initiator/assignee/审批参与过滤）；mes `list_production_orders` 有 check_permission(ProductionOrderRead) + 单组织表（无 tenant_id），权限隔离成立——**均无遗留越权**。
4. **不推荐任何一处改 service token**——hrm 改 service token 会越权（绕过 tenant 过滤）；workflow/mes 改 service token 仍全量（问题在下游）；B 类接口不存在（无从谈起）。
5. **工程改进（已落地）**：B 类 4 处统一 `send_global_search` helper + 401/HTTP/网络错误降级日志（上一轮提交 e863c0413）。

## 四、P 级行动项

| 优先级 | 行动 | 归属 |
|---|---|---|
| P0 | **决策 portal 全局搜索 4 个无效源**：移除（收敛到 notifications/hrm/workflow/mes 4 个真实源）或标记"未接入"（保留占位等实现） | portal + 产品 |
| P1 | **workflow `list_instances` 补用户维度过滤**（按 claims 过滤用户可见/相关实例），消除越权风险 | unified-core flow |
| P1 | ~~mes `list_production_orders` 确认权限过滤~~ **已完成**：有 check_permission(ProductionOrderRead) + 单组织表无 tenant 维度，无越权；workflow `list_instances` 已补用户维度过滤 | svc/mes（✅）/ svc/unified-core（✅） |
| P2 | C 类 3 处按下游过滤就位后，复核 token 策略（hrm 已正确） | 复核 |
| P2 | 搜索降级指标（per-source 401 计数）接入 ServiceCallMonitor 告警 | shared-auth + portal |
