-- B186 在制品状态约束候选（本地已应用，NOT VALID）
-- 表：mes.wips.status
-- 值集：pending / in_progress / completed / transferred（默认 in_progress）

ALTER TABLE mes.wips
  ADD CONSTRAINT ck_mes_wips_status_standard
  CHECK (status = ANY (ARRAY['pending','in_progress','completed','transferred']::text[]))
  NOT VALID;
