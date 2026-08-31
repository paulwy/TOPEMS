-- 2026-08-31 P1-2 阶段0 后续：core_* 业务域空表归位到各自业务 schema
-- 背景：public 中 core_* 前缀业务表（多为空表）历史遗留 public；按其业务域前缀归位至对应 schema
--      （erp/crm/hrm/wms/scm/pm/pdm 等），保留 core_ 前缀命名（与 schema 内裸名表并存，不合并，后续单独清理）。
--      search_path 均含对应 schema 或显式前缀，无前缀代码引用可解析。
-- 幂等：仅在表仍位于 public 时 SET SCHEMA（目标 schema 无同名 core_* 才迁移，否则归档）。
DO $mig$
DECLARE r record; tgt text;
BEGIN
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'core\_%' ESCAPE '\'
      AND c.relname NOT LIKE 'core\_finance\_%' ESCAPE '\'
      AND c.relname NOT LIKE 'core\_master\_data\_%' ESCAPE '\'
      AND c.relname NOT LIKE 'core\_mdm\_%' ESCAPE '\'
    ORDER BY 1
  LOOP
    -- 业务域 → schema 映射（仅明确的域；平台级/无 schema 域保留 public 由后续人工决定）
    IF r.relname LIKE 'core\_erp\_%' ESCAPE '\' THEN tgt := 'erp';
    ELSIF r.relname LIKE 'core\_crm\_%' ESCAPE '\' THEN tgt := 'crm';
    ELSIF r.relname LIKE 'core\_hrm\_%' ESCAPE '\' THEN tgt := 'hrm';
    ELSIF r.relname LIKE 'core\_wms\_%' ESCAPE '\' THEN tgt := 'wms';
    ELSIF r.relname LIKE 'core\_scm\_%' ESCAPE '\' THEN tgt := 'scm';
    ELSIF r.relname LIKE 'core\_pm\_%' ESCAPE '\' THEN tgt := 'pm';
    ELSIF r.relname LIKE 'core\_pdm\_%' ESCAPE '\' THEN tgt := 'pdm';
    ELSIF r.relname LIKE 'core\_doc\_%' ESCAPE '\' THEN tgt := 'doc_service';
    ELSIF r.relname LIKE 'core\_chat\_%' ESCAPE '\' THEN tgt := 'im';
    ELSIF r.relname LIKE 'core\_workflow\_%' ESCAPE '\' THEN tgt := 'flow';
    ELSE CONTINUE; END IF;

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
