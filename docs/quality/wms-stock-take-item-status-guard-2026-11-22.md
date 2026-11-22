# WMS 盘点明细状态治理（B122）

日期：2026-11-22
范围：`wms.stock_take_items.status`

## 问题

盘点明细状态没有唯一值源，且库内约束与代码相反：

- 库内已有同名约束 `ck_stock_take_items_status_standard`，定义是 `active / inactive / archived`，且已 `VALIDATE`；这是通用状态约束误复制到盘点明细；
- 代码实际写 `pending / completed`，一旦有明细就会被库内约束以 `23514` 拦下；
- 列无默认值，开始盘点批量生成明细、手工新增明细都不写 `status`，新行只能为 `NULL`；
- `count_stock_take` 只更新实盘量、差异量与计数时间，不更新 `status`，命中“计数成功但明细永远停在 pending”的假成功；
- `update_stock_take_item` 的 `req.status` 直接写库，任意字符串都能落库，没有枚举校验与迁移限制；
- 明细列表 SELECT 没有 `status` 列，返回 JSON 的 `status` 永远是空；
- 明细详情、通用更新都没有租户谓词。

本地与生产快照 `wms.stock_take_items` 均为 0 行；本地有上述错误且已验证的约束，生产快照没有该约束。

## 决策

- 规范集合采用代码已有两值：`pending / completed`，默认 `pending`。
- 生命周期：生成明细为 `pending`；一次实盘计数后 `completed`；已完成明细允许再次计数纠正实盘量（同态回写），但不允许回退为 `pending`。
- 明细列表、详情只返回规范集合内的行；非法写入状态 400。
- 通用更新 0 行仍返回 409，避免把并发状态变化误报为 404/参数错误。
- 候选 SQL 直接替换错误约束，不做只读兼容；本地/生产均 0 行，无迁移风险。

## 代码变更

新增 `svc/wms/src/modules/stock_take_item_status.rs`：

- `StockTakeItemStatus` 两值、`DB_VALUES`、`DEFAULT = Pending`；
- `count_from = ["pending","completed"]`；
- `is_terminal()`、`can_transition_to` 迁移矩阵；
- 2 个单测覆盖往返解析、默认值、同态回写与禁止回退。

`svc/wms/src/modules/stock_take.rs`：

- 开始盘点批量生成明细时绑定 `DEFAULT`，新明细不再为 `NULL`；
- 手工新增明细按是否带实盘量绑定 `Completed/Pending`，并在 RETURNING 中返回 `status`；
- 明细列表 SELECT 补 `status`，增加规范集合过滤；
- 明细详情补租户、规范集合过滤，并返回 `status`；
- `count_stock_take` 更新实盘量时同步把 `status` 置为 `completed`，起始态限定 `count_from`；已完成明细可重复计数纠正；
- `update_stock_take_item` 增加租户过滤、规范集合预读、`req.status` 严格解析非法 400；无显式状态时按实盘量推导并保留已完成态；增加迁移矩阵校验；禁止“无实盘量置 completed”“有实盘量置 pending”；UPDATE 带租户与当前状态谓词，0 行 409。

前端 `apps/web/src/api/wms/types.ts`：

- `StockTakeItem.status` 从缺失收敛为 `'pending' | 'completed'`。

## 验证

- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo fmt --all`：通过
- `cargo test -p topems-wms --lib`：`588 passed`（B121 为 586）
- Web `typecheck`：通过
- Web `lint`：0 errors（156 warnings，存量）
- `dump-status-code-inventory.mjs --check --strict-palette`：`200` 个 Rust 枚举 / `205` 个前端状态键一致，色板缺口 `0`
- `status-db-check-queue.mjs --check`：`138` 枚举 / `151` 值，分桶一致
- `verify-glossary.cjs --strict`：通过
- `check-i18n.cjs --mode=quality --strict`：通过

## 候选约束演练

候选文件：`docs/database/wms-stock-take-item-status-check-candidates-2026-11-22.sql`
约束：`ck_stock_take_items_status_standard`，两值，`NOT VALID`，默认 `pending`；先 `DROP CONSTRAINT IF EXISTS` 再重建。

本地事务内：

1. 删除错误约束 `active/inactive/archived`；
2. 设置默认 `pending`；
3. 加正确约束 `pending/completed`，`NOT VALID`；
4. 插入盘点单与明细探针，缺省得到 `pending`；
5. 更新 `completed` 成功；
6. 更新 `counted` 触发 `23514 ck_stock_take_items_status_standard`；
7. `ROLLBACK` 后恢复错误约束、明细 0 行、默认仍为空。

本地与生产快照预检：明细表均 `0` 行；本地错误约束已验证，生产快照无该约束。

## 残留

- 候选 SQL 尚未进入迁移、未在生产执行；**在本地或生产执行候选前，现有错误约束会拒绝代码写入的 `pending/completed`**，必须先替换约束再启用盘点明细写入。
- `stock_take_items.adjustment_status`、`quality_status` 仍是自由文本，本批未收口。
- `stock_take_items.status` 只表达“是否已盘”，不表达“待复盘/复盘完成”；若需要复盘流程，再扩展状态。
- 明细删除仍是软删，不做状态限制。
- 盘点单完成统计是否应改用 `status` 而不是 `counted_quantity`，本批未改，避免改变既有统计口径。
