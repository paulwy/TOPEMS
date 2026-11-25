# B301 MES 生产订单软删隔离（2026-11-25）

## 结论

`mes.production_orders` 本地 134 行：`planned 67 / pending 52 / released 10 / in_progress 5`。状态机与动作起始态已收敛在 `ProductionOrderStatus`，但五条写路径只判 `status = ANY(起始态)`，没有 `deleted_at IS NULL`：

- 通用 update（pending）
- release（pending）
- start（released）
- complete（in_progress）
- cancel（pending/released/paused/planned）

已软删订单仍可被这些入口命中并改写状态或字段；delete 本身已有软删过滤。

## 代码改动

五条 WHERE 统一补 `AND deleted_at IS NULL`，不改状态集合、不改返回值结构：

- `WHERE id = $1 AND status = ANY($11) AND tenant_id = $10::uuid AND deleted_at IS NULL`
- release/start/complete/cancel 同理按各自占位符追加。

## 数据库

无 DDL。`status` NOT NULL 默认 pending，八态 CHECK 已存在。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo fmt -p topems-mes` 已执行。

## 遗留

`planned` 仍是历史遗留态（67 行、无当前写入方），只允许取消；清理方案另行评估。
