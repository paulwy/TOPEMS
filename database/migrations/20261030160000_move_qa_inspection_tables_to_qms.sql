-- 质检检验 4 表归位到 qms schema
-- 成因：20261021000007 建表时未显式指定 schema，随 search_path 漂移到 mes/public
-- 业务归属：qa_inspection_* 为 QMS 质检模块表（见 svc/qms/src/models/schema_defense.rs），仅 qms 服务引用
-- 幂等：使用 IF EXISTS，干净库/已归位库均安全

ALTER TABLE IF EXISTS mes.qa_inspection_items SET SCHEMA qms;
ALTER TABLE IF EXISTS mes.qa_sampling_plans SET SCHEMA qms;
ALTER TABLE IF EXISTS mes.qa_inspection_plans SET SCHEMA qms;
ALTER TABLE IF EXISTS mes.qa_inspection_plan_items SET SCHEMA qms;

ALTER TABLE IF EXISTS public.qa_inspection_items SET SCHEMA qms;
ALTER TABLE IF EXISTS public.qa_sampling_plans SET SCHEMA qms;
ALTER TABLE IF EXISTS public.qa_inspection_plans SET SCHEMA qms;
ALTER TABLE IF EXISTS public.qa_inspection_plan_items SET SCHEMA qms;
