# B311 MES 设备删除状态守卫（2026-11-25）

## 结论

`mes.equipment` 本地未删除 10 行，全部 `idle`。

通用 update 已有 `status` 当前态并发谓词和报废终态校验，但 delete 仍是：

```sql
UPDATE mes.equipment SET deleted_at = NOW()
WHERE id = $1 AND tenant_id = $2::uuid
```

没有状态与软删过滤。运行、保养、故障中的设备可直接删除；重复删除已软删设备也会命中并返回成功。

## 代码改动

- `EquipmentStatus` 新增 `DELETABLE = ["idle"]`：
  - 运行/保养/故障设备必须先回到空闲；
  - `scrapped` 保留台账，不允许直接删除。
- delete：
  - UPDATE 增加 `AND status = ANY($3) AND deleted_at IS NULL`；
  - 0 行返回 409“不存在、已删除或非空闲”，不再假成功。

## 数据库

无 DDL。本地 10 行全 `idle`，删除行为保持不变；非空闲路径待数据触发。

## 验证

- `cargo fmt -p topems-mes`、`cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes --lib equipment_status` 3 passed（新增 `DELETABLE` 断言）。

## 遗留

报废设备当前无法通过 API 删除，需保留台账；若业务要求物理清理报废设备，应另开归档接口而不是放开通用 delete。
