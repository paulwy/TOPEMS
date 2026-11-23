# B220 · 对账明细快照 match_status 护栏证据（2026-11-23）

## 范围

- 表：`finance.reconciliation_item_snapshots.match_status`（varchar NULL，无默认值，本地 0 行）
- 代码：`svc/finance/src/modules/settlement_center/service.rs`（`reconcile_items` 手工匹配、`auto_reconcile` 自动匹配、统计汇总）
- 枚举：`SnapshotMatchStatus`（unmatched / matched / diff / manual）

## 本批修掉的问题

1. **匹配判定散落 SQL 字面量**：`COALESCE(match_status,'unmatched') <> 'matched'`、
   `COUNT(*) FILTER (WHERE match_status = 'matched')`、`ri2.match_status <> 'matched'`
   共 6 处字符串字面量，与枚举 `SnapshotMatchStatus` 是两份定义。
   现全部改参数绑定（`$4` / `$5` / `$2`），只保留枚举常量作为唯一来源。
2. **枚举缺 canonical API**：补 `DB_VALUES` / `DEFAULT` / `as_db_str` / `from_db_str`，
   `DEFAULT = Unmatched` 与 SQL 的 `COALESCE(..., 'unmatched')` 语义一致。
3. **列没有 DB 约束**：新增 `ck_reconciliation_item_snapshots_match_status_standard`（`NOT VALID`）。
   该表没有 INSERT 写入方（明细快照由外部同步落库），约束正是兜住这条"代码之外"的写入路径。

## 本地验证

- 约束应用后 `INSERT ... match_status='bogus'` 被约束拒绝（`IS NULL` 分支保留，NULL 仍可写）。
- 存量 0 行，无需数据修复。
- 两个匹配入口（手工勾对、自动对账）语义不变：只把"已匹配"与"未匹配（含 NULL）"的判定从字面量换成绑定值。

## 遗留

- 该表在代码里只有 UPDATE / 统计，没有 INSERT；同步侧的写入方不在本仓库内，
  上线前需要确认同步任务产出的 `match_status` 只会落四个规范值（否则约束会在 `NOT VALID` 下只拦新行）。
- 生产未应用：仅本地 `topems` 应用 `NOT VALID` 约束，发布需按窗口执行并逐条 `VALIDATE`。
