# MES 生产订单与工单读取集合收口（B95）

日期：2026-11-22
范围：`mes.production_orders`、`mes.work_orders` 的列表与详情读取。

## 问题

- 两张表的列表 `status` 参数都是自由文本：任意字符串直接进动态 SQL，非法值不返回 400，只静默查空。
- 列表基础 WHERE 只有 `deleted_at IS NULL`，没有 `status IN (...)`；集合外历史值会进入分页与总数。
- 详情只按 `id + tenant_id`，集合外状态行仍可 200 返回。
- `mes.production_orders.status` 的 DB 默认值仍是历史 `created`，不在八值集合内；代码创建显式写 `pending`，但绕过代码的写入会踩默认值。

## 方案

- 生产订单：列表 `status` 用 `ProductionOrderStatus::from_db_str` 严格解析，未知 400；动态 WHERE 基础条件固定加八值过滤；详情加同一过滤。
- 工单：列表 `status` 用 `WorkOrderStatus::from_db_str` 严格解析，未知 400；基础 WHERE 固定加五值过滤；详情加同一过滤。
- 列表过滤绑定枚举规范字符串，参数占位符编号不变；总数查询复用同一 WHERE。
- 写入与流转谓词未放宽。

## 验证

- `cargo check -p topems-mes`：通过。
- `cargo clippy -p topems-mes --all-targets -- -D warnings`：通过。
- `cargo test -p topems-mes --lib production_order`：21 passed；`--lib work_order`：19 passed。
- 本地 `mes.production_orders` 134 行有效：事务内插入 1 行 `bogus` 后全表 135、八值过滤 134；对脏值执行带过滤更新为 `UPDATE 0`；`ROLLBACK` 后无残留。
- 本地 `mes.work_orders` 56 行全为 `completed`，五值过滤后仍 56。
- 状态盘点/队列：172 枚举、181 前端键、色板缺口 0；118 枚举 / 127 值分桶一致。
- 候选约束仍为 `docs/database/mes-production-order-status-check-candidates-2026-11-21.sql`、`docs/database/mes-work-order-status-check-candidates-2026-11-21.sql`，均保持 `NOT VALID`，未进迁移、未在生产执行。

## 残余

生产订单 DB 列默认 `created` 与八值集合不一致，属于 DDL 变更，需窗口内改默认值到 `pending`；本批不改生产 schema，已在候选文件登记。
