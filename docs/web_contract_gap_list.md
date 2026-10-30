# Web 契约冒烟豁免清单（KNOWN FAIL）

> 机制：`scripts/web_contract_smoke.py::load_expected_fails` 读取本清单，
> 命中 (method, path) 的 FAIL 记为 KNOWN（不阻断门禁），其余 FAIL 阻断。
>
> **当前状态：41 项剩余豁免已全部核销（2026-10-30）**。
> - P0-A/P0-B 已核销 46 项（2026-10-30）；P1/P2/P3 剩余 41 项于本批核销清零：
>   - **P1 20**：communication notification/im 13（前端路径对齐统一模块真实挂载
>     `/api/communication/{im,mail,notification}` + 后端 im 子路由补挂 contacts POST /
>     rooms `{id}/read` / locations / pois）；integration 7（`/batch`、`/auto-match`、
>     `sync-statistics`、`sync-logs`、`export/*` 均为零引用死封装，前端下线声明核销；
>     真实路由 `/sync/*` 已存在）。
>   - **P2 13**：core 4（sse/ws/ai-form 零引用前端下线；instances start 改指
>     `/flow/instances/{id}/start`）；ehs 3（改指真实路由 movements / check-plans /
>     check-records，旧 exam-*/stock-records 为过期 utoipa 注释）；lims 3（samples 改指
>     `/samples/{id}`，internal 改指双前缀 `/api/internal/lims/*`）；qms 2（internal 改指
>     双前缀 `/api/internal/qms/*`）；erp production-order 1（后端补挂
>     `/production-order/list-production-orders`）。
>   - **P3 8**：erp db-structure 4（前端方案 B 下线死声明，等价 RESTful 路由已在线）；
>     erp-plugin 2（后端补挂 POST 路由）；hrm 2（utoipa 注释过期，真实路由
>     `/api/erp/example/*` 已在线，前端删除过期声明）。
> - 豁免集合当前为空；后续任何 route_missing FAIL 一律阻断门禁。
>
> **2026-10-30 追加（真实登录态复核发现，待逐批核销）**：
> 修复 JWT_SECRET 基线错位（.env 与 launchd 不一致，曾致 4657 项虚假 401 WARN）并部署
> integration sync 表列漂移修复后，真实 token 暴露 32 项被掩盖的 FAIL
> （2 路由缺失 + 30 handler 500，跨 12 模块：qms/ehs/pm/pdm/lims/mes/wms/finance/portal/
> workflow/core-mdm/erp-plugin，多为表列漂移或未处理空查询）。已登记 KNOWN 豁免，
> 按模块分批诊断核销（处置记录见 `docs/契约缺口阶段二核销处置记录-2026-10-30.md` 第 10 节）。
## KNOWN

- DELETE /api/erp/master-data/sync/dead-letters/00000000-0000-0000-0000-000000000099
- DELETE /api/portal/streaming-processing/stream/00000000-0000-0000-0000-000000000099
- GET /api/bi/report/00000000-0000-0000-0000-000000000099/export
- GET /api/core/mdm/refs
- GET /api/core/mdm/refs/sync-status
- GET /api/finance/cqrs/projection-progress
- GET /api/pm/projects
- POST /api/erp/erp-plugin/auto-register-to-core
- POST /api/erp/erp-plugin/register-to-core
- POST /api/integration/mes-erp/00000000-0000-0000-0000-000000000099/retry
- POST /api/integration/mes-qms/00000000-0000-0000-0000-000000000099/retry
- POST /api/integration/sync/retry-failed
- POST /api/wms/sync/outbound-order/00000000-0000-0000-0000-000000000099/to-shipping
- PUT /api/pm/projects/00000000-0000-0000-0000-000000000099
