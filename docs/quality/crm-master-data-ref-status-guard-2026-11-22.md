# B135 · CRM 本地主数据引用状态收口

日期：2026-11-22

## 目标
`crm.crm_master_data_refs.status` 收敛为唯一 `MasterDataRefStatus` 三值（`active/inactive/deleted`）；三个主数据事件处理器不再写字面量，统一由 `MasterDataAction → MasterDataRefStatus` 映射；候选 DDL 补默认、NOT NULL 与三值 `NOT VALID` CHECK。

## 数据现状
- 本地 832 行：`active` 822、`deleted` 10、`inactive` 0；列 nullable、`DEFAULT 'active'`、无 CHECK。
- 生产快照 158 行：`active` 140、`deleted` 18；列 nullable、`DEFAULT 'active'`、无 CHECK。
- 写入方：`handle_master_data_employee_changed`、`handle_master_data_supplier_changed`、`handle_master_data_organization_changed`，都走 `upsert_local_master_data_ref`；原三处各自 `match` 动作并返回字符串。

## 代码修复
1. 新增 `svc/crm/src/modules/master_data_ref_status.rs`：
   - `MasterDataRefStatus::{Active,Inactive,Deleted}`；
   - `DB_VALUES` 三值，`DEFAULT = Active`；
   - `from_action`：`Created/Updated/Activated → Active`、`Deactivated → Inactive`、`Deleted → Deleted`；
   - `from_db_str / as_db_str / is_terminal(deleted)`；
   - 单测覆盖 roundtrip、非法 `removed`、默认、动作映射与终态。
2. `modules/mod.rs` 注册 `master_data_ref_status`。
3. 三个事件处理器：删除各自的状态 `match`，统一 `MasterDataRefStatus::from_action(event.action)`。
4. `upsert_local_master_data_ref` 参数由 `status: &str` 改为 `status: MasterDataRefStatus`，请求体写入 `status.as_db_str()`；共享 `MasterDataRefService` 的 SQL 不变。

## 候选 DDL
`docs/database/crm-master-data-ref-status-check-candidates-2026-11-22.sql`
- 回填 NULL 为 `active`、补默认 `'active'`、设 `NOT NULL`；
- 同名 CHECK 不存在时追加 `ck_crm_master_data_refs_status_standard ... NOT VALID` 三值约束；
- 同步列注释为精确三值；
- 未在任何环境应用。

## 本地事务演练（全部 ROLLBACK）
- 模拟生产：删除同名约束、解除 `NOT NULL`、清空默认，并把 1 行置 NULL。
- 执行候选：NULL 回填 `active`，`is_nullable=NO`，默认 `'active'`。
- 新约束 `convalidated=false`，即 `NOT VALID`。
- 同一行 `inactive → active → deleted` 通过。
- 非法 `removed`：23514，被约束拦下。
- ROLLBACK 后：832 行恢复，约束 0，列恢复 nullable `DEFAULT 'active'`。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：509 passed
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 error，156 warnings（存量）
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过
- 盘点：207 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0
- 队列：143 枚举 / 152 值，resolved 111，分桶一致
- glossary 与 i18n quality：通过
