# WMS 盘点明细质量状态治理（B126）

日期：2026-11-22
范围：`wms.stock_take_items.quality_status`，并顺带收口 B122 遗留的错误 `status` 约束。

## 结论

盘点明细质量状态统一为 `qualified / unqualified / pending`，默认 `pending`，唯一值源为 `StockTakeItemQualityStatus`；质量是属性，允许三值之间重判，不设终态。

本批修复了四个写入/读取缺口：

- 开始盘点批量生成明细直接复制 `i.quality_status`，库存为空或非法时会写入 NULL/非法值；现在用 `CASE` 归一化，非规范值落 `pending`。
- 手工新增明细原先完全不写 `quality_status`，INSERT 后该列为 NULL；现在支持请求传入质量状态，严格解析非法 400，缺省绑定 `pending`。
- 明细更新原先只能改数量与盘点状态，不能纠正质量；现在 `UpdateStockTakeItemRequest` 增加可选 `quality_status`，非法值 400，缺省保持原值。
- 明细列表/详情只过滤盘点状态与调整状态，非法质量值的历史行仍会返回；现在补规范集合过滤，更新预读也补同样过滤。

同时，B122 候选尚未执行的错误 `ck_stock_take_items_status_standard`（`active/inactive/archived` 且已 VALIDATE）会让任何 `pending/completed` 写入被 23514 拦下；本批候选一并替换为两值 `NOT VALID` 约束，B122 候选由本批 supersede。

## DB 现状

本地 `topems` 与生产快照 `topems_prod_verify_20261106`：

- `wms.stock_take_items` 0 行。
- `quality_status` nullable、无默认、无 CHECK。
- `status` nullable、无默认；本地存在错误 `ck_stock_take_items_status_standard`（`active/inactive/archived`，VALIDATE），生产快照无该约束。
- 候选：`docs/database/wms-stock-take-item-quality-status-check-candidates-2026-11-22.sql`
  - 替换错误 `status` 约束，补默认 `pending`、回填、`NOT NULL`、两值 `NOT VALID` CHECK。
  - `quality_status` 设默认 `pending`、回填 NULL、`NOT NULL`、新增 `ck_stock_take_items_quality_status_standard ... NOT VALID`。

## 代码改动

- 新增 `svc/wms/src/modules/stock_take_item_quality_status.rs`：三值枚举、`DEFAULT=Pending`、允许任意重判的迁移校验与 3 个单测。
- 开始盘点批量生成：质量状态由直接复制改为 `CASE` 归一化，非 `qualified/unqualified/pending` 一律落 `pending`。
- 手工新增明细：请求新增可选 `quality_status`，严格解析，缺省 `pending`；INSERT 显式写该列。
- 明细更新：请求新增可选 `quality_status`，严格解析，SQL 用 `COALESCE($11, quality_status)` 保持缺省不变。
- 明细列表、详情、更新预读补质量状态规范集合过滤。
- 前端新增 `StockTakeItemQualityStatus` 联合类型；`StockTakeItem.quality_status` 由可选 `string` 收敛为必填三值联合；创建请求增加可选同类型字段。

## 验证

- WMS 测试 595 通过；clippy/fmt 通过；前端 typecheck 通过。
- 约束事务演练：替换错误 status 约束后，缺省插入 `status=pending`、`quality_status=pending`；合法更新 `completed/unqualified`；非法质量 `normal` 23514；`quality_status=NULL` 23502；非法状态 `done` 23514；ROLLBACK 后 quality 约束 0、明细 0 行，列恢复 nullable 无默认，错误 status 约束原样保留。
- 盘点 203 个 Rust 枚举 / 190 值 / 151 不在 DB CHECK / 205 前端键，色板缺口 0；队列 139/151，resolved 107。

## 剩余风险

- 开始盘点时库存质量非法会被静默归一为 `pending`，不会阻断盘点；如业务要求强校验，需先对库存源执行 B108 候选并清理非法值。
- `stock_take_items.quality_status` 与 `inventory.quality_status` 使用同一值域但仍是两个独立枚举，后续若增加质量值需要同步两处。
- 手工新增明细仍不按 `inventory_item_id` 关联库存，质量只能由请求显式传入或落 `pending`。
