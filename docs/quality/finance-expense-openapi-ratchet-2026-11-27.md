# Finance 费用/审批域 OpenAPI 契约棘轮（B362，2026-11-27）

## 背景

`docs/api/openapi.json` 是仓库唯一的 OpenAPI 快照（2777 paths，单行 minified）。核对费用域时发现两处
「文档与实现互相打脸」：

1. **文档少 9 条端点中的 5 条**：费用审批域实际有 9 条路由（列表/详情/新建/更新/删除/submit/approve/
   reimburse/reject）与费用域 6 条（列表/详情/新建/更新/删除/pay），而 `openapi.json` 里费用相关只
   有 4 条（`POST /expense-approvals`、`POST /expense-approvals/{id}/reject`、`GET /expenses`、
   `GET/DELETE /expenses/{id}`）。
2. **权限码是粗码 + 幽灵码**：`GET /expenses`、`GET /expenses/{id}` 文档写 `finance:read`，
   `DELETE /expenses/{id}` 写 `finance:delete`，而路由层实际拦的是
   `finance:expense:{read,delete}`；两条审批端点文档里仍挂着 B349 宣称已清除的幽灵码
   `finance:approval:admin`（真实码 `finance:expense_approval:create|update`）。

## 根因

- **注解层**：`create_expense` / `update_expense` / 费用审批的 list/get/update/delete/submit/approve
  共 8 个 handler 没有 `#[utoipa::path]`；`list_expenses` / `get_expense` / `delete_expense` 的注解
  security 写的是粗码；`submit_report_for_approval` 仍挂幽灵码。
- **注册层**：`svc/finance/src/openapi.rs` 的 `#[openapi(paths(...))]` 只登记了
  `list_expenses/get_expense/delete_expense/create_expense_approval/reject_expense_approval`。
  即使 handler 有注解，未登记也不会出现在 spec 里——这是「注解写了却看不到」的真正断点。
- **工具层**：`scripts/ci/perm-code-mapping.json` 的 `"*approval*": "finance:approval:admin"` 是
  幽灵码的生产源，`scripts/ci/auto-insert-utoipa-permission.cjs` 会照着它继续写幽灵码。

## 改动

1. `svc/finance/src/modules/operational.rs`
   - `list_expenses` / `get_expense` → `finance:expense:read`，`delete_expense` → `finance:expense:delete`；
   - 新增 `create_expense`（`POST /expenses`，`finance:expense:create`）与
     `update_expense`（`PUT /expenses/{id}`，`finance:expense:update`）注解。
2. `svc/finance/src/modules/mod.rs`
   - 新增 `list_expense_approvals`（get, `read`）、`get_expense_approval`（get, `read`）、
     `update_expense_approval`（put, `update`）、`delete_expense_approval`（delete, `delete`）、
     `submit_expense_approval`（post, `update`）、`approve_expense_approval`（post, `update`）注解；
     权限码与 `expense_approval_{read,update,delete}_routes` 三组 Router 的 `require_permission` 逐条对齐。
3. `svc/finance/src/openapi.rs`
   - 注册 12 个 handler（上述 8 个 + `pay_expense` + `reimburse_expense_approval`）；
   - 新增 `openapi_ratchet_tests`：`expense_paths_are_documented_with_enforced_codes` 固定 15 条
     `(path, method, code)`，走 `ApiDoc::openapi()` → `serde_json` 全链路断言；`retired_approval_code_is_gone`
     断言幽灵码不再出现在任何 operation 的 `security`。
4. `svc/finance/src/modules/financial_reports.rs`：`submit_report_for_approval` 的
   `finance:approval:admin` → `finance:report:read`（与同 Router 的 `lock_report` 等一致）。
5. `scripts/ci/perm-code-mapping.json`：`"*approval*"` 由幽灵码改为 `finance:expense_approval:update`。
6. `docs/api/openapi.json`：用 `scripts/openapi/generate.sh --extract --extract-services finance`
   重生成 finance spec，**只替换费用相关 9 条路径**（其余 122 条 finance 路径、组件 schema 全部保持
   上游内容不变，避免把上游并行改动卷进来）；`security: []` 的两条端点（报表提交审批、通用审批通过）
   显式补回真实码，避免 `[]` 被解释为「无需鉴权」。
7. `docs/api/openapi-baseline-gaps.json`：新增 7 条 `extra_in_openapi` 白名单。

## 为什么这 7 条要进白名单而不是改提取器

`scripts/dev/extract-live-routes.py` 的 `ROUTE_RE` 要求 `.route("<path>", get(handler))`，
即方法名紧跟逗号。`svc/finance/src/modules/mod.rs` 的路由用全限定写法
`.route("/x", axum::routing::get(handler))`，正则匹配不到 → 这些路由在 live 清单里根本不存在，
覆盖率门禁（`check-openapi-coverage.cjs`）两侧都为空，于是「文档缺失」永远不会报警。

实测放开 `axum::routing::` 前缀后，全仓可多抽出 **5066** 条此前不可见的路由（含 test 模块），
属于单独一次全仓路由清单重建，不适合塞进本批；本批只把这 7 条已文档化、但解析器看不见的端点
登记进基线，并在 `TODO.md` 记录提取器缺陷。

## 验证

- `cargo test -p topems-finance --lib`：见 `/tmp/b362full.log`（新增 2 条棘轮测试；总量与 1161 对齐）。
- `cargo clippy -p topems-finance --lib -- -D warnings`：见 `/tmp/b362clippy.log`。
- `node scripts/ci/check-openapi-coverage.cjs`：`✅ PASS: 无新漂移（missing=0, extra=0）`。
- spec 差异核对：`added 5 / changed 6 / removed 0`，`components.schemas` 完全未变。
- 本机数据：`finance.expense_approvals` 178 行全 `pending`；`finance.expenses` 3 行全 `submitted`。

## rebase 冲突与上游漂移（并入本批说明）

push 时 `main` 已被并行 agent 推进到 `91e0a6076`（file 域注解补全），`docs/api/openapi.json` 整行冲突。
处置：以 `origin/main` 版本为底，重新只套用 9 条费用路径替换 + 两条 `security: []` 修正，再跑覆盖率门禁。

结果暴露出上游带入的文档漂移：`origin/main` 的 spec 有 **44 条** operation 在 live 清单里找不到，集中在
`/api/core/file/*`（实际挂载为 `/api/core/files/*`，疑似文档前缀多了一层 `file`）、`/api/erp/*`、
`/api/communication/notification/*`、`/api/core/audit|automation/*`。这批不是我引入的，但会让门禁红，
且 `openapi.json` 是单行 minified、无法只提交自己那几行，故随本批一并登记进
`docs/api/openapi-baseline-gaps.json` 的 `extra_in_openapi`，并在 `TODO.md` 留待上游复核。

另：同一条命令在不同时刻跑 `check-openapi-coverage.cjs`，live 抽取条数在 3976 与 4157 之间浮动
（脚本内部自带 extractor 与手动 CSV 结果不一致），说明 `extract-live-routes.py` 还有非确定性/漏配，
与上文 5066 条失明问题同源。

## 遗留

- 提取器对 `axum::routing::*` 全限定写法失明（5066 条），且同一份代码两次抽取条数不一致
  （3976 vs 4157），需专项重建 live 路由清单并重跑基线。
- 上游 `91e0a6076` 的 44 条文档路径与 live 不一致（`/api/core/file/*` 前缀疑似多余、erp/notification/audit 若干），
  已入基线待上游复核；若确认为文档写错，应改注解并从基线移除。
- `/api/finance/reports/*` 的写端点（submit-approval/approve/reject/lock）文档码为 `finance:report:read`，
  实际写拦截靠网关 `require_finance_write` 要求 `finance:admin`；独立部署（无网关层）时该缺口仍在，
  是否给报表写端点挂内层细码待定。
- `ExpenseApprovalUpsert` 未 derive `ToSchema`，put 端点 request_body 暂用 `serde_json::Value`。
