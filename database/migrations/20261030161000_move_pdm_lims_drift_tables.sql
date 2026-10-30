-- 漂移表归位：pdm_drawings → pdm、qa_lims_analytes → lims
-- 成因：历史迁移建表未指定 schema，随 search_path 漂移到 mes
-- 业务归属：pdm_drawings 属 PDM 模块、qa_lims_analytes 属 LIMS 模块（见各 svc/models/schema_defense.rs），
-- 引用方仅 pdm/lims 服务各自引用（已核实 mes 服务无引用）
-- 幂等：IF EXISTS，干净库/已归位库均安全

ALTER TABLE IF EXISTS mes.pdm_drawings SET SCHEMA pdm;
ALTER TABLE IF EXISTS public.pdm_drawings SET SCHEMA pdm;

ALTER TABLE IF EXISTS mes.qa_lims_analytes SET SCHEMA lims;
ALTER TABLE IF EXISTS public.qa_lims_analytes SET SCHEMA lims;
