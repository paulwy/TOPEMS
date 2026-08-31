# 服务间认证与"转发用户 token"手工调用审计

> 日期：2026-09-01 ｜ 范围：svc/portal ｜ 目标：识别降级模式（转发用户 token 但下游无该用户权限 → 401 → 静默空结果），区分"用户维度"与"系统级"调用，给出替换建议。

## 一、审计范围与方法

- 扫描 svc/portal/src 全部跨服务调用，聚焦两类模式：
  1. **裸 reqwest 手工调用**（`state.http_client` / `reqwest::Client` 直连下游，非 TypedServiceClient）
  2. **TypedServiceClient + `set_auth_token` / `bearer_auth` 转发**（覆盖 client 内置 service token 为用户 token）
- 精确独立调用点：**14 处**（历史口径"46 处"为含多行匹配的 grep 行数，按调用点计为 14）

## 二、审计矩阵

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

### C 类：TypedServiceClient 全量列表搜索（需评估权限语义）—— 3 处

| # | 位置 | 调用目标 | 语义 | 判定 |
|---|---|---|---|---|
| 12 | search.rs:380 | hrm `list_employees` | 员工全量列表搜索 | 🔍 待评估 |
| 13 | search.rs:422 | workflow `list_instances` | 流程实例全量搜索 | 🔍 待评估 |
| 14 | search.rs:463 | mes `list_production_orders` | 生产订单全量搜索 | 🔍 待评估 |

**说明**：已走 TypedServiceClient（内置 service token），但 `set_auth_token` 覆盖为用户 token。`list_*` 为全量列表语义——若搜索应返回用户可见范围 → 转发用户 token 正确（依赖下游过滤）；若应全量 → 应去掉 set_auth_token 直接用 service token。**同 B 类，取决于下游权限语义**。

### D 类：服务身份（已正确，保持）—— 1 处

| # | 位置 | 调用目标 | 判定 |
|---|---|---|---|
| 15 | announcements.rs:50 | ERP 公告 CRUD 代理（issue_service_token） | ✅ 服务身份正确 |

### E 类：非认证调用（无需处理）

- graphql_helpers.rs：仅 `/health` 健康检查（无 token）
- portal_plugin.rs：plugin 注册用 `X-Plugin-Token`（插件注册机制，非服务间 API）

## 三、核心结论

1. **A 类 7 处用户维度转发正确**——保持，无改动。
2. **B 类 4 处 + C 类 3 处（共 7 处）为"降级模式"候选**——根因是**转发用户 token 依赖下游权限过滤**，若用户无权限则静默空结果。
3. **不推荐无脑替换为 service token**——存在越权数据泄露风险。正确路径是先**确认下游搜索接口的权限过滤语义**，再决定 A/B 选项。
4. **工程改进（无争议）**：B 类 4 处裸 reqwest 无统一超时/重试/ServiceIdentity 记录——无论最终选 A 还是 B，都应**收敛到统一 client 封装**（复用已 with_service_token 的 erp_client/crm_client 等），统一降级日志（`tracing::warn` 区分"下游 401 权限不足"与"网络错误"），避免静默空结果。

## 四、P 级行动项

| 优先级 | 行动 | 归属 |
|---|---|---|
| P1 | 确认 erp/crm/bi/doc 4 个搜索接口是否含用户权限过滤（RLS/claims）；补下游过滤 | 下游各服务 |
| P1 | B 类 4 处收敛到统一 client 封装 + 降级日志（区分 401 vs 网络错误） | portal search.rs |
| P2 | 按 P1 确认结果决定 B/C 类 7 处 token 策略（A 保持 / B 改 service token） | portal + 业务确认 |
| P2 | 搜索降级指标（per-source 401 计数）接入 ServiceCallMonitor 告警 | shared-auth + portal |
