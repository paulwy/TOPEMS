-- B185 班组状态约束候选（本地已应用，NOT VALID）
-- 表：mes.teams.status
-- 值集：active / inactive（默认 active）

ALTER TABLE mes.teams
  ADD CONSTRAINT ck_mes_teams_status_standard
  CHECK (status = ANY (ARRAY['active','inactive']::text[]))
  NOT VALID;
