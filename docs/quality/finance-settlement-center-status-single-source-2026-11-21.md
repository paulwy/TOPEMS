# 对账中心关联与明细快照状态单一源（2026-11-21）

## 结论

`finance.reconciliation_settlement_links.status` 只由代码写 `linked` / `cancelled`，但列表过滤接受任意字符串；`finance.reconciliation_item_snapshots.match_status` 只在手工/自动对账写 `matched`，NULL 被统计隐式当作未匹配，DB 两列都没有 CHECK。

另外手工对账 UPDATE 没有排除已匹配行：对同一批已匹配明细再次手工对账，`rows_affected` 会把它们计入“本次匹配数”，形成虚高。

现统一：

- 结算关联 `linked / cancelled`；
- 对账明细快照 `unmatched / matched / diff / manual`，与 `models::MatchStatus` 的 DB ENUM 值一致；NULL / 空串按历史别名视为 `unmatched`，未知值拒绝。

## 状态机

- 创建关联：`linked`；
- 解除关联：`linked` → `cancelled`，重复解除返回“不存在或已解除”；
- 手工/自动对账：未匹配（含 NULL）→ `matched`；
- 已 `matched` 不再重复计入匹配数；
- 列表 `status` 参数只允许 `linked` / `cancelled`，其他值 400，不再静默返回 0 行。

## 改动

- 新增 `svc/finance/src/modules/settlement_center_status.rs`：`SettlementLinkStatus`、`SnapshotMatchStatus`、NULL 归一、4 个单测。
- `settlement_center/service.rs`：
  - 创建关联显式绑定 `linked`；
  - 解除关联 SET / WHERE 均改绑定 `cancelled` / `linked`；
  - 手工对账 SET `match_status` 改绑定，并增加 `COALESCE(match_status,'unmatched') <> 'matched'`，重复匹配不再计入；
  - 自动对账同步改绑定，NULL 与历史空值按未匹配处理。
- `settlement_center/handlers.rs`：`list_links` 先校验状态枚举，非法值返回 400。

## 验证

- `cargo test -p topems-finance --lib modules::settlement_center_status`：4 passed。
- `cargo clippy -p topems-finance --lib -- -D warnings`：通过。
- finance lib 全量：1107 passed，1 ignored。
- 本地库事务回滚演练：
  - 关联 `linked → cancelled` 1 行，重复解除 0 行；
  - 快照 `NULL → matched` 1 行，重复匹配 0 行。
- 未对现有数据做修改；本地两表均 0 行。

## DB CHECK（待生产窗口）

```sql
SELECT status, count(*) FROM finance.reconciliation_settlement_links GROUP BY 1;
SELECT COALESCE(match_status,'<null>'), count(*) FROM finance.reconciliation_item_snapshots GROUP BY 1;

ALTER TABLE finance.reconciliation_settlement_links
  ADD CONSTRAINT reconciliation_settlement_links_status_check
  CHECK (status IN ('linked','cancelled')) NOT VALID;

ALTER TABLE finance.reconciliation_item_snapshots
  ADD CONSTRAINT reconciliation_item_snapshots_match_status_check
  CHECK (match_status IN ('unmatched','matched','diff','manual')) NOT VALID;
```

`match_status` 的 NULL 为历史别名，CHECK 对 NULL 天然放行；生产盘点后再分别 `VALIDATE CONSTRAINT`。
