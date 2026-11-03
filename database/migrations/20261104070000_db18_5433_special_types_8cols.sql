-- ============================================================
-- DB-18: 5433 USER-DEFINED enum + ARRAY↔jsonb + vector 对齐 test（8 列）
--
-- 背景：类型批次收尾——特殊类型对齐。
-- 方向：对齐 test（基准）。
-- ============================================================

SET lock_timeout = '5s';

-- ===== 1. USER-DEFINED enum 4 列 =====

DO $$ BEGIN
  CREATE TYPE bi.audit_action AS ENUM ('create','update','delete','read','execute','export','import','login','logout','access','modify');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bi.report_type AS ENUM ('table','chart','dashboard','pdf','excel','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bi.schedule_type AS ENUM ('cron','interval','once');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE bi.audit_logs ALTER COLUMN action DROP DEFAULT;
ALTER TABLE bi.audit_logs ALTER COLUMN action TYPE bi.audit_action USING action::bi.audit_action;

ALTER TABLE bi.report_schedules ALTER COLUMN schedule_type DROP DEFAULT;
ALTER TABLE bi.report_schedules ALTER COLUMN schedule_type TYPE bi.schedule_type USING schedule_type::bi.schedule_type;

ALTER TABLE bi.report_templates ALTER COLUMN template_type DROP DEFAULT;
ALTER TABLE bi.report_templates ALTER COLUMN template_type TYPE bi.report_type USING template_type::bi.report_type;

ALTER TABLE bi.reports ALTER COLUMN report_type DROP DEFAULT;
UPDATE bi.reports SET report_type = 'custom' WHERE report_type = 'summary';
ALTER TABLE bi.reports ALTER COLUMN report_type TYPE bi.report_type USING report_type::bi.report_type;

-- ===== 2. ARRAY↔jsonb 3 列 =====

ALTER TABLE erp.meeting_rooms ALTER COLUMN facilities TYPE jsonb USING to_jsonb(facilities);
ALTER TABLE rs.projects ALTER COLUMN tags TYPE jsonb USING to_jsonb(tags);

ALTER TABLE pm.projects ADD COLUMN tags_new text[];
UPDATE pm.projects SET tags_new = ARRAY(SELECT jsonb_array_elements_text(tags));
ALTER TABLE pm.projects DROP COLUMN tags;
ALTER TABLE pm.projects RENAME COLUMN tags_new TO tags;

-- ===== 3. vector 1 列 =====

ALTER TABLE core.knowledge_chunks ALTER COLUMN embedding TYPE ai.vector USING embedding::text::ai.vector;
