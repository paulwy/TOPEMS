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
> - **批一 qms 8 项**（提交 `c748db91a`）：qa 表漂移归位 + tenant_id/404 处理，已核销。
> - **批二 10 项**（提交 `9c8670b94`/`89a572cb5`）：pdm/lims 表漂移归位、ehs 缺列、
>   lims/mes/workflow/unified-core 列与类型修复，已核销。
> - **批三 12 项**（提交 `xxxxxxx`）：core-mdm refs×2（默认表名落 public 真表）、
>   finance cqrs×1（内嵌补 CQRS 初始化）、wms to-shipping×1（补 order_date 列 +
>   契约路径已可达）、erp-plugin×2（失败分支改 501/404）、integration retry×3
>   （retry-failed 去不存在的列 + mes-erp/mes-qms 记录缺失返业务 404）、
>   route_missing×2（dead-letters DELETE 与 bi report export 404 补统一文案），已核销。
> - **收尾 3 项**（提交 `xxxxxxx`）：pm×2（pm schema/表其实已在库，真实根因是 Project
>   struct 对 jsonb tags 列缺 `#[sqlx(json)]` 解码标注 + UPDATE `$12::text[]` 与 jsonb 列
>   类型不匹配，改 `to_jsonb($12::text[])`）、portal×1（DELETE stream 的 NotFound 错误被
>   handler 包装成 500，改 `TopemsError::ResourceNotFound` + `ApiResponse::from(e)` 透传），
>   已核销。
> **32 项 FAIL 全部核销清零，KNOWN 集合为空**；后续任何 FAIL 一律阻断门禁。
## KNOWN

（空——32 项真实登录态复核 FAIL 已全部核销）

**2026-11-02 追加（批 4 p11 首次触发 smoke 门禁暴露；已核销 mes 4 / erp 3 / mobile attendance 6，剩 6）**：
批 4 p11（/api/aps 兼容层退役、aps 直连 /api/mes）首次改动 `apps/web/src/api/*` 触发
web-contract-smoke 门禁实跑，暴露 19 项存量 handler 500（此前批 4 p1-p10 均不涉及
api 目录故门禁跳过）：mes material-plans 写操作 4、erp example 演示端点 3、mobile
attendance/inventory/production 12。
- 已核销：mes material-plans 4 项根因=`tenant_id = COALESCE(NULLIF(current_setting(
  'app.tenant_id', true), ''), '00000000-...')` 缺 ::UUID cast（uuid=text 无操作符→SQL
  报错→500），material_plan.rs L289/L356 补 cast 后业务 404 计 PASS（批 4 p12 核销）。
  批 4 p13 退役 /api/v1 重启 8099 后 erp example 3 + mobile attendance 6 自动核销
  （500→200/正常语义，根因未修，疑似环境态/连接池，重跑后转绿）。
- 待核销：mobile inventory 2 + production 4（候选：mobile 同款 tenant cast 缺陷，
  后续批批量修复）。

- GET /api/mobile/inventory/items
- GET /api/mobile/inventory/items/00000000-0000-0000-0000-000000000099
- GET /api/mobile/production/orders
- GET /api/mobile/production/orders/00000000-0000-0000-0000-000000000099
- POST /api/mobile/production/orders/00000000-0000-0000-0000-000000000099/start
- POST /api/mobile/production/orders/00000000-0000-0000-0000-000000000099/complete
