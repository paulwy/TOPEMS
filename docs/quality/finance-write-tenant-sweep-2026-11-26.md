# Finance 写入口租户来源清零（B337，2026-11-26）

## 背景

B336 已把收付款核销/付款记录 8 个写入口从 `get_tenant_id_from_claims`（缺租户回退平台租户）切到 `try_tenant_id_from_claims`。全文件复查发现，Finance 仍有 61 个**写入口**沿用 lenient 口径，覆盖凭证、账户、付款工作流、模板、生成规则、U8 导入、应收应付、费用审批等域。

## 盘点方法

1. 解析 `svc/finance/src/modules/mod.rs` 中全部 `async fn` 的函数体范围；
2. 从 `Router::route(...)` / `.get()/.post()/.put()/.delete()` 注册提取函数与 HTTP 方法映射；
3. 取“函数体含 `get_tenant_id_from_claims` 且注册方法含 post/put/delete/patch”的入口；
4. 补扫未被路由解析命中的私有 handler（应收/应付 CRUD、费用审批 update/transition），按函数语义纳入写路径。

## 修复

61 个写入口统一改为 strict 口径（与 B330/B334/B336 一致）：

```rust
let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
{
    Ok(t) => t,
    Err((code, msg)) => return ApiResponse::error(code, &msg),
};
```

覆盖范围（按域）：

- 凭证：create / update / delete / submit / approve / post / unpost / unapprove / reverse / batch submit / batch approve / batch post / batch delete / 模板生成 / 批量创建 / 导入（U8 与通用）/ 导出 / 年末结转 / 结转损益；
- 账户：create / update / delete / create_aux；
- 付款：create / update / delete / submit / approve / reject / export；
- 模板与规则：模板 CRUD、设默认、应用、复制、启停、匹配、分录增删改与排序、导入导出、生成规则 CRUD/启停/试算、按规则生成凭证；
- 应收应付：create / update / delete（receivable、payable）；
- 收付款记录：collection update/delete（B336 已处理核销与付款记录写入）；
- 费用审批：update / delete / transition（approve/reject 复用 transition）。

只读入口（列表、详情、账簿、试算平衡、资产负债表、利润表、现金流、账龄、dashboard、期间列表、导入状态/记录查询、模板/规则查询等 46 处）保持 lenient，留给下一批按“公共读 / 租户读 / 平台超管跨租户读”分域评审。

服务层逻辑、状态机、软删与并发谓词、批量契约、路由与权限注解均未改动；仅租户来源与失败口径（400）变化。

## 本地数据事实

- `finance.core_finance_vouchers` 22 行（draft 14，其中 4 行已软删；approved 1；posted 7）
- `finance.core_finance_accounts` 22320 行全 active
- `finance.core_finance_payments` 1 行 completed；`erp_payment_records` 281 行 active
- `finance.erp_collection_records` 553 行 pending
- `finance.expense_approvals` 178 行 pending
- `finance.receivables/payables`、`erp_receivables/erp_payables` 均 0 行
- `finance.voucher_templates` 0 行；生成规则表 0 行；U8 导入记录 0 行

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib` 1154 passed / 1 ignored。
- 静态复核：路由方法映射 + 函数体扫描后，“注册为写方法但函数体仍用 lenient helper”的结果为空；`try_tenant_id_from_claims` 从 20 处增至 81 处，lenient 使用从 107 处降至 46 处（全部为只读/报表/辅助函数）。
- 状态与 SQL 门禁：`dump-status-code-inventory --check --strict-palette`、`status-db-check-queue --check`、`check-status-enum-contract`、`dump-status-checks --check`、`check-request-txn --changed-only`、`check-destructive-sql`、`check-directed-migrations --changed-only` 全部通过。

## 遗留

- 46 处 lenient 全在只读链路。下一批 B338 计划：按 handler 清单区分公共读（无需租户，如字典/帮助）与租户读（必须 fail-closed），仅对租户读切换 strict；报表聚合类需确认平台超管是否要跨租户视图，避免一刀切导致 400。
- 该文件仍是“巨型模块”（约 8000 行、数百 handler）。租户口径统一后可考虑把 handler 层按域拆分，降低后续审计成本。
