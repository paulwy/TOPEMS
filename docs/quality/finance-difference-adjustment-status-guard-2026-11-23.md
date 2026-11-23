# B216 · 对账中心关联 / 差异调整状态护栏证据（2026-11-23）

## 范围

- 表：`finance.difference_adjustments.status`（varchar NOT NULL DEFAULT `pending`，本地 0 行）、
  `finance.reconciliation_settlement_links.status`（varchar NOT NULL DEFAULT `linked`，本地 0 行）
- 代码：`svc/finance/src/modules/settlement_center_status.rs`（枚举）、
  `svc/finance/src/modules/settlement_center/{service,handlers}.rs`
- 复用 B213 枚举：`finance_snapshot_status.rs`（对账 / 结算快照审批）

## 值集

- `SettlementLinkStatus = { linked, cancelled }`，默认 `linked`；本次补 `normalize` / `parse_filter`
- `DifferenceAdjustmentStatus = { pending, approved, rejected }`，默认 `pending`；
  本次补 `DB_VALUES` / `from_db_str` / `normalize` / `parse_filter`，与 `FromStr` 统一

## 修掉的缺陷

1. **差异列表过滤 "all" 直接 400**：handler 原先手工 `parse::<DifferenceAdjustmentStatus>()`，
   前端常用的 `status=all` 被判非法；现在 `parse_filter` 把 `None / 空串 / all` 统一归一为不过滤，
   真正非法值才 400。service 侧同时再跑一次 `parse_filter`，绑定归一后的 `Option<&str>`，
   避免绕过 handler 的调用（事件、内部任务）拿到自由串。
2. **关联列表过滤同样只做严格校验**：`status=all` 会 400，现改 `parse_filter` 并归一绑定。
3. **两处详情查询把 `cancelled` 写成 SQL 字面量**（`AND l.status != 'cancelled'`，对账详情 / 结算详情各一处）：
   改为 `$2` 参数绑定 `SettlementLinkStatus::Cancelled.as_str()`，状态常量单一来源。
4. **快照审批仍是字面量**：`finance.reconciliation_snapshots` 与 `finance.settlement_snapshots`
   的 `SET status = 'approved'` / `WHERE status = 'pending'` 改为 `$5` / `$6` 参数绑定
   `ReconciliationSnapshotStatus::Approved` / `SettlementSnapshotStatus::{Approved,Pending}`（B213 枚举）。
5. **差异调整列没有 DB 约束**：新增 `ck_difference_adjustments_status_standard`（NOT VALID）。
   关联表约束 `ck_reconciliation_settlement_links_status_standard` 已在 B10 存在且定义一致，本次核对无漂移。

## 本地验证

- 约束应用（superuser socket `postgresql:///topems?host=/tmp`）：
  - `finance.difference_adjustments`：0 行存量，`INSERT ... status='bogus'` 被
    `ck_difference_adjustments_status_standard` 拒绝；`pending` 可写。
  - `finance.reconciliation_settlement_links`：0 行存量，`status='bogus'` 被
    `ck_reconciliation_settlement_links_status_standard` 拒绝。
- 单测：`SettlementLinkStatus::parse_filter(Some("all")) == Ok(None)`、
  `DifferenceAdjustmentStatus::parse_filter(Some(" approved ")) == Ok(Some(Approved))`、
  未知值返回 `Err`，`FromStr("APPROVED") == Err(())`（保持大小写严格）。

## 遗留

- 两列 DB 默认值（`linked` / `pending`）现在都在常量集内，无 B210 那类默认值漂移。
- `reconciliation_item_snapshots.match_status`（`SnapshotMatchStatus`）仍未加约束、未做过滤校验，
  属于下一批候选；其值部分来自同步侧，需要先确认上游值集。
- 生产未应用：本批仅在本地 `topems` 应用 `NOT VALID` 约束，发布需按窗口执行并逐条 `VALIDATE`。
