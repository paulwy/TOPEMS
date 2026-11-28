# Finance 写端点挂在读权限码后面（B375）

- 日期：2026-11-28
- 范围：`svc/finance/src/modules/reconcile_orders.rs`、`modules/audit_v52.rs`、`modules/risk_v54.rs`
- 结论：三个模块的 Router 各自只挂了一个 `finance:*:read` 细码（模块级 `.layer`），
  **读、写端点共用同一道门**。只要角色有读权限，就能建对账单、跑审计、确认风险预警。
  代码注释里靠「网关层 `require_finance_write` 已要求 finance:admin」兜底，
  但独立部署 / 直连服务端口时不经过网关，这层兜底不存在。

## 1. 暴露的写端点（修复前）

| 模块 | 读码（唯一门） | 同门下的写端点 |
|------|----------------|----------------|
| reconcile_orders | `finance:reconcile_orders:read` | `POST /reconcile`（建单）、`POST /reconcile/auto`（批量建单并落库）、`POST /reconcile/{id}/confirm`、`POST /reconcile/{id}/dispute`、`POST /reconcile/{id}/cancel`、`PUT /reconcile/{id}/items/{item_id}` |
| audit_v52 | `finance:audit:read` | `POST/PUT/DELETE /audit-v52/rules*`、`POST /audit-v52/findings/{id}/resolve`、`POST /audit-v52/run`、`POST /audit-v52/anomaly/detect`、`POST /audit-v52/anomaly/config`、`POST /audit-v52/alerts/config`、`POST /audit-v52/alerts/{id}/acknowledge` |
| risk_v54 | `finance:risk:read` | `PUT /finance-v54/risk/alerts/{id}/acknowledge`、`PUT .../resolve`、`POST /finance-v54/fraud/score`、`PUT /finance-v54/fraud/rules/{id}`、`POST /finance-v54/compliance/review`、`POST .../workflow`、`PUT .../workflow/{id}/advance` |

其中 `reconcile` 会真的写库（`INSERT INTO finance.reconcile_orders`），
`audit-v52/run` 会跑全量审计并落发现，`risk-v54/alerts` 的 acknowledge/resolve 会改预警状态——
只读角色能直接改这些数据。

## 2. 修法

按 B363（报表读/写分流）已验证的口径，把 Router 拆成 `read_routes` / `write_routes` 再 `merge`：

1. **reconcile_orders**：读块挂 `finance:reconcile_orders:read`，写块挂
   `finance:reconcile_orders:write`（`public.core_permissions` 里本来就有这个码，
   之前只在 utoipa 注解上写了、运行时没挂）。
2. **audit_v52 / risk_v54**：权限字典没有 `finance:audit:write` / `finance:risk:write`，
   写块统一挂 `require_module_write("finance")`（= `finance:admin`），
   不新增权限条目，与 B363 报表写端点一致。
3. 顺带修正注解：`audit_v52` 里 DELETE/PUT 规则端点原先没有 `security()`，
   另有 `finance:write` / `finance:read` 这两个**字典里不存在**的码；`risk_v54` 有 `finance:update`。
   统一改为真实码（读 `finance:audit:read` / `finance:risk:read`，写 `finance:admin`），
   避免 Swagger 与权限审计对不上。
4. 读块只保留 GET：审计/风险的读端点逐条搬入读块，写端点逐条搬入写块，路由集合与修复前一一对应。

## 3. 拆分顺带暴露出的一处契约缺口

`POST /api/finance/reconcile`（建单）此前写在链式 `.route("/reconcile", get(list).post(create))` 里，
`scripts/dev/extract-live-routes.py` 只认独立 `.route(path, verb(handler))`，因此这条 POST 一直没进
「live 路由」集合，`docs/api/openapi.json` 里 `/api/finance/reconcile` 也只有 `get`。
拆成 read/write 两块后它第一次被识别为 live 路由，openapi-gate 立刻报
「新出现漂移：POST /api/finance/reconcile」。已按方向乙补齐 `docs/api/openapi.json`
（tags=Auto-Backfill、operationId=create_reconcile_order、security=finance:reconcile_orders:write），
对齐后 `check-openapi-coverage.cjs` 回到 missing=0 / extra=0。

## 4. 验证

- `cargo test -p topems-finance --lib` → **1172 passed, 0 failed, 1 ignored**
- `cargo clippy -p topems-finance --all-targets -- -D warnings` → 通过
- `cargo fmt --all --check` → 通过
- `node scripts/ci/check-openapi-coverage.cjs` → 无新漂移（missing=0 / extra=0）
- 新增棘轮 `svc/finance/src/write_perm_split_ratchet.rs`（4 条）：读块不得出现
  `routing::post/put/delete`、写块必须挂对应写门、三个模块的写路由不得回落到读块。

## 5. 遗留

1. `svc/finance/src/modules/mod.rs` 里 `payment_routes`（`finance:payment:read` 一门统吃
   `POST /payments/*/approve|reject|execute`、`POST payment-records`、`PUT/DELETE payment-records/{id}`、
   `write-off`、`batch-write-off`、`export`）与 `ar_ap_routes`（`finance:receivable:read` 统吃
   `POST /collections`、`PUT/DELETE /collections/{id}`、`write-off`、`batch-write-off`、
   `POST /receivables/batch`、`POST /payables/batch`）是同一类问题，体量大、路由多，
   单独一批（B376）按方法拆，避免和本批混。
2. `sales_invoice`、`treasury_v58`、`forecasting`、`compliance_v51`、`cqrs_routes`、
   `event_routes`、`decision_v60`、`report_center`、`accounting_subjects` 仍是「一个读码一门统吃」，
   需要逐个核写端点清单后分批处理。
3. 本批只做服务内侧门，未改网关 `require_finance_write`；两处逻辑现在一致（都要求写权限），
   但网关键路径未在测试里覆盖。
