# B137 · CRM 事件自动建交互记录状态绑定

日期：2026-11-22

## 目标
闭合 B132 遗留：`event_handlers` 中两处自动创建 `crm.interactions` 的 INSERT 仍写死 `'in_progress'` / `'scheduled'`，未走唯一枚举源。本批改为绑定 `InteractionStatus`，不新增值、不改 DB 结构。

## 代码修复（svc/crm/src/event_handlers/mod.rs）
1. 导入 `InteractionStatus`。
2. `AfterSalesTicketCreated` 自动建售后交互：
   - `VALUES` 中 `'in_progress'` 改为 `$6`；
   - 绑定 `InteractionStatus::InProgress.as_db_str()`；
   - 时间与租户参数顺延为 `$7/$8/$9`。
3. `OpportunityWon` 自动建跟进任务：
   - `VALUES` 中 `'scheduled'` 改为 `$7`；
   - 绑定 `InteractionStatus::Scheduled.as_db_str()`；
   - 时间与租户参数顺延为 `$8/$9/$10/$11`。
4. 写入值仍在 B132 候选 `ck_interactions_status_standard` 的四值集合内，无需新增候选。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：510 passed
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-txn-write-non2xx`：通过
- 盘点与队列：无新增枚举/值，维持 208/191/152/206、144/152 resolved 112
