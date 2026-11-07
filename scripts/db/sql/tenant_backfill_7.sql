-- 窗口第二段：回填 317 行（crm.rfm_results 300 + public.audit_logs 17）
-- 用法：psql "$DSN" -X -v ON_ERROR_STOP=1 -f scripts/db/sql/tenant_backfill_7.sql
--
-- 约束：
--   * 只回填“可由父记录 tenant_id 归因”的行；孤儿保持 NULL/0，绝不兜底到 …0001。
--   * 影响行数现场计算，不写死 300/17；命中 0 行直接中止（说明判据或数据已变）。
--   * 非目标行（tenant_id 已是其它租户）数量必须前后一致。

\set ON_ERROR_STOP on

-- ============ 2.1 public.audit_logs ============
BEGIN;
SET LOCAL app.rls_system = 'on';

DO $$
DECLARE
  n_pre bigint;
  n_upd bigint;
  n_left bigint;
  n_other_before bigint;
  n_other_after bigint;
BEGIN
  SELECT count(*) INTO n_pre
    FROM public.audit_logs a
    JOIN pm.projects p ON p.id = a.entity_id
   WHERE a.entity_type = 'project'
     AND (a.tenant_id IS NULL OR a.tenant_id = '00000000-0000-0000-0000-000000000000')
     AND p.tenant_id IS NOT NULL
     AND p.tenant_id <> '00000000-0000-0000-0000-000000000000';

  SELECT count(*) INTO n_other_before
    FROM public.audit_logs
   WHERE NOT (tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000');

  IF n_pre = 0 THEN
    RAISE EXCEPTION 'audit 可归因 0 行，拒绝继续（检查 pm.projects 关联与 entity_type）';
  END IF;

  UPDATE public.audit_logs a
     SET tenant_id = p.tenant_id
    FROM pm.projects p
   WHERE p.id = a.entity_id
     AND a.entity_type = 'project'
     AND (a.tenant_id IS NULL OR a.tenant_id = '00000000-0000-0000-0000-000000000000')
     AND p.tenant_id IS NOT NULL
     AND p.tenant_id <> '00000000-0000-0000-0000-000000000000';
  GET DIAGNOSTICS n_upd = ROW_COUNT;

  IF n_upd <> n_pre THEN
    RAISE EXCEPTION 'audit 回填行数不一致：预统计 %，实际 UPDATE %', n_pre, n_upd;
  END IF;

  SELECT count(*) INTO n_left
    FROM public.audit_logs a
    JOIN pm.projects p ON p.id = a.entity_id
   WHERE a.entity_type = 'project'
     AND (a.tenant_id IS NULL OR a.tenant_id = '00000000-0000-0000-0000-000000000000')
     AND p.tenant_id IS NOT NULL
     AND p.tenant_id <> '00000000-0000-0000-0000-000000000000';
  IF n_left <> 0 THEN
    RAISE EXCEPTION 'audit 回填后仍有 % 行可归因未更新', n_left;
  END IF;

  SELECT count(*) INTO n_other_after
    FROM public.audit_logs
   WHERE NOT (tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000');
  IF n_other_after <> n_other_before + n_upd THEN
    RAISE EXCEPTION 'audit 非目标租户行数被误改：before=% after=% updated=%',
                    n_other_before, n_other_after, n_upd;
  END IF;

  RAISE NOTICE 'BACKFILL|audit|%|%', n_pre, n_upd;
END $$;

COMMIT;

-- ============ 2.2 crm.rfm_results ============
BEGIN;
SET LOCAL app.rls_system = 'on';

DO $$
DECLARE
  n_pre bigint;
  n_upd bigint;
  n_left bigint;
  n_other_before bigint;
  n_other_after bigint;
BEGIN
  SELECT count(*) INTO n_pre
    FROM crm.rfm_results r
    JOIN crm.customers c ON c.id = r.customer_id
   WHERE (r.tenant_id IS NULL OR r.tenant_id = '00000000-0000-0000-0000-000000000000')
     AND c.tenant_id IS NOT NULL
     AND c.tenant_id <> '00000000-0000-0000-0000-000000000000';

  SELECT count(*) INTO n_other_before
    FROM crm.rfm_results
   WHERE NOT (tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000');

  IF n_pre = 0 THEN
    RAISE EXCEPTION 'rfm 可归因 0 行，拒绝继续（检查 crm.customers 租户）';
  END IF;

  UPDATE crm.rfm_results r
     SET tenant_id = c.tenant_id
    FROM crm.customers c
   WHERE c.id = r.customer_id
     AND (r.tenant_id IS NULL OR r.tenant_id = '00000000-0000-0000-0000-000000000000')
     AND c.tenant_id IS NOT NULL
     AND c.tenant_id <> '00000000-0000-0000-0000-000000000000';
  GET DIAGNOSTICS n_upd = ROW_COUNT;

  IF n_upd <> n_pre THEN
    RAISE EXCEPTION 'rfm 回填行数不一致：预统计 %，实际 UPDATE %', n_pre, n_upd;
  END IF;

  SELECT count(*) INTO n_left
    FROM crm.rfm_results r
    JOIN crm.customers c ON c.id = r.customer_id
   WHERE (r.tenant_id IS NULL OR r.tenant_id = '00000000-0000-0000-0000-000000000000')
     AND c.tenant_id IS NOT NULL
     AND c.tenant_id <> '00000000-0000-0000-0000-000000000000';
  IF n_left <> 0 THEN
    RAISE EXCEPTION 'rfm 回填后仍有 % 行可归因未更新', n_left;
  END IF;

  SELECT count(*) INTO n_other_after
    FROM crm.rfm_results
   WHERE NOT (tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000');
  IF n_other_after <> n_other_before + n_upd THEN
    RAISE EXCEPTION 'rfm 非目标租户行数被误改：before=% after=% updated=%',
                    n_other_before, n_other_after, n_upd;
  END IF;

  RAISE NOTICE 'BACKFILL|rfm|%|%', n_pre, n_upd;
END $$;

COMMIT;

-- 回填后分布（写入执行记录）
SELECT 'BACKFILL|rfm_tenant|' || COALESCE(tenant_id::text, '<null>') || '|' || count(*)
  FROM crm.rfm_results GROUP BY tenant_id ORDER BY tenant_id NULLS FIRST;
SELECT 'BACKFILL|audit_tenant|' || COALESCE(tenant_id::text, '<null>') || '|' || count(*)
  FROM public.audit_logs GROUP BY tenant_id ORDER BY tenant_id NULLS FIRST;
