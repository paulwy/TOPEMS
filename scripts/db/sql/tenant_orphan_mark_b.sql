-- 窗口第三段（收尾）：B 组 audit 孤儿零 DDL 标记
-- 用法：psql "$DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/tenant_orphan_mark_b.sql
--
-- 已定口径：不删、不归档、不加列；复用 request_details(JSONB) 合并键
--   {"_orphan":"b72-20261106"}
-- 标记前必须已有 public.audit_logs 的 pg_dump + CSV 备份（窗口总表第一段）。
-- 回滚：request_details - '_orphan'（只减键，不触碰原有键）。

\set ON_ERROR_STOP on

BEGIN;
SET LOCAL app.rls_system = 'on';

DO $$
DECLARE
  n_target bigint;
  n_updated bigint;
  n_marked bigint;
BEGIN
  SELECT count(*) INTO n_target
    FROM public.audit_logs a
   WHERE (a.tenant_id = '00000000-0000-0000-0000-000000000000' OR a.tenant_id IS NULL)
     AND a.entity_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000099'
     AND NOT (a.entity_type = 'project' AND a.entity_id IS NOT NULL
              AND EXISTS (SELECT 1 FROM pm.projects p
                          WHERE p.id = a.entity_id
                            AND p.tenant_id IS NOT NULL
                            AND p.tenant_id <> '00000000-0000-0000-0000-000000000000'))
     AND NOT (a.request_details ? '_orphan');

  IF n_target = 0 THEN
    RAISE NOTICE 'ORPHAN|audit|target=0（已标记或无目标，幂等跳过）';
    RETURN;
  END IF;

  UPDATE public.audit_logs a
     SET request_details = COALESCE(a.request_details, '{}'::jsonb)
                           || '{"_orphan":"b72-20261106"}'::jsonb
   WHERE (a.tenant_id = '00000000-0000-0000-0000-000000000000' OR a.tenant_id IS NULL)
     AND a.entity_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000099'
     AND NOT (a.entity_type = 'project' AND a.entity_id IS NOT NULL
              AND EXISTS (SELECT 1 FROM pm.projects p
                          WHERE p.id = a.entity_id
                            AND p.tenant_id IS NOT NULL
                            AND p.tenant_id <> '00000000-0000-0000-0000-000000000000'))
     AND NOT (a.request_details ? '_orphan');
  GET DIAGNOSTICS n_updated = ROW_COUNT;

  IF n_updated <> n_target THEN
    RAISE EXCEPTION 'B 组标记行数不一致：预统计 %，实际 UPDATE %', n_target, n_updated;
  END IF;

  SELECT count(*) INTO n_marked FROM public.audit_logs
   WHERE request_details ? '_orphan';
  IF n_marked < n_updated THEN
    RAISE EXCEPTION 'B 组标记后总数异常：marked=% updated=%', n_marked, n_updated;
  END IF;

  RAISE NOTICE 'ORPHAN|audit|target=%|updated=%|marked_total=%',
               n_target, n_updated, n_marked;
END $$;

COMMIT;

SELECT 'ORPHAN|audit_marked|' || count(*) FROM public.audit_logs
 WHERE request_details ? '_orphan';
SELECT 'ORPHAN|audit_tenant|' || COALESCE(tenant_id::text, '<null>') || '|' || count(*)
  FROM public.audit_logs GROUP BY tenant_id ORDER BY tenant_id NULLS FIRST;
