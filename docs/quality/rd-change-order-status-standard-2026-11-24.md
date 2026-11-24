# RD 变更单状态值域与流转（B268，2026-11-24）

## 问题

`rs.change_orders.status` 原先只有默认值 `'planned'`，没有 CHECK；后端创建入口把 `'planned'` 写死在 SQL 中，也没有任何状态流转接口。结果是变更单一旦创建就永久停在 `planned`，执行开始、完成、取消都无法表达，状态列形同虚设。

## 状态契约

新增 `ChangeOrderStatus`，与 DB CHECK 同源：

| 状态 | 含义 |
| --- | --- |
| planned | 已计划，默认态 |
| in_progress | 执行中 |
| completed | 已完成，终态 |
| cancelled | 已取消，终态 |

流转守卫：

- planned → planned / in_progress / cancelled
- in_progress → in_progress / completed / cancelled
- completed / cancelled → 仅同值幂等，不可回退
- 别名归一：`new`/`pending` → planned，`executing`/`ongoing` → in_progress，`done`/`implemented` → completed，`canceled` → cancelled；未知值 fail-closed。

## 改动

- `svc/rd/src/modules/change_management.rs`
  - 新增 `ChangeOrderStatus`、`DB_VALUES`、`DEFAULT`、`normalize`、`can_transition_to`、`is_terminal`；
  - 创建 SQL 不再写死 `'planned'`，改为绑定 `ChangeOrderStatus::DEFAULT`；
  - 新增 `POST /api/rd/change-orders/{id}/transition`，请求体复用 `TransitionRequest { to }`：先读当前态，非法值 400、非法流转 400、记录不存在 404；进入 `completed` 时若 `executed_at` 为空则补当前时间；
  - 新增变更单状态契约与流转单测。
- `database/migrations/20261124234500_rd_change_order_status_standard.sql`
  - `status` 默认值固定 `'planned'`；
  - 新增 `ck_change_orders_status_standard`，取值四态。
- `database/rollback/20261124234500_rd_change_order_status_standard.rollback.sql`
  - 删除约束并恢复默认 `'planned'`。
- `database/migration_manifest.yaml`、`database/checksums.txt`、`docs/database/status-code-inventory.json`、`docs/database/status-db-check-mappings.json` 同步登记。

前端没有 RD 变更单状态页面，本批不涉及前端文案与类型。

## 验证

- `cargo test -p topems-rd --lib`（`TEST_DATABASE_URL=postgresql:///topems_rd_test?host=/tmp`）：173 passed，0 failed；新增 `change_order_status_db_contract_and_aliases`、`change_order_transition_paths`。
- `cargo fmt -p topems-rd`、`cargo clippy -p topems-rd --all-targets -- -D warnings`：通过。
- 本地库已应用迁移并显式 `VALIDATE CONSTRAINT`：`ck_change_orders_status_standard` 为 `convalidated=t`，定义为 `status IN ('planned','in_progress','completed','cancelled')`，默认 `'planned'`、`NOT NULL`。
- 事务探针：插入 `bogus` 被 23514 拒绝，插入 `planned` 成功；两次均回滚，`rs.change_requests` / `rs.change_orders` 保持 0 行。
- 状态台账：319 个 Rust 枚举 / 251 个前端状态键；188 队列 / 192 值；enum contract 12/12，均 PASS。
