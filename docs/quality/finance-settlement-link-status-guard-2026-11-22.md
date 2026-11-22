# B141 · 对账结算关联状态收口

日期：2026-11-22

## 目标

`finance.reconciliation_settlement_links.status` 统一到 `SettlementLinkStatus`，读侧严格解析，候选 CHECK 本地应用。

## 收口前

- 本地 0 行，`NOT NULL DEFAULT 'linked'`，无 CHECK；生产快照 0 行，`NOT NULL`，无 CHECK。
- 代码已有 `SettlementLinkStatus::{Linked,Cancelled}`、`ALL`、`FromStr`；创建绑定 `Linked`，解除绑定 `Cancelled` 并带 `status = linked` 起始态谓词；列表 `status` 参数已严格解析，非法值 400。
- 缺口：枚举没有 `DB_VALUES/DEFAULT/from_db_str`，DB 无约束。

## 代码改动

`svc/finance/src/modules/settlement_center_status.rs`

- 新增 `DB_VALUES = [linked, cancelled]`、`DEFAULT = Linked`、`from_db_str`。
- `FromStr` 改为委托 `from_db_str`，保持列表参数行为不变。

写入口保持：

- 创建 `create_link`：`$7 = SettlementLinkStatus::Linked`。
- 解除 `cancel_link`：`$3 = Cancelled`，`$4 = Linked` 起始态，0 行返回资源不存在。

## 候选与本地应用

候选：`docs/database/finance-settlement-link-status-check-candidates-2026-11-22.sql`

本地 `topems` 单事务应用结果：

- 默认保持 `linked`。
- 新增 `ck_reconciliation_settlement_links_status_standard`，二值，`NOT VALID`。
- 表 0 行，无 NULL。
- 生产快照 `topems_prod_verify_20261106` 未修改；正式窗口执行候选后 `VALIDATE`。

## 门禁

- finance clippy 通过；`cargo test -p topems-finance --lib` 1111 passed / 0 failed / 1 ignored。
- 盘点 208/191/152/206、色板缺口 0；队列 144/152 一致。
- request-txn 1651、scope-api 176/144 未增，txn-write-non2xx 通过。

## 行为变化

- 无 API 行为变化；列表非法状态仍 400，创建/解除仍只产生 linked/cancelled。
- DB 层新增二值约束，非法写入 23514。
