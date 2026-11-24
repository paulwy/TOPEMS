# B275 MES 设备维护状态写入口守卫（2026-11-25）

## 结论

`mes.equipment_maintenance_records.status` 已有四态 CHECK 和 `EquipmentMaintenanceStatus` 值域名，但 `PUT /api/mes/maintenances/{id}/status` 只解析目标值后直接 UPDATE，`completed` 可回退、`pending` 可跳到 `completed`，也没有并发来源态守卫。本批在枚举上补迁移矩阵，并在写入口先读当前态、校验后再带来源态更新。

## 根因与影响

- `update_maintenance_status` 仅做 `EquipmentMaintenanceStatus::from_db_str`，任何合法目标值都能写入。
- `completed / cancelled` 是终态，但接口允许它们回到 `pending/in_progress`。
- `pending` 可直接跳 `completed`，跳过开工。
- UPDATE 无 `AND status = 当前态`，并发下两个请求可互相覆盖。

## 处置

`svc/mes/src/modules/equipment_maintenance_status.rs`：

- 新增 `can_transition_to`：
  - `pending → in_progress / cancelled`
  - `in_progress → completed / cancelled`
  - `completed / cancelled` 终态
  - 同态幂等。
- 新增迁移矩阵单测。

`svc/mes/src/modules/equipment.rs`：

- `update_maintenance_status` 先按 `id + tenant_id` 读当前状态。
- 记录不存在 404；库内非法值 409。
- 目标状态经 `can_transition_to` 校验，非法流转 400，错误文案带来源态与目标态。
- UPDATE 增加 `AND status = 当前态`；并发改变返回 409。
- `result` 仍用 `COALESCE` 保留未传值。

## 验证

| 验证项 | 结果 |
| --- | --- |
| DB 约束 | `ck_mes_equipment_maintenance_records_status_standard`，四态，`convalidated=t`，列 NOT NULL 默认 `pending` |
| MES 测试 | 283 个模块测试通过；新增维护矩阵测试 1 条；既有 `test_equipment_maintenance_cycle_positive` 通过 |
| clippy | `cargo clippy -p topems-mes --all-targets -- -D warnings` 通过 |
| 状态门禁 | inventory / queue / enum contract / checks / request-txn 全 PASS |
