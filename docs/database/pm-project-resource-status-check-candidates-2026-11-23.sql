-- B237 · `pm.project_resources.status` 状态约束候选 DDL
-- 值集唯一来源：`svc/pm/src/modules/project_resource_status.rs::ProjectResourceStatus`
--   available / in_use / maintenance / retired；默认 available
-- 历史脏值：数据库旧默认 allocated、后端旧写入 active，均归一为 available。
-- 本地 `topems` 已以 NOT VALID 真实应用，重建库待回迁。

ALTER TABLE pm.project_resources
  ALTER COLUMN status SET DEFAULT 'available';
ALTER TABLE pm.project_resources
  ALTER COLUMN status SET NOT NULL;
ALTER TABLE pm.project_resources
  DROP CONSTRAINT IF EXISTS ck_project_resources_status_standard;
ALTER TABLE pm.project_resources
  ADD CONSTRAINT ck_project_resources_status_standard
  CHECK (status = ANY (ARRAY['available','in_use','maintenance','retired']))
  NOT VALID;

COMMENT ON COLUMN pm.project_resources.status IS
  '项目资源状态：available, in_use, maintenance, retired';

-- 窗口内逐条 VALIDATE；本地 pm.project_resources 当前 0 行。
