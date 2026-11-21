# WMS 入库单状态收口（B106）

日期：2026-11-22
范围：`wms.inbound_orders.status`、`svc/wms/src/modules/inbound_order.rs`、WMS 入库前端
基线：B105 `7d2485794` 之后的 `main`

## 命中问题

入库单同时存在三套口径，且接口允许绕过状态机：

| 来源 | 状态集合 | 问题 |
|---|---|---|
| 共享 FSM `INBOUND_ORDER` | created / confirmed / received / completed / cancelled | 后端真实状态机 |
| 前端 `inbound.ts` | pending / confirmed / receiving / quality_check / completed / cancelled | 无 created / received，且 pending、receiving、quality_check 不是后端状态 |
| 前端 `inboundOrder.ts` | pending / confirmed / receiving / completed / cancelled | 同样缺 created / received |

具体故障：

- 收货接口的状态谓词是 `status NOT IN ('received','completed','cancelled')`，`created` 可直接跳到 `received`，绕过“确认”步骤，违反共享 FSM 的 `created → received` 非法约束。
- 确认、完成接口用 `fetch_one`，状态不匹配和单据不存在都落到 `RowNotFound`，统一返回 404，无法区分“不存在”和“状态冲突”。
- 审批通过的条件写成 `requires_approval && can_transition`，当 `created` 不需要审批时短路成立，可直接把 `created` 写成 `completed`。
- 通用更新接口直接接受 `req.status.unwrap_or(existing.status)`，可任意改状态，且 UPDATE 没有旧状态谓词，并发会覆盖。
- 删除接口允许删除任意状态（包括 completed），没有状态集合过滤。
- 列表 `status` 原样进 SQL，未知值静默空集；详情没有状态集合过滤。
- 创建 INSERT 的 `status` 是字面量 `'created'`，未绑定枚举。
- 前端状态标签/筛选与后端值完全对不上，`created`、`received` 无标签和色板。

本地数据：`wms.inbound_orders` 18 行，修复前 `created 16 / pending 1 / received 1`；`pending` 是旧前端初始态遗留值，不在规范集合。

## 收口决策

规范集合：

`created / confirmed / received / completed / cancelled`

历史读兼容只用于读取，不进入写入：

- `pending` → `created`

新增 `svc/wms/src/modules/inbound_status.rs`：

- `DB_VALUES`、`DEFAULT = created`
- `from_db_str` 严格解析五值
- `from_read_str` 兼容 `pending`
- `as_db_str`、`is_terminal`
- `can_transition_to` 规范状态机
- `requires_approval`
- `DELETABLE = created / cancelled`

状态机：

```
created   → confirmed | cancelled
confirmed → created（审批驳回回退） | received | cancelled
received  → confirmed（审批驳回回流） | completed（需审批）
completed / cancelled：终态
```

`created → received`、`created → completed` 均为非法，收货必须先确认。

`svc/wms/src/shared/fsm.rs` 的 `INBOUND_ORDER` 改为直接引用上述常量，存量 `inbound_order_can_transition` / `inbound_order_requires_approval` / `is_valid_inbound_order_status` 委托枚举解析，消除第二份状态表。

## 写入口

- 创建：INSERT 的 `status` 由 `'created'` 改为绑定 `InboundStatus::DEFAULT`。
- 列表：`status` 参数走 `from_read_str`，未知值 400；SELECT 与 COUNT 都加 `status = ANY(DB_VALUES)` 和 `deleted_at IS NULL`。
- 详情：加 `status = ANY(DB_VALUES)`，集合外行 404。
- 更新：预读加状态集合过滤；只允许保持原状态或取消（`created/confirmed → cancelled`），其他状态变更 400 并指向动作接口；UPDATE 加旧状态谓词，0 行 409。
- 删除：只允许 `created / cancelled`；UPDATE 加 `status = ANY(DELETABLE)`，0 行 409。
- 确认：目标态 `confirmed`、起始态 `created` 均绑定枚举，UPDATE 带起始态谓词，0 行 409。
- 收货：状态谓词由 `NOT IN (...)` 收紧为 `confirmed`，目标 `received` 绑定枚举；0 行仍回滚并 409。
- 完成：目标态 `completed`、起始态 `received` 均绑定枚举，UPDATE 带起始态谓词，0 行 409。
- 审批启动：严格解析当前状态，仅 `received → completed` 需要审批。
- 审批通过：只允许 `received → completed`，目标态与起始态绑定枚举，UPDATE 加旧状态谓词，0 行 409；不再出现 `created → completed`。
- 审批驳回：只允许 `received → confirmed`，目标态与起始态绑定枚举，0 行 409。

所有动作的 0 行分支都在写入前或写入 0 行时返回 409，不触发 `txn-write-non2xx`。

## 前端

- `apps/web/src/api/wms/types.ts`：`InboundOrderState` 已是五值，与后端一致。
- `apps/web/src/schemas/wms/inbound.ts`：表单默认值改 `created`；状态选项、列表徽标色板、筛选统一五值。
- `apps/web/src/schemas/wms/inboundOrder.ts`：状态选项与徽标统一五值。
- `apps/web/src/utils/status.ts`：补 `created: warning` 色板。
- `zh/en wms.json`：`k15/k25/k33` 改为“已收货/Received”，`k16/k26/k34` 改为“已完成/Completed”，`k17/k27/k35` 改为“已取消/Cancelled”；`inbound_order` 同步。

## 数据核销与 DB CHECK 候选

本地事务内执行：

```sql
UPDATE wms.inbound_orders
SET status = 'created', updated_at = NOW()
WHERE status = 'pending';
```

结果：`UPDATE 1`，修复后 `created 17 / received 1 / pending 0`。

候选约束文件：`docs/database/wms-inbound-status-check-candidates-2026-11-22.sql`

```sql
ALTER TABLE wms.inbound_orders
    ADD CONSTRAINT ck_inbound_orders_status_standard
    CHECK (
        status IS NULL
        OR status::text = ANY (
            ARRAY['created','confirmed','received','completed','cancelled']::text[]
        )
    ) NOT VALID;
```

本地演练：事务内加 `NOT VALID` 约束后，将一行 `created` 改为 `bogus`，触发 `23514`（`ck_inbound_orders_status_standard`）；连接关闭后事务回滚，约束计数 0，数据分布未变。

未纳入本批：

- `wms.inbound_orders.inspection_status`：本地 18 行全为空，代码只读不写，无写入方，暂不造枚举。
- `wms.inbound_order_items.quality_status`：仍是自由文本（默认 pending，代码使用 qualified/rejected），收货时可写入任意值；这是下一批收货质量状态收口的候选。

## 验证

- `cargo check -p topems-wms`：通过。
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过。
- `cargo test -p topems-wms --lib`：552 passed。
- Web `npm run typecheck`：通过。
- `node scripts/ci/dump-status-code-inventory.mjs --strict-palette`：181 个 Rust 枚举、179 值、140 不在 DB CHECK、194 前端键、色板缺口 0。
- `node scripts/ci/status-db-check-queue.mjs`：125 枚举 / 140 值，`resolved_enums` 93。
- `check-request-txn --changed-only`、`check-scope-api --changed-only`、`check-txn-write-non2xx --changed-only`：通过。
- 本地 `wms.inbound_orders`：17 created / 1 received，无非法值；候选约束演练 23514，回滚后无残留约束。
