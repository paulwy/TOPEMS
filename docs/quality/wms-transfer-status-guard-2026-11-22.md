# WMS 调拨单状态收口（B112）

- 日期：2026-11-22
- 范围：`wms.transfer_orders.status` 与 `wms.transfer_order_items.status`
- 结论：调拨单六值、明细五值全部单一源化；审批不再绕过库存动作直接改 `shipped`，完成前强制校验明细全部完成。

## 状态集合

调拨单：

```
pending → confirmed → shipped → received → completed
confirmed → pending（审批驳回回流）
pending | confirmed | shipped | received → cancelled
```

默认为 `pending`。明细：

```
pending → shipped → partial | completed
```

`partial` 表示部分收货，后续继续收货直到 `completed`；默认 `pending`。

## 本批发现并修掉的问题

1. **审批通过直接写 `shipped`，但库存没有扣减**：`approve_transfer` 原来把订单状态改成 `shipped` 就返回成功，完全跳过 `ship` 的库存扣减。现在审批只写 `approved_by / approved_at`，状态保持 `confirmed`，真正发货必须走 `ship`，不会再出现“状态已发货、库存未动”的幽灵流转。
2. **确认动作实际在写审批时间**：`confirm_transfer` 原来设置 `approved_at`，把“确认”和“审批”混在一起；现在确认只把状态从 `pending` 推到 `confirmed`，`approved_at` 只由审批接口写。
3. **收货后可以直接完成，即使还有部分收货明细**：`complete_transfer` 的 UPDATE 内嵌 `NOT EXISTS`，只要还有非 `completed`/`cancelled` 明细就更新 0 行并返回 409，避免半单完成。
4. **通用 PUT 没有状态保护**：编辑现在只允许 `pending / confirmed`，请求体出现任何 `status` 字段直接 400；UPDATE 带可编辑状态集合谓词，并发改态 0 行返回 409。
5. **删除没有状态限制**：只允许 `pending / cancelled`，先带状态谓词软删订单，成功后才删明细；0 行返回 409，避免把已发货/已收货单据连同明细物理删除。
6. **列表/详情没有规范集合过滤**：列表 `status` 参数严格解析，未知值 400；列表 SELECT/COUNT、详情都只返回六值集合内的行。
7. 确认、发货、收货、完成、审批通过、驳回全部使用枚举常量或绑定参数，0 行不再返回假成功。

## 代码

- 新增 `svc/wms/src/modules/transfer_status.rs`：
  - `TransferOrderStatus` 六值 + `DB_VALUES / DEFAULT / from_db_str / as_db_str / can_edit / can_delete / can_transition_to / requires_approval`。
  - `TransferItemStatus` 五值 + `DB_VALUES / DEFAULT / from_db_str / as_db_str / can_receive`。
  - 两个单测：默认值/往返/非法值拒绝、值唯一性与迁移矩阵。
- `svc/wms/src/modules/mod.rs` 注册。
- `svc/wms/src/shared/fsm.rs`：`TRANSFER_ORDER` 的 states/terminal/transitions/approval_transitions 改为引用同一组枚举常量；FSM 函数先严格解析状态，再调用共享 FSM，保留终态报错语义。
- `svc/wms/src/modules/transfer_order.rs`：
  - 列表/详情/创建/更新/删除/确认/发货/收货/完成/审批全部收口。
  - 创建订单与明细分别绑定 `TransferOrderStatus::DEFAULT`、`TransferItemStatus::DEFAULT`。
  - 发货明细查询与更新绑定 `pending`，收货明细更新绑定 `shipped|partial` 并写 `completed|partial`。
  - 完成 UPDATE 内嵌未完成明细 `NOT EXISTS`，半单完成直接 409。
- 前端无需改：`apps/web/src/types/wms.ts` 与 `schemas/wms/transfer.ts` 已是六值，色板已覆盖 `pending/confirmed/shipped/received/completed/cancelled/partial`。

## 本地事务演练

两张表本地均为 0 行，全部在同一事务内建约束、插入探针、走完整链路，最后不提交。

1. 两条候选 CHECK 以 `NOT VALID` 建成。
2. 插入一张 `pending` 调拨单与一条 `pending` 明细。
3. 订单走 `confirmed → shipped → received → completed`，每步 `UPDATE 1`。
4. 明细走 `shipped → partial → completed`，每步 `UPDATE 1`。
5. 订单改 `bogus`：`ERROR 23514`，被新约束拦下。
6. 回滚后复查：两条约束计数 0，订单与明细仍 0 行。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo test -p topems-wms --lib`：567 passed（B111 为 565，新增 2 个）
- request-txn、scope-api、txn-write-non2xx、盘点、队列、glossary、i18n 门禁全部通过

## 盘点与队列

- 盘点：188 个 Rust 枚举 / 185 个唯一值 / 200 个前端键；色板缺口 0，146 个值不在 DB CHECK。
- 映射新增 `TransferOrderStatus → wms.transfer_orders.status`、`TransferItemStatus → wms.transfer_order_items.status`。
- 队列：131 枚举 / 146 值，`resolved_enums = 99`。

## 后续

- 候选 DDL 未进 `database/migrations/`，生产执行需窗口；窗口内先跑 SQL 文件头部两条预检。
- 调拨单目前没有取消端点，`cancelled` 仅作为历史/直接 SQL 状态存在。已发货/已收货的取消需要逆向库存，不能只改状态，留待独立批次设计。
- `transfer_order_items` 仍有 `item_id/item_code/item_name/quantity` 等遗留列，和现行 `sku/material_name/planned_quantity` 并存；与状态无关，未在本批处理。
