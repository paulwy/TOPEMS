# Finance 收付款核销/付款单写入口租户严格化（B336，2026-11-26）

## 背景

Finance 域写入口的租户来源分两类：

- 新入口（如会计期间 B334、费用报销 B322/B331、付款工作流 B330）已使用 `topems_shared_auth::middleware::tenant::try_tenant_id_from_claims`，claims 缺失/非法/nil 直接 400；
- 遗留入口仍使用 `get_tenant_id_from_claims`。该函数在 claims 缺失、非法或 nil 时回退 `PLATFORM_TENANT_ID`（全零租户），源码注释明确写路径禁用。

`service/finance` 层自身虽然对 `tenant_id` 有 `require_tenant` 兜底（nil 直接 ValidationFailed），但 handler 层的回退会让请求在“无租户”状态下继续走到服务层，错误口径变成 500/业务错误，而不是明确的 400；同时平台租户是显式通道标记，不应作为业务写入口的缺省值。

## 受影响入口（8 个，均为写路径）

| 入口 | 路由语义 | 原租户来源 |
| --- | --- | --- |
| `write_off_collection_handler` | 单条收款核销 | lenient |
| `batch_write_off_collections_handler` | 批量收款核销 | lenient |
| `approve_payment_record_handler` | 付款记录审批通过（内部走 update status=approved） | lenient |
| `reject_payment_record_handler` | 付款记录驳回 | lenient |
| `update_payment_record_handler` | 付款记录编辑 | lenient |
| `delete_payment_record_handler` | 付款记录软删 | lenient |
| `write_off_payment_record_handler` | 单条付款核销 | lenient |
| `batch_write_off_payments_handler` | 批量付款核销 | lenient |

同文件的列表/详情等只读入口（`list_collections`、`get_collection`、`list_payment_records`、`get_payment_record`）保持原样，不在本批范围。

本地数据事实：`finance.erp_collection_records` 553 行全 pending、无软删；`finance.erp_payment_records` 281 行全 active。两表均已有 B313/B327 的状态、软删与并发守卫，本批只收敛租户来源。

## 修复

8 个入口统一改为：

```rust
let tenant_id = match topems_shared_auth::middleware::tenant::try_tenant_id_from_claims(&claims)
{
    Ok(t) => t,
    Err((code, msg)) => return ApiResponse::error(code, &msg),
};
```

与 B334 会计期间、B330 付款执行等入口同口径：claims 缺失/非法/nil 租户直接 400，不再回退平台租户。服务层状态机、软删谓词、并发谓词、批次返回结构（`success_count`/`fail_count`/`results` 的部分成功契约）均未改动；事务仍复用请求级 RLS 事务，提交/回滚由 `tenant_middleware` 负责。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib` 1154 passed / 1 ignored。
- 全文检索确认 8 处替换后，该文件中 lenient helper 仅剩只读入口使用；`try_tenant_id_from_claims` 从 12 处增至 20 处。
- 状态与 SQL 门禁：`dump-status-code-inventory --check --strict-palette`、`status-db-check-queue --check`、`check-status-enum-contract`、`dump-status-checks --check`、`check-request-txn --changed-only`、`check-destructive-sql`、`check-directed-migrations --changed-only` 全部通过。

## 遗留

- `get_tenant_id_from_claims` 在 `svc/finance/src/modules/mod.rs` 仍有 100+ 处（多数为只读列表/报表入口）。读路径是否也应 fail-closed 需要按入口逐个确认“是否允许平台级公共读”，不宜一刀切；后续批次按“写入口清零 → 读入口分域评审”推进。
- 收付款核销目前只更新本表状态，`receivable_id`/`payable_id` 与核销金额仅回显、未回写应收应付台账（无对应台账表），属业务建模缺口，未在本批处理。
