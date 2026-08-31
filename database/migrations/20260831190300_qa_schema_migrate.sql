-- 2026-08-31 P1-2 阶段0 schema 归位（A 项）：qa_* public → lims/qms/ehs
-- 分类：qa_lab_*/qa_lims_* → lims；qa_ehs_* → ehs（EHS 域，ehs schema 已有同名真相表）；
--       其余质量体系 qa_*（apqp/fmea/spc/audit/corrective/alert/standard/inspection/quality/eightd）→ qms。
-- 规则：目标 schema 已有同名 → public 旧版归档 _archive_*（数据保留）；无同名 → SET SCHEMA 迁移。
-- 幂等：仅在表仍位于 public 时处理。
DO $mig$
DECLARE r record; tgt text;
BEGIN
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'qa\_%' ESCAPE '\'
    ORDER BY 1
  LOOP
    IF r.relname LIKE 'qa\_lab\_%' ESCAPE '\' OR r.relname LIKE 'qa\_lims\_%' ESCAPE '\' THEN tgt := 'lims';
    ELSIF r.relname LIKE 'qa\_ehs\_%' ESCAPE '\' THEN tgt := 'ehs';
    ELSE tgt := 'qms'; END IF;

    IF EXISTS (SELECT 1 FROM pg_class c2 JOIN pg_namespace n2 ON n2.oid=c2.relnamespace
               WHERE n2.nspname=tgt AND c2.relname=r.relname AND c2.relkind='r') THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO _archive_%I', r.relname, r.relname);
      RAISE NOTICE 'archived % (→ % 同名)', r.relname, tgt;
    ELSE
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA %I', r.relname, tgt);
      RAISE NOTICE 'migrated % → %', r.relname, tgt;
    END IF;
  END LOOP;
END $mig$;
