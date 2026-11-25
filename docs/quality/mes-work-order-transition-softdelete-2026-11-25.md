# B326 MES 工单状态迁移软删守卫（2026-11-25）

## 结论

`mes.work_orders` 本地 56 行，全部为 `completed`，且全部已软删（`deleted_at IS NOT NULL`）。

工单五个状态迁移入口：

- `start`：pending → in_progress
- `complete`：in_progress → completed
- `cancel`：pending/in_progress/paused → cancelled
- `pause`：in_progress → paused
- `resume`：paused → in_progress

五条 UPDATE 都带 `tenant_id` 与 `status = ANY(起始态集合)`，但都没有 `deleted_at IS NULL`。已软删工单只要状态还在起始集合内，就可以被 start/pause/cancel/resume 重新写活；本地 56 行恰好都是 completed，未触发该路径，但生产/其他租户的已删 pending/in_progress 工单会受影响。

另外 0 行更新统一返回 404“工单不存在或状态不允许”，无法区分不存在与状态冲突。

## 代码改动

`svc/mes/src/modules/work_order.rs`：

1. 五个迁移 UPDATE 的 WHERE 统一增加 `AND wo.deleted_at IS NULL`。
2. 五个 `Ok(None)` 从 `not_found` 改为 `conflict`，错误信息明确为“工单不存在、已删除或状态不允许…”，HTTP 409。

状态集合、目标状态、事务提交/回滚逻辑未改；无 DDL。

## 验证

- `cargo fmt -p topems-mes` PASS
- `cargo check -p topems-mes` PASS
- `cargo test -p topems-mes --lib work_order_status`：1 passed
- `check-request-txn --changed-only` PASS；`check-destructive-sql` PASS

## 风险

- 本地 56 行全部已软删，无法用真实数据验证迁移入口；但软删谓词缺失是确定性缺陷。
- 前端若依赖 404 判断“状态不允许”，需要改为处理 409。
