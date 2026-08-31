-- 2026-09-01 活跃表归位：quality→mes（mes 引用 + qms 用显式 qa_ 前缀表无冲突 + 0 行）；quality_tasks 无引用死表 DROP
ALTER TABLE public.quality_inspections SET SCHEMA mes;
ALTER TABLE public.quality_standards SET SCHEMA mes;
ALTER TABLE public.quality_patrols SET SCHEMA mes;
ALTER TABLE public.quality_patrol_items SET SCHEMA mes;
ALTER TABLE public.quality_standard_values SET SCHEMA mes;
DROP TABLE IF EXISTS public.quality_tasks CASCADE;
