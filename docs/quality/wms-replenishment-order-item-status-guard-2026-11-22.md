# WMS 补货明细状态治理（B119）

日期：2026-11-22
范围：`wms.replenishment_order_items.status`

## 唯一状态集合

| DB 值 | Rust 枚举 | 语义 | 迁移 |
| --- | --- | --- | --- |
| `pending` | `ReplenishmentOrderItemStatus::Pending` | 创建后的待确认态 | → `confirmed` |
| `confirmed` | `ReplenishmentOrderItemStatus::Confirmed` | 订单已确认，明细待执行 | → `completed` |
| `completed` | `ReplenishmentOrderItemStatus::Completed` | 订单已完成 | 终态 |

- 新增 `ReplenishmentOrderItemStatus`，`DEFAULT = Pending`，与列默认 `pending` 一致。
- 新增 `confirm_from = ["pending"]`、`complete_from = ["pending", "confirmed"]` 与 `can_transition_to` 单测。
- 前端 `ReplenishmentOrderItem` 类型从自由 `string` 收敛为三值联合类型。

## 生命周期修复

此前补货明细创建后永远停留在 `pending`：订单确认、完成都只改主表，明细状态没有随动作推进，属于假成功。

- 创建补货单：明细状态由 SQL 字面量 `'pending'` 改为绑定枚举 `DEFAULT`。
- 确认补货订单：
  - 主表 `pending/active → confirmed` 成功后，在同一事务内把该订单明细 `pending → confirmed`。
  - 明细更新失败直接返回 500，订单更新随事务回滚，不提交半成功状态。
- 完成补货订单：
  - 主表 `confirmed → completed` 成功后，在同一事务内把明细 `pending/confirmed → completed`。
  - 同样失败即回滚。
- `list_order_items`：
  - 原来只按 `order_id` 查，无租户过滤。
  - 现在补 `tenant_id`、`deleted_at IS NULL` 与 `status = ANY('pending','confirmed','completed')`。

## 存量数据

- 本地 `wms.replenishment_order_items` 0 行；生产快照 0 行。
- 列默认值已是 `pending`，候选不改默认。
- 无历史非规范状态需要归并。

## DB 候选与事务演练

候选：`docs/database/wms-replenishment-order-item-status-check-candidates-2026-11-22.sql`

- 新增 `ck_replenishment_order_items_status_standard`，`NOT VALID`。
- 本地演练（同一事务 `ROLLBACK`）：
  - 插入不写状态，默认得到 `pending`。
  - 合法推进：`pending → confirmed → completed`，两次 `UPDATE 1`。
  - 非法 `cancelled` 插入触发 `23514`。
  - 回滚后：状态 CHECK 数量 0、明细 0 行、列默认仍为 `pending`。

## 门禁

- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo fmt --all`：已执行
- `cargo test -p topems-wms --lib`：582 passed，0 failed
- `node scripts/ci/check-request-txn.mjs --changed-only`：通过
- `node scripts/ci/check-scope-api.mjs --changed-only`：通过
- `python3 scripts/ci/check-txn-write-non2xx.py --changed-only`：通过
- `node scripts/ci/dump-status-code-inventory.mjs --check --strict-palette`：通过
- `node scripts/ci/status-db-check-queue.mjs --check`：通过
- `node scripts/ci/verify-glossary.cjs --strict`：通过
- `node scripts/ci/check-i18n.cjs --mode=quality --strict`：通过
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 errors

## 未决项

- 补货明细没有独立执行/拣货端点，状态只跟随订单确认/完成；若后续需要分批发货或部分执行，需再补明细级动作。
- `wms.replenishment_suggestions.priority` 的 `normal/low` 前端值与后端 `urgent/high/medium` 仍未对齐，属于独立优先级收敛项。
