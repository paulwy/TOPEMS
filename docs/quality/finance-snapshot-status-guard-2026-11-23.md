# Finance 对账/结算快照状态守卫（B213）

日期：2026-11-23
范围：`finance.reconciliation_snapshots.status`、`finance.settlement_snapshots.status`

## 1. 问题

两张本地快照表是 ERP 对账事件、PM/Finance 结算事件在 finance 侧的镜像，状态列都是 `text` 可空、此前无任何约束：

- 对账快照：`ReconciliationCreated` / `ReconciliationUpdated` 把事件载荷 `payload.status` 直绑 INSERT/UPDATE，事件可重放、可被其它发布方伪造，消费者零校验；本地审批写 `'approved'` 字面量，而该值并不在 `ReconciliationStatus` 枚举里。
- 结算快照：`SettlementCreated` 同样直绑载荷；本地创建写 `'draft'`、审批写 `'approved'`、驳回写 `'rejected'`，全部字面量。
- 两个列表接口 `/reconciliations`、`/settlements` 的 `status` 参数原样拼进 SQL，非法值静默返回 0 行，前端拿到空列表而不知道参数错了。

## 2. 修复

新增 `svc/finance/src/modules/finance_snapshot_status.rs`：

- `ReconciliationSnapshotStatus`（pending/draft/matched/approved，默认 pending）
- `SettlementSnapshotStatus`（pending/draft/approved/rejected，默认 pending）
- 两者均提供 `ALL` / `DB_VALUES` / `DEFAULT` / `from_db_str` / `as_db_str` / `normalize` / `parse_filter` / `Display` / `FromStr`，另有 `validate_*` 严格校验入口，4 个单测覆盖往返、过滤别名与非法值拒绝。

接线：

| 位置 | 原写法 | 现写法 |
| --- | --- | --- |
| `store_reconciliation_snapshot` | `bind(&payload.status)` | `validate_reconciliation_status` → 未知值 `ValidationFailed` |
| `update_reconciliation_snapshot` | `bind(&payload.status)` | 同上 |
| `approve_reconciliation_snapshot` | `SET status = 'approved'` | `$5` + `ReconciliationSnapshotStatus::Approved` |
| `store_settlement_snapshot` | `bind(&payload.status)` | `validate_settlement_status` → 未知值 `ValidationFailed` |
| `approve_settlement_snapshot` | `SET status = 'approved'` | `$5` + `SettlementSnapshotStatus::Approved` |
| `reject_settlement_snapshot` | `SET status = 'rejected'` | `$3` + `SettlementSnapshotStatus::Rejected` |
| `create_reconciliation` | `VALUES (..., 'draft', ...)` | `$12` + `ReconciliationSnapshotStatus::Draft` |
| `create_settlement` | `VALUES (..., 'draft', ...)` | `$10` + `SettlementSnapshotStatus::Draft` |
| `list_reconciliations` / `list_settlements` | `bind(&query.status)` 裸绑 | handler 先 `parse_filter`，非法值 400；空串/`all` 归一为不过滤 |

## 3. 数据库约束

`docs/database/finance-snapshot-status-check-candidates-2026-11-23.sql`，两条均 `NOT VALID`，已应用到本地 `topems`（两表 0 行）：

- `ck_finance_reconciliation_snapshots_status_standard`
- `ck_finance_settlement_snapshots_status_standard`

## 4. 负向验证

- `INSERT finance.reconciliation_snapshots ... status='bogus'` → `violates check constraint ck_finance_reconciliation_snapshots_status_standard`
- `INSERT finance.settlement_snapshots ... status='bogus'` → `violates check constraint ck_finance_settlement_snapshots_status_standard`

## 5. 门禁

- `cargo fmt --all` / `cargo clippy -p topems-finance --lib --tests -- -D warnings`：通过
- `cargo test -p topems-finance --lib`：**1117 passed / 1 ignored**（+4）
- `dump-status-checks --check`：406 条 CHECK / 5 ENUM / 320 无约束列，PASS
- `dump-status-code-inventory --check --strict-palette`：284 枚举 / 245 前端键，色板缺口 0，PASS
- `status-db-check-queue --check`：44 枚举 / 57 值，PASS
- `check-request-txn` / `check-scope-api` / `check-txn-write-non2xx` / `verify-glossary` / `check-i18n 7-in-1` / `apps/web typecheck`：全部通过

## 6. 遗留

- 两列可空：约束不覆盖 NULL，NULL 行仍按“未知”处理，列表状态过滤不会命中。历史 NULL 补值需按租户回填，留专项。
- `finance.reconciliation_settlement_links` / `finance.difference_adjustments` 的状态过滤已在 handler 层校验（早于本批），但其读取出口仍透出原始字符串，后续可并入归一化专项。
- 值集严格按现有写入方确定：若将来有新的发布方写出集合外状态，写入会被约束拒绝——这是有意的 fail-closed，需要先扩枚举再放行。
