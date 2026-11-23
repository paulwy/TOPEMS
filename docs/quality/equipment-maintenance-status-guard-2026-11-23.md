# 设备维护记录状态守卫（B184）

日期：2026-11-23
表：`mes.equipment_maintenance_records.status`
枚举：`EquipmentMaintenanceStatus`（`svc/mes/src/modules/equipment_maintenance_status.rs`）

## 唯一值集

`pending` / `in_progress` / `completed` / `cancelled`，默认 `pending`。

## 收口内容

| 入口 | 收口前 | 收口后 |
| --- | --- | --- |
| 创建维护记录 | `status` 原样落库，缺省写 `pending` | 先过 `from_db_str`，非法值 400；缺省绑定 `Pending` |
| 更新维护状态 | `req.status` 直接绑定 `$2` | 先过 `from_db_str`，非法值 400；绑定枚举 |
| DB 默认 | `'in_progress'` | `'pending'`，与创建缺省一致 |

## 数据库验证

- 约束：`ck_mes_equipment_maintenance_records_status_standard`，`convalidated = false`（NOT VALID）。
- 默认值：`'pending'::character varying`。
- 存量：0 行、非法值 0 行。
- 负向验证：`status='bogus'` 插入被拒，事务回滚。

## 门禁

- `cargo clippy -p topems-mes --lib --tests -- -D warnings`：通过
- `cargo test -p topems-mes --lib`：398 passed
