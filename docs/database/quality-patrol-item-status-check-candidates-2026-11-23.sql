-- B188 质量巡检项目状态约束候选（本地已应用，NOT VALID）
-- 表：mes.quality_patrol_items.status
-- 值集：pending / pass / fail（默认 pending）

ALTER TABLE mes.quality_patrol_items
  ADD CONSTRAINT ck_mes_quality_patrol_items_status_standard
  CHECK (status = ANY (ARRAY['pending','pass','fail']::text[]))
  NOT VALID;
