# B37 · wms 智能补货状态单一源（2026-11-21）

## 现状（改动前）
- `wms.replenishment_suggestions`：本地 7332 行，全部 `active`；列默认 `'draft'`。补货计算 INSERT 写 `'active'` 字面量，确认接口却要求 `status == "draft"` —— **7332 条建议没有一条能确认**，只会在下一次计算时被 `status='draft'` 的软删清理误伤（实际不会命中 active，等于草稿清理失效）。
- `wms.replenishment_orders`：本地 0 行；列默认 `'pending'`，但创建写 `'active'`，确认谓词只认 `'pending'`，完成谓词只认 `'confirmed'` —— 新建订单永远无法确认；编辑接口把请求里的 `status` 原样写库。
- 两张表都没有 CHECK 约束。

## 改动
1. 新增 `svc/wms/src/modules/smart_replenishment/status.rs`：
   - `ReplenishmentSuggestionStatus { Draft, Active, Confirmed }`，`DEFAULT=Active`，`confirm_from = [active, draft]`；
   - `ReplenishmentOrderStatus { Pending, Confirmed, Completed }`，`DEFAULT=Pending`，`confirm_from=[pending]`、`complete_from=[confirmed]`；
   - 严格解析 + 2 个单测。
2. `suggestions.rs`：计算 INSERT 的 `'active'` 改为 `$7` 绑 `DEFAULT`；确认接口改枚举判断（draft/active 可确认，其余 422 语义的 ValidationFailed），UPDATE 改绑目标态 + `status = ANY($7)` 起始谓词。
3. `orders.rs`：创建改绑 `Pending`（与 DB 默认、确认谓词一致）；编辑 `status` 严格解析（未知值 400）再绑枚举；确认/完成改绑目标态 + 起始态谓词，0 行仍走 RowNotFound → 404。
4. 候选 DDL `docs/database/wms-replenishment-status-check-candidates-2026-11-21.sql`：两条 `NOT VALID` CHECK，并把建议列默认从 `draft` 改为 `active`（草稿态会被自动清理，不适合做默认）。

## 验证
- `cargo test -p topems-wms --lib status`：29 passed（含 2 个新枚举单测）；`cargo check/clippy -p topems-wms --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `check-request-txn` / `check-scope-api`：未新增裸事务与 `Db::new`。
- 本地演练（事务内 ROLLBACK，残留 0）：
  - suggestions：`active→confirmed`（谓词 active|draft）`UPDATE 1`；`active→'bogus'` → 23514。
  - orders：临时插入 `pending` → `confirmed` → `completed` 各 `UPDATE 1`；`completed→'bogus'` → 23514。
- 盘点：枚举 145→147、值 156、不在 DB CHECK 117、色板缺口 0；前端键 171 不变；队列 106；映射 80→82。

## 残留
- 建议确认接口的 SELECT/UPDATE 没有显式 `tenant_id` 谓词（依赖请求级 RLS 事务），与 orders 的写法不一致；本批未改。
- `draft` 只保留给历史数据与统计（`get_statistics` 统计 draft_count），补货计算仍会清理 draft；新数据不再产生 draft。
- orders 没有取消/作废态，删除仍是任意状态软删。
- 候选 CHECK 与建议列默认变更未进 `database/migrations/`，生产窗口执行。
