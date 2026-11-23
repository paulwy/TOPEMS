-- B201 车辆与用车申请状态候选约束（2026-11-23）
--
-- 目标：把两列收敛到唯一枚举（同一模块 `svc/erp/src/modules/vehicle_status.rs`）
--   `VehicleStatus`        → erp.vehicles.status
--   `VehicleRequestStatus` → erp.vehicle_requests.status
--
-- 现状：两列都是 varchar 可空、无 DB 默认；所有写入都是 SQL 字面量 + 原样透传：
--   vehicles 创建写 `'available'`、更新 `req.status.unwrap_or(existing.status)` 可写任意串、
--     创建用车申请时校验 `AND status = 'available'`、列表过滤 `params.status.clone()` 原样绑定；
--   vehicle_requests 创建写 `'pending'`、更新同样任意串、冲突检测 `AND status = 'approved'`、
--     列表过滤同样原样绑定。
-- 本批全部改为枚举绑定，创建默认值由枚举提供（`available` / `pending`），
-- 两列可空，约束按 `IS NULL OR IN (...)` 写法保留 NULL 语义。
-- 约束以 NOT VALID 应用，生产历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。

ALTER TABLE erp.vehicles
  ADD CONSTRAINT ck_erp_vehicles_status_standard
  CHECK (status IS NULL OR status IN ('available', 'in_use', 'maintenance', 'unavailable'))
  NOT VALID;

ALTER TABLE erp.vehicle_requests
  ADD CONSTRAINT ck_erp_vehicle_requests_status_standard
  CHECK (status IS NULL OR status IN ('pending', 'approved', 'rejected', 'completed'))
  NOT VALID;
