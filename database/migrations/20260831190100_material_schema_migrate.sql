-- 2026-08-31 P1-2 阶段0 schema 归位（C 项）：material_* public → mes
-- 背景：
--   mes 服务以无前缀引用 material_*（SEARCH_PATH='mes, public' 优先解析 mes.material_*）；
--   public 旧版与 mes 同名 6 张并存（结构略异，mes 为运行真相），public 独有 2 张（categories/requirement_items）。
-- 处理：① public 独有 2 张 → SET SCHEMA mes；② 同名 6 张：public 旧版归档 _archive_material_*（数据保留）。
-- 幂等：仅在表仍位于 public 时执行。
DO $mig$
BEGIN
  -- ① public 独有（mes 无同名）→ 迁移
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='material_categories' AND c.relkind='r')
  THEN ALTER TABLE public.material_categories SET SCHEMA mes; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='material_requirement_items' AND c.relkind='r')
  THEN ALTER TABLE public.material_requirement_items SET SCHEMA mes; END IF;

  -- ② 同名旧表归档（数据保留）
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='material_boms' AND c.relkind='r')
  THEN ALTER TABLE public.material_boms RENAME TO _archive_material_boms; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='material_issue_items' AND c.relkind='r')
  THEN ALTER TABLE public.material_issue_items RENAME TO _archive_material_issue_items; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='material_issues' AND c.relkind='r')
  THEN ALTER TABLE public.material_issues RENAME TO _archive_material_issues; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='material_requirements' AND c.relkind='r')
  THEN ALTER TABLE public.material_requirements RENAME TO _archive_material_requirements; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='material_return_items' AND c.relkind='r')
  THEN ALTER TABLE public.material_return_items RENAME TO _archive_material_return_items; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='material_returns' AND c.relkind='r')
  THEN ALTER TABLE public.material_returns RENAME TO _archive_material_returns; END IF;
END $mig$;
