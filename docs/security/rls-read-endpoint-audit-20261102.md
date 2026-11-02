# RLS 读端点绑定审计（2026-11-02）

## 口径
- 审计目标：749 读端点（GET 类）的 tenant 上下文注入覆盖。
- 实时核对：openapi.json 全量 GET 1566 方法 / openapi-aggregated.json GET 411（749 为历史口径，以当前 openapi 为准）。
- 审计方法：中间件为**全局层注入**，端点无需逐查——核对各服务路由构建处是否挂 tenant/rls 中间件即覆盖其全部读端点。

## 注入机制（三层）
1. **连接级兜底**：`create_database_pool`（shared-bootstrap）在单租户部署（MULTI_TENANT_ENABLED != true）且配 `DEFAULT_TENANT_ID` 时，after_connect `set_config('app.tenant_id', $1, false)` 固定连接默认租户。
2. **请求级注入**：`rls_middleware`（shared-db/rls.rs:254）/ `tenant_middleware`（shared-auth/middleware/tenant.rs:133）/ `tenant_rls_middleware`（unified-core）从请求头 `x-tenant-id` 解析，acquire 独占连接 `set_config(..., false)`，请求后同连接 `RESET` 归还（不残留会话状态）。
3. **RLS 策略放行分支**：未设上下文时策略的 `current_setting IS NULL / '' / 超管 0000 / tenant_id IS NULL` 分支放行，无上下文不阻断（单租户语义）。

## 覆盖核对（全服务）
| 形态 | 服务 | 挂载 |
|---|---|---|
| 独立服务 | mes/mobile/finance/ehs/hrm/crm/wms/tms/scm/srm/ticket/rd/qms/lims/pm/master-data/communication/plugin-registry/monitor/search/pdm/erp/ai/gis | ✅ tenant/rls 中间件 |
| 聚合/门户 | unified-core（routes/mod.rs:268 tenant_rls_middleware）/ portal（embedded.rs rls_middleware）/ integration（routes.rs:208） | ✅ |
| server 模块化 | master_data/pm/analytics/qms/ticket 等 real_module | ✅（模块层挂载） |
| analytics 独立服务 | main.rs 未挂 | ⚠️ 但未运行（当前架构端点经 server AnalyticsRealModule 已覆盖）；若独立部署需补挂 |

## 结论
- **读端点 tenant 注入覆盖完备**：所有在读服务均挂 tenant/rls 中间件，读端点经全局层自动注入。
- **遗留标注**：独立 analytics 服务 main.rs 未挂中间件（当前不运行，经 server 模块覆盖）；后续若启用独立部署需补挂 `tenant_middleware`。
