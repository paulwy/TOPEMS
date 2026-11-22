# B144 · 财务收款记录状态收口

日期：2026-11-22

## 目标

`finance.erp_collection_records.status` 统一到 `CollectionStatus`；历史 NULL 按既有读侧语义回填 `pending`，并落到 DB 默认与 CHECK。

## 收口前

- 本地 553 行：`pending 202`、`NULL 351`；列 nullable、无默认、无 CHECK。
- 生产快照 0 行，nullable 无默认，无 CHECK。
- 代码 `collection_status.rs` 已有三值、NULL 归一 `Pending`、`can_confirm/can_write_off`；但销售发票模块的确认/批量确认仍按字符串比较，创建仍写 `'pending'` 字面量。

## 代码改动

- `CollectionStatus` 补 `DB_VALUES = pending/confirmed/written_off`、`DEFAULT = Pending`、`from_db_str`；`normalize_collection_status` 委托严格解析，NULL 仍归一 Pending。
- `sales_invoice.rs`：
  - 回款创建 `status` 由字面量改为 `$10` 绑定 `CollectionStatus::Pending`。
  - 单条确认读取状态后严格解析，非规范值 409；`Confirmed` 重复确认 409、`WrittenOff` 已核销 409。
  - 批量确认同样严格解析；`Confirmed/WrittenOff` 计失败跳过。
  - 原子确认谓词仍为 `COALESCE(status,'pending') = 'pending'`，0 行 409 的并发语义不变。

## 本地应用

候选：`docs/database/finance-collection-status-check-candidates-2026-11-22.sql`

本地 `topems` 单事务：

- `UPDATE ... WHERE status IS NULL`：351 行回填 `pending`；总数仍 553。
- 默认 `pending`、`NOT NULL`。
- 新增 `ck_erp_collection_records_status_standard` 三值 `NOT VALID`。
- 事务内把一行改 `bogus` 实测 23514，回滚。
- 生产快照未修改；正式窗口执行需先留档原 NULL 行，再回填并 `VALIDATE`。

## 队列

`status-db-check-mappings.json` 补 `CollectionStatus`、`models::InvoiceStatus`，并把 `SagaStatus/SagaStepStatus/SettlementStatus` 标为非持久化内部态；`resolved_enums` 122→127。

## 门禁

- finance clippy 通过；`cargo test -p topems-finance --lib` 1111 passed / 0 failed / 1 ignored。
- 盘点 208/191/152/206、色板缺口 0；队列 144/152 一致。
- request-txn 1651、scope-api 176/144 未增，txn-write-non2xx 通过。
