# WMS 盘点单状态收口（B113）

- 日期：2026-11-22
- 范围：`wms.stock_takes.status`、`wms.stock_takes.approval_status`
- 结论：盘点主状态四值、审批状态三值全部单一源化；审批不再直接完成盘点，完成与库存调整都加了先后顺序和重复执行保护。

## 状态集合

主状态：

```
planned → in_progress → completed
planned | in_progress → cancelled
```

默认 `planned`。审批状态：

```
NULL / pending → approved | rejected
```

`approval_status` 允许 NULL，兼容未进入审批的历史行；新开始的盘点统一写 `pending`。

## 本批发现并修掉的问题

1. **审批通过直接写 `completed`，绕过盘点统计和明细校验**：`approve_stock_take` 原来只改主状态，不计算 `total_items / counted_items / accuracy_rate`，也不检查明细是否盘完。现在审批只写 `approval_status=approved` 与审批人/日期/意见，主状态保持 `in_progress`；真正完成必须走 `complete`。
2. **完成动作可以从 `planned` 直接跳到 `completed`，且允许未盘完的明细**：现在只允许 `in_progress + approval_status=approved`，UPDATE 内嵌 `NOT EXISTS`，只要还有 `counted_quantity IS NULL` 的明细就更新 0 行并返回 409。
3. **库存调整可在盘点完成前执行，且可重复执行导致重复加减库存**：现在只允许主状态 `completed`，且 `adjustment_status` 不能已经是 `completed`；重复调整直接 409。
4. **通用 PUT 可任意改状态**：编辑只允许 `planned`，请求体出现 `status` 直接 400，UPDATE 带 `status='planned'` 谓词，并发开始盘点后编辑 0 行返回 409。
5. **删除没有状态限制**：只允许 `planned / cancelled`，0 行返回 409。
6. **取消只有 FSM 定义、没有入口**：新增 `POST /api/wms/stock-takes/{id}/cancel`，只允许 `planned / in_progress`，`completed` 不可取消。
7. 列表 `status` 参数严格解析，非法值 400；列表 SELECT/COUNT、详情都只返回四值集合内的行。
8. 开始、完成、取消、审批通过/驳回全部绑定枚举常量与状态谓词，0 行不再假成功。

## 代码

- 新增 `svc/wms/src/modules/stock_take_status.rs`：
  - `StockTakeStatus` 四值 + `DB_VALUES / DEFAULT / from_db_str / as_db_str / can_edit / can_delete / can_cancel / can_adjust / can_transition_to / requires_approval`。
  - `StockTakeApprovalStatus` 三值 + `DB_VALUES / DEFAULT / from_db_str / as_db_str`。
  - 三个单测：主状态往返/非法值、迁移矩阵、审批值往返。
- `svc/wms/src/shared/fsm.rs`：`STOCK_TAKE` 改为引用同一组枚举常量，FSM 函数先严格解析状态。
- `svc/wms/src/modules/stock_take.rs`：
  - 列表/详情/创建/更新/删除/开始/完成/调整/审批全部收口。
  - 开始：`planned → in_progress` 同时写 `approval_status=pending`。
  - 完成：`in_progress + approval_status=approved + 所有明细已盘`。
  - 调整：`completed + 未调整过`，防止重复加减库存。
  - 新增 `cancel_stock_take`。
- `svc/wms/src/modules/openapi.rs` 注册取消端点。
- 前端 `apps/web/src/schemas/wms/stockTake.ts` 补 `cancelled` 的选项、色板与筛选；`en/zh wms.json` 新增 `wms.stock_take.k25`（Cancelled / 已取消）。

## 本地事务演练

本地 `wms.stock_takes` 为 0 行，所有 DDL 与探针都在事务内执行，最后回滚。

1. 两条候选 CHECK 以 `NOT VALID` 建成。
2. 插入 `planned` 盘点单，走 `in_progress + approval pending → approval approved → completed`，每步 `UPDATE 1`。
3. 改主状态 `bogus`：`ERROR 23514`，被 `ck_stock_takes_status_standard` 拦下。
4. 独立事务插入后改 `approval_status='bogus'`：`ERROR 23514`，被 `ck_stock_takes_approval_status_standard` 拦下。
5. 两次回滚后复查：两条约束计数 0，盘点单 0 行。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo test -p topems-wms --lib`：570 passed（B112 为 567，新增 3 个）
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 errors / 156 warnings（既有告警，无新增错误）
- request-txn：`1651`，WMS `292`，与基线一致
- glossary、i18n quality：通过

## 盘点与队列

- 盘点：190 个 Rust 枚举 / 185 个唯一值 / 200 个前端键；色板缺口 0，146 个值不在 DB CHECK。
- 映射新增 `StockTakeStatus → wms.stock_takes.status`、`StockTakeApprovalStatus → wms.stock_takes.approval_status`。
- 队列：131 枚举 / 146 值，`resolved_enums = 99`。两支枚举的值都已在其他表 CHECK 中出现，不属于值级缺口，因此队列不新增行。

## 后续

- 候选 DDL 未进 `database/migrations/`，生产执行需窗口；窗口内先跑 SQL 文件头部两条预检。
- `adjustment_status` 仍是自由文本（代码只写 `completed`），本批只用它做“是否已调整”的幂等闸门，未纳入值域，留待后续批次。
- 审批通过后若重新盘点，当前没有“重新提交审批”的显式端点；可直接再次调用 approval/start 或 approve，状态仍保持 `in_progress`。
