# ERP 采购订单状态读取收口（B91）

日期：2026-11-22
范围：`erp.purchase_orders` 的列表过滤、详情、更新入口读取集合。

## 问题

`PurchaseOrderStatus` 唯一集合为 `pending/approved/cancelled`，写入与流转均按枚举绑定。但读取侧仍是自由文本：

- 列表 `status` 参数原样绑定，任意值可查询，不返回 400。
- 列表（带过滤/不带过滤）、总数、详情、更新都未加 `status IN (...)`，集合外历史值可被读取甚至编辑。
- 详情用 `fetch_one` 把所有数据库错误都折叠成 404。

本地 `erp.purchase_orders` 当前 0 行，暂无存量脏值，但读取契约仍与唯一集合不一致。

## 方案

- 列表 `status` 参数用 `PurchaseOrderStatus::from_db_str` 严格解析，未知值 400，绑定规范字符串。
- 列表两条 SQL 与总数 SQL 统一加 `status IN ('pending','approved','cancelled')`。
- 详情 SQL 加同一过滤，`fetch_one` 改 `fetch_optional`：不存在/集合外 404，数据库错误返回 500，不再误报 404。
- 更新 SQL 的 `WHERE` 加同一过滤，集合外行不可编辑，返回 404。
- 写入与 approve/cancel 流转未放宽，仍只接受枚举值。

## 验证

- `cargo check -p topems-erp`：通过。
- `cargo clippy -p topems-erp --all-targets -- -D warnings`：通过。
- `cargo test -p topems-erp --lib purchase_order`：8 passed。
- 本地库计数：`total=0`、`allowed=0`，无存量脏值可演练。
- 状态盘点/队列：172 枚举、181 前端键、色板缺口 0；118 枚举 / 127 值分桶一致。
- 候选约束仍为 `docs/database/erp-purchase-order-status-check-candidates-2026-11-21.sql` 的三值 `NOT VALID` 版本，未进迁移、未在生产执行。
