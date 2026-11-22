-- B158 · Mobile 文档 / 巡逻记录状态唯一集合候选 CHECK（NOT VALID）
-- 值集来源：svc/mobile/src/modules/mobile_content_status.rs
-- 本地存量：mobile.documents draft 130；mobile.patrol_records pending 22。

ALTER TABLE mobile.documents
  ADD CONSTRAINT ck_mobile_documents_status_standard
  CHECK (status = ANY (ARRAY['draft','pending_review','approved','rejected','archived']))
  NOT VALID;

ALTER TABLE mobile.patrol_records
  ADD CONSTRAINT ck_mobile_patrol_records_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','completed','cancelled']))
  NOT VALID;

-- 回滚：
-- ALTER TABLE mobile.documents DROP CONSTRAINT IF EXISTS ck_mobile_documents_status_standard;
-- ALTER TABLE mobile.patrol_records DROP CONSTRAINT IF EXISTS ck_mobile_patrol_records_status_standard;
