# Finance 预算写路径租户收敛（B331）

日期：2026-11-26

## 背景

`finance.budgets` 本地 286 行，状态全部 `active`。租户分布：

- `00000000-0000-0000-0000-000000000001`：262 行；
- `tenant_id IS NULL`：23 行；
- `00000000-0000-0000-0000-000000000000`：1 行。

`update_budget` / `delete_budget` 原来 `_claims` 未读取，当前态查询、UPDATE、软删 UPDATE 都只按 `id` 定位，跨租户改删完全依赖 RLS：

- `update_budget`：`SELECT status, used_amount, total_budget ... WHERE id=$1 AND deleted_at IS NULL`，主 UPDATE 仅 `id + status`；
- `delete_budget`：状态预读与软删 UPDATE 均无 `tenant_id`。

## 改动

`svc/finance/src/modules/operational.rs`：

- `update_budget` / `delete_budget` 改为读取 `claims`，统一走 `resolve_write_tenant`：缺失或非法租户直接 400，超管无租户上下文同样拒绝；
- `update_budget` 的当前态 SELECT 补 `tenant_id = $2::uuid`，主 UPDATE 补 `tenant_id = $12::uuid`；
- `delete_budget` 的状态 SELECT 补 `tenant_id = $2::uuid`，软删 UPDATE 补 `tenant_id = $4::uuid`；
- 预算状态机 `BudgetStatus::check_update`、删除集合 `DELETABLE`、并发状态谓词与事务提交方式均不变。

## 验证

- `cargo fmt -p topems-finance`
- `cargo check -p topems-finance` PASS
- `cargo test -p topems-finance --lib operational`：9 passed

本批无 migration、无 DDL。

## 风险与遗留

- 23 行 `tenant_id IS NULL` 与 1 行全零租户预算，在加上显式租户谓词后将无法通过正常写接口 update/delete；已记录，未静默回填。
- 预算读取接口 `get_budget` 仍未绑定 claims 租户，是否属于跨租户只读能力由既有 RLS 语义决定，不在本批写路径范围。
- 前端若以超管身份、无租户上下文调用预算更新/删除，将从“依赖 RLS 成功”变为 400“缺少租户ID”。
