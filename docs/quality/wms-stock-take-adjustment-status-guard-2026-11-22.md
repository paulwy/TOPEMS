# WMS 盘点调整状态治理（B124）

日期：2026-11-22
范围：`wms.stock_takes.adjustment_status`、`wms.stock_take_items.adjustment_status`

## 结论

盘点单与明细的调整状态统一为 `pending / completed`，默认 `pending`，唯一值源为 `StockTakeAdjustmentStatus`；`completed` 为终态。

本批修复了两个假成功与三个读侧缺口：

- 库存调整只把盘点单置 `completed`，明细 `adjustment_status` 永远为空；现在主表与全部明细在同一短事务内一起置 `completed`，任一步失败整体回滚。
- 主表与明细的 `adjustment_status` 此前均 nullable、无默认、无 CHECK，任意字符串都能落库；候选补默认、非空与 `NOT VALID` CHECK。
- 盘点列表/详情/开始/完成的行映射函数只输出少量字段，`adjustment_status` 虽然 SELECT 了却没有进 JSON；现在主表与明细响应都返回该字段。
- 明细列表/详情只过滤 `status`，非法调整状态的历史行仍会返回；现在补规范集合过滤。
- 差异批量生成用字面量 `'completed'` 判断明细是否已调整；现改绑定枚举，避免值与代码漂移。

## DB 现状

本地 `topems` 与生产快照 `topems_prod_verify_20261106`：

- `wms.stock_takes` 0 行、`wms.stock_take_items` 0 行。
- 两列均 nullable、无默认、无 CHECK；`stock_take_items` 只有 B122 记录的错误 `status` CHECK。
- 候选：`docs/database/wms-stock-take-adjustment-status-check-candidates-2026-11-22.sql`，设置默认 `pending`、补 `NOT NULL`，新增：
  - `ck_stock_takes_adjustment_status_standard`
  - `ck_stock_take_items_adjustment_status_standard`

## 代码改动

- 新增 `svc/wms/src/modules/stock_take_adjustment_status.rs`：两值枚举、`DEFAULT=Pending`、`is_terminal`、迁移矩阵与 2 个单测；禁止 `completed → pending`。
- 创建盘点单显式写 `adjustment_status=pending`，不再依赖列默认。
- 开始盘点批量生成明细时显式写 `adjustment_status=pending`。
- 手工新增盘点明细显式写默认态，`RETURNING` 返回 `quality_status / adjustment_status`。
- 明细更新 `RETURNING` 补齐 `quality_status / adjustment_status`，避免更新响应字段丢失。
- 主表列表、计数、详情补 `adjustment_status` 规范集合过滤；明细列表、详情补同样过滤。
- `adjust_stock_take` 预读严格解析调整状态，非法值 409；终态拒绝重复调整。
- 库存调整末尾新增明细更新，同一事务内把全部明细置 `completed`；主表谓词由 `COALESCE(adjustment_status,'') <> 'completed'` 改为 `COALESCE(adjustment_status,'pending') = pending`，兼容旧空值并防并发重复调整。
- `discrepancy.rs` 的防重复生成查询改为绑定 `StockTakeAdjustmentStatus::Completed`。
- 前端 `StockTakeItem.adjustment_status` 收敛为必填 `'pending' | 'completed'`；`StockTake.adjustment_status` 收敛为同值联合（保持可选以兼容创建响应）。

## 验证

- WMS 测试 592 通过；clippy/fmt 通过；前端 typecheck 通过。
- 约束事务演练：缺省插入主表/明细均为 `pending`；合法更新 `completed`；主表 `done` 与明细 `adjusted` 均 23514；明细 `NULL` 23502；ROLLBACK 后约束 0、0 行、两列恢复 nullable 无默认。
- 调整流程演练：主表 `pending → completed` 1 行，明细 `pending → completed` 1 行；重复调整头表 0 行；最终主表/明细均 `completed`，ROLLBACK 后 0 行。
- 盘点 202 个 Rust 枚举 / 190 值 / 151 不在 DB CHECK / 205 前端键，色板缺口 0；队列 138/151，resolved 106。

## 剩余风险

- `wms.stock_take_items.quality_status` 仍是自由文本，只是从库存质量状态复制；未纳入本批。
- 现会把全部明细置 `completed`，包括无差异明细。若业务需要区分“无需调整”，需在明细上增加 `not_required` 或单独布尔。
- 盘点主表 `approval_status` 仍由 B113 枚举维护，但行映射输出为原始字符串；本批未收敛其前端类型。
