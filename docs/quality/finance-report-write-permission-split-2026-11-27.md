# Finance 报表写端点权限下沉 + 假成功端点清点（B363，2026-11-27）

## 背景

`svc/finance/src/modules/financial_reports.rs::create_routes()` 把整组报表路由（47 条）挂在同一个
`.layer(require_permission("finance:report:read"))` 上，源码注释写着「写端点在网关层
`require_finance_write` 已要求 finance:admin」。

这句话只在**网关嵌入模式**（`svc/server/src/modules/finance_real_module.rs`）成立：那里外层套了
`require_module_access("finance")` + `require_finance_write`（非 GET 必须 `finance:admin`）。
独立部署 `svc/finance`（`main.rs` 直接 `modules::create_routes()`）**没有这一层**，于是持有
`finance:report:read` 的只读角色可以：

- `POST /reports/{balance-sheet,income-statement,cash-flow}/generate` 生成并落库报表；
- `POST /reports/submit-approval`、`/reports/approve`、`/reports/reject`、`/reports/lock`、`/reports/unlock`
  自行提交/批准/驳回/锁账/解锁；
- `POST /reports/export/batch`、`POST /reports/consolidated/generate`、合并实体/抵消维护、
  报表订阅增删改与 `send-now`。

即：**审计动作可被只读权限触发**，锁账状态可被只读权限改写。

## 为什么不是新增细码

直觉方案是拆 `finance:report:{create,update,delete}`。但 `database/migrations/20261107000012_drop_unused_permission_codes_batch25.sql`
已经把这三个码作为「无用码」删除（第 59-61、156-158 行）。重新启用需要迁移回填字典 + 角色授权，
属于本批明确回避的迁移类改动，且会造成「码在字典里有、角色没授权 → 全员 403」的窗口。

因此采用仓库既有的 `require_module_write(module)`（`lib/shared-auth/src/middleware/permission.rs:143`）：
`GET/HEAD/OPTIONS` 放行，其余方法要求 `<module>:admin`。**权限码不变**（仍是 `finance:admin`，
与网关 `require_finance_write` 完全一致），只是把同一门槛从网关复制到服务内，独立部署与网关部署行为对齐。

## 改动

1. `create_routes()` 拆成两个子 Router：
   - `read_routes`（29 条 GET）→ `require_permission("finance:report:read")`；
   - `write_routes`（18 条 POST/PUT/DELETE）→ `require_module_write("finance")`；
   - `read_routes.merge(write_routes)`。
2. 写端点 utoipa 注解 security 由 `finance:report:read` 改为 `finance:admin`（6 条已有注解的：generate_balance_sheet、
   submit_report_for_approval、lock_report、generate_consolidated_report、create_consolidation_entity、
   create_report_subscription）。
3. 补 5 条缺失注解并登记：generate_income_statement、generate_cash_flow、approve_report、reject_report、
   unlock_report（均 `finance:admin`）。
4. 新增结构棘轮测试 `report_write_routes_are_all_behind_admin_gate`：解析 `create_routes` 源码，断言
   ① 只读 Router 里不得出现任何非 GET 路由（新增写端点若误挂只读侧立即失败）；② 同一 method+path
   不得同时挂在两个子 Router（axum merge 重叠会 panic）；③ 两个子 Router 都非空。
5. `docs/api/openapi.json`：用 `generate.sh --extract-services finance` 重生成后，只替换 11 条
   `finance:admin` 报表写路径（新增 5 条：approve/reject/unlock/income-statement/generate/cash-flow/generate）。
6. `docs/api/openapi-baseline-gaps.json`：新增 5 条 `extra_in_openapi`（提取器仍看不见
   `axum::routing::*` 全限定写法，见 B362 证据）。

## 顺带清点：报表域 6 个写端点返回“成功”但什么都没做

拆分时逐个核对 handler 实现，发现以下端点**不落库、不做副作用，却返回 200 + 成功文案/合成数据**：

| 端点 | handler | 实际行为 |
| --- | --- | --- |
| `POST /reports/subscriptions` | `create_report_subscription` | 无 sqlx；回显入参 + 随机 id，声称创建成功 |
| `GET /reports/subscriptions` | `get_report_subscriptions` | 无 sqlx；返回硬编码示例订阅 |
| `PUT /reports/subscriptions/{id}` | `update_report_subscription` | 无 sqlx；回显入参 + `updated_at`，声称更新成功 |
| `DELETE /reports/subscriptions/{id}` | `delete_report_subscription` | 返回 `deleted: true`，未删任何行 |
| `POST /reports/subscriptions/{id}/send-now` | `send_report_now` | 返回 `status: "sent"`，未发任何邮件 |
| `POST /reports/export/batch` | `batch_export_reports` | 按 org×period 拼出 `status: "completed"` + 伪造 `url`，未生成文件 |

另有 3 个端点是**诚实的未接入**（返回 `success: false` + 指路 ERP）：`POST/PUT/DELETE /reports/consolidated/entities*`、
`POST /reports/consolidated/elims`、`POST /reports/consolidated/generate` 为 22 行占位。

这批假成功端点已登记进 TODO 作为下一批候选（`X-Stub` 未打标，前端会当成功展示）。

## 验证

- `cargo test -p topems-finance --lib`：见 `/tmp/b363full.log`。
- `cargo clippy -p topems-finance --lib -- -D warnings`：见 `/tmp/b363clippy.log`。
- `node scripts/ci/check-openapi-coverage.cjs`：PASS（missing=0 / extra=0）。
- 结构核对：47 条路由 = 29 GET + 18 写，读/写两侧无重叠。

## 遗留

- 报表读端点文档码存在三套口径：`finance:report:read`、`finance:financial_reports:read`、
  `finance:sales_invoice:read`（应收类报表），而路由层统一是 `finance:report:read`，需专项对齐。
- 报表订阅域 5 条 + 批量导出 1 条为假成功端点，建议要么落库实现，要么按 `openapi-known-stubs.json`
  的 X-Stub 口径显形（返回 501 + `X-Stub: true`），别继续假装成功。
- 同类「只靠网关兜底」的模块在 `svc/finance` 还有一批（forecast/risk/audit/decision/report_center 等
  注释里都写着同一句），本批只收口 `financial_reports`。
