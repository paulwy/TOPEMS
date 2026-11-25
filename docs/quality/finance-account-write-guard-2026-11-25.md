# B307 Finance 会计科目更新/删除落库守卫（2026-11-25）

## 结论

`finance.core_finance_accounts` 本地 22320 行，status 全部 `active`、`is_enabled` 全部 true。

`PUT /accounts/{id}` 与 `DELETE /accounts/{id}` 此前是占位实现：不读库、不写库、不校验租户与状态，直接返回“更新成功/删除成功”。前端会误以为科目已修改或删除，实际数据完全未变。

## 代码改动

### update

- 接入请求级 RLS 事务与 `tenant_id`，预读未删除当前 `status/is_enabled`；缺失 404、非法状态 409。
- 状态集合固定为 `active/inactive/archived`：
  - `active ↔ inactive` 可互调；两者均可归档；
  - `archived` 为终态，任何编辑 409；归档后不可回到 active/inactive。
- `is_enabled` 与状态保持一致：
  - `active + is_enabled=false` 400，要求显式改为 `inactive`；
  - `inactive/archived + is_enabled=true` 400；
  - 状态切换时自动同步 `is_enabled`。
- 实际 UPDATE `name/name_en/description/is_enabled/status`，带 `deleted_at IS NULL` 与 `status IS NOT DISTINCT FROM $8` 并发谓词；0 行 409。

### delete

- 预读未删除当前态：缺失 404、非法状态 409；`active` 409，必须先停用/归档。
- 删除前检查四类引用：未删除下级科目、凭证分录、总账、辅助核算余额；任一存在即 409。
- UPDATE 加 `deleted_at IS NULL AND status = $3`，0 行 409，重复删除不再假成功。

## 数据库

无 DDL。本地全部 active，因此删除入口会整体拒绝；更新可正常停用/归档。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib account_lifecycle` 2 passed（状态集合与归档终态）。
- 本地事务探针（已 ROLLBACK）：科目 `1001` 依赖计数 `0/8/6/0`，`active→inactive`、`inactive→active` 两条 UPDATE 均命中 1 行。

## 遗留

`POST /accounts/{id}/children-batch` 仍是占位实现，不落库；`update_account` 仅支持名称、英文名、描述、启用状态与生命周期，不允许改 code/account_type/parent，避免破坏凭证与报表口径。
