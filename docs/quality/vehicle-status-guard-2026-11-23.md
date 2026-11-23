# B201 车辆与用车申请状态收敛证据（2026-11-23）

## 唯一枚举（两列，同一文件）

`svc/erp/src/modules/vehicle_status.rs`

| 枚举 | 落库列 | 值集 | 默认 |
| --- | --- | --- | --- |
| `VehicleStatus` | `erp.vehicles.status` | `available` / `in_use` / `maintenance` / `unavailable` | `available` |
| `VehicleRequestStatus` | `erp.vehicle_requests.status` | `pending` / `approved` / `rejected` / `completed` | `pending` |

两列均为 varchar 可空、**无 DB 默认**，所以默认值只能由写入口提供：本批把创建写入字面量换成枚举常量，
并保证「列默认缺失 + 代码默认」只有一处来源。值集对齐前端
`apps/web/src/schemas/erp/vehicle.ts` 与 `apps/web/src/schemas/erp/vehicleRequest.ts`
的下拉、筛选、`statusBadge.colorMap`、`labelMap`（各 4 值）。

单测：两组 4 值往返；`bogus` / `active` / `cancelled` 拒绝；`in-use`、`inuse`、`done`、`complete`
别名归一；`normalize` / `normalize_optional` 对未知值与 `None` 的兜底；`parse_filter` 覆盖
`None` / 空白 / `ALL` / 合法值 / 非法值。

## 代码侧收敛（`vehicles.rs`）

| 位置 | 收敛前 | 收敛后 |
| --- | --- | --- |
| `list_vehicles` | `status_filter = params.status.clone()` 原样绑定 | `VehicleStatus::parse_filter`，非法 400 |
| `create_vehicle` | `VALUES (..., 'available', ...)` | `VALUES (..., $6, ...)` 绑 `VehicleStatus::DEFAULT` |
| `update_vehicle` | `req.status.unwrap_or(existing.status)` 可写任意串 | 有值时枚举校验、非法 400；无值沿用原值 |
| `create_vehicle_request` 车辆校验 | `AND status = 'available'` | `AND status = $2` 绑 `Available` |
| `create_vehicle_request` 冲突检测 | `AND status = 'approved'` | `AND status = $4` 绑 `VehicleRequestStatus::Approved` |
| `create_vehicle_request` 写入 | `VALUES (..., 'pending', ...)` | 绑 `VehicleRequestStatus::DEFAULT` |
| `list_vehicle_requests` | `status_filter = params.status.clone()` 原样绑定 | `VehicleRequestStatus::parse_filter`，非法 400 |
| `update_vehicle_request` | `req.status.unwrap_or(existing.status)` 可写任意串 | 有值时枚举校验、非法 400；无值沿用原值 |

响应侧：`normalize_vehicle` / `normalize_vehicle_request` 覆盖 2 个列表分页、2 个详情、1 个 `/vehicles/{id}/requests`
以及创建/更新共 9 个出口，未知历史值回落各自默认态。

## 数据库约束

- 候选：`docs/database/vehicle-status-check-candidates-2026-11-23.sql`
- `ck_erp_vehicles_status_standard`：`CHECK (status IS NULL OR status IN (4 值))`，`NOT VALID`
- `ck_erp_vehicle_requests_status_standard`：`CHECK (status IS NULL OR status IN (4 值))`，`NOT VALID`
- 本地应用：两张表均 0 行，两条约束 `convalidated=false`
- 探针：分别以 `status='bogus'` 插入两表，均被对应约束拒绝，事务回滚
- 默认值：两列无 DB 默认，创建默认由枚举 `DEFAULT` 提供，无需 `ALTER COLUMN SET DEFAULT`

## 门禁

- `cargo clippy -p topems-erp --lib --tests -- -D warnings` 通过
- `cargo test -p topems-erp --lib`：889 passed
