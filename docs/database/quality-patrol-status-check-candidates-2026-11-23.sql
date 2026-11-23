-- B187 质量巡检状态约束候选（本地已应用，NOT VALID）
-- 表：mes.quality_patrols.status
-- 值集：pending / in_progress / completed（默认 pending）

ALTER TABLE mes.quality_patrols
  ADD CONSTRAINT ck_mes_quality_patrols_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','completed']::text[]))
  NOT VALID;
