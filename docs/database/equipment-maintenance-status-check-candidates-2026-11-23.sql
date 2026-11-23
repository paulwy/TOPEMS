-- B184 设备维护记录状态约束候选（本地已应用，NOT VALID）
-- 表：mes.equipment_maintenance_records.status
-- 值集：pending / in_progress / completed / cancelled（默认 pending）

ALTER TABLE mes.equipment_maintenance_records
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE mes.equipment_maintenance_records
  ADD CONSTRAINT ck_mes_equipment_maintenance_records_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','completed','cancelled']::text[]))
  NOT VALID;
