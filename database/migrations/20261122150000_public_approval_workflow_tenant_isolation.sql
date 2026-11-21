-- ============================================================
-- 20261122150000_public_approval_workflow_tenant_isolation.sql
--
-- 背景（2026-11-22 只读核实 topems_prod / topems_gate）：
--   public.approvals / approval_records / core_workflow_instances / core_workflow_tasks
--   四张表都已存在可空 tenant_id uuid，且都已 ENABLE + FORCE RLS、
--   各 1 条 rls_tenant_isolation（系统通道 OR 租户）。
--   实际缺口只有两处：
--     1. 四张表都没有 tenant_id 索引（租户谓词无索引可用）；
--     2. approvals / approval_records 的策略只有 USING，没有显式 WITH CHECK，
--        与仓库严格 B 范式（USING + WITH CHECK 全显式）不一致；
--        全新迁移链上（20260923160000 前置）它们仍是「nil/空串/全零/NULL 放行」的宽松模板。
--
-- 数据事实：
--   - 四张表生产与锚点库均 0 行（pg_stat_user_tables.n_tup_ins = 0），无需回填；
--   - 四张表没有任何外键；归属只能按值连接推导：
--       P1 approvals.workflow_instance_id -> core_workflow_instances.id -> tenant_id
--       P2 approval_records.approval_id   -> approvals.id               -> tenant_id
--       P3 core_workflow_instances.workflow_id -> core_workflows.id      -> tenant_id
--       P4 core_workflow_tasks.instance_id -> core_workflow_instances.id -> tenant_id
--   - 不采用「发起人/审批人/操作人 -> 用户所属租户」：iam.users 无 tenant_id，
--     iam.core_tenant_users 是多对多，无法推出唯一归属。
--   - 回填只写能按 P1-P4 推出且上游非 NULL 的行；推不出的保持 NULL，
--     由策略 fail-closed 挡住，不写哨兵、不猜测。
--
-- 代码事实：
--   - approvals / approval_records 仓库内无写入路径，只在流程实例列表的 EXISTS 子查询里只读；
--   - core_workflow_instances / core_workflow_tasks 的写入点显式绑定 tenant_id
--     （svc/unified-core/src/modules/flow/approval.rs:1289-1330、instance.rs:343）。
--   因此本迁移不新增业务写入约束，也不会因开隔离打断现网写入。
--
-- 变更内容：
--   1. 逐表 ADD COLUMN IF NOT EXISTS tenant_id uuid（幂等；生产已存在则 no-op），
--      并确保 ENABLE + FORCE ROW LEVEL SECURITY。
--   2. 按 P1-P4 回填 NULL 行（仅当上游 tenant_id 非 NULL）。
--   3. 四张表各建 tenant_id 索引（idx_<table>_tenant_id）。
--   4. 前置断言每表恰好 1 条策略（多策略直接报错，不静默丢策略），
--      删除后以严格 B 范式重建：FOR ALL TO public，USING + WITH CHECK 全显式。
--   5. 后置断言：列、索引、策略名/命令/roles/表达式逐字匹配，RLS 与 FORCE 均为 true；
--      tenant_id IS NULL 行数只 NOTICE 记录，不阻断（本波 0 行）。
--
-- 幂等性：ADD COLUMN / CREATE INDEX IF NOT EXISTS；策略 DROP + CREATE 可重复执行。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- 回滚：database/rollback/20261122150000_public_approval_workflow_tenant_isolation.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- FORCE RLS 下 owner 同样受策略约束；回填与断言需要全量可见。
SELECT set_config('app.rls_system', 'on', false);

-- ------------------------------------------------------------
-- 1. 补列守卫 + 确保 ENABLE/FORCE RLS
-- ------------------------------------------------------------
DO $cols$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'approvals', 'approval_records',
        'core_workflow_instances', 'core_workflow_tasks'
    ] LOOP
        IF to_regclass('public.' || t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：public.% 不存在', t;
        END IF;
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END
$cols$;

-- ------------------------------------------------------------
-- 2. 按可靠路径回填（推不出的保持 NULL）
-- ------------------------------------------------------------
UPDATE public.approvals a
   SET tenant_id = i.tenant_id
  FROM public.core_workflow_instances i
 WHERE a.tenant_id IS NULL
   AND a.workflow_instance_id = i.id
   AND i.tenant_id IS NOT NULL;

UPDATE public.approval_records ar
   SET tenant_id = a.tenant_id
  FROM public.approvals a
 WHERE ar.tenant_id IS NULL
   AND ar.approval_id = a.id
   AND a.tenant_id IS NOT NULL;

UPDATE public.core_workflow_instances i
   SET tenant_id = w.tenant_id
  FROM public.core_workflows w
 WHERE i.tenant_id IS NULL
   AND i.workflow_id = w.id
   AND w.tenant_id IS NOT NULL;

UPDATE public.core_workflow_tasks t
   SET tenant_id = i.tenant_id
  FROM public.core_workflow_instances i
 WHERE t.tenant_id IS NULL
   AND t.instance_id = i.id
   AND i.tenant_id IS NOT NULL;

-- ------------------------------------------------------------
-- 3. 租户索引
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_approvals_tenant_id
    ON public.approvals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_tenant_id
    ON public.approval_records (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_workflow_instances_tenant_id
    ON public.core_workflow_instances (tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_workflow_tasks_tenant_id
    ON public.core_workflow_tasks (tenant_id);

-- ------------------------------------------------------------
-- 4. 策略归一：前置恰好 1 条 -> 删除 -> 严格 B 范式重建
-- ------------------------------------------------------------
DO $policies$
DECLARE
    t text;
    n int;
    v_using constant text :=
        '((COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid))';
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'approvals', 'approval_records',
        'core_workflow_instances', 'core_workflow_tasks'
    ] LOOP
        SELECT count(*) INTO n
          FROM pg_policies
         WHERE schemaname = 'public' AND tablename = t;
        IF n <> 1 THEN
            RAISE EXCEPTION '前置断言失败：public.% 期望恰好 1 条策略，实测 % 条', t, n;
        END IF;

        EXECUTE format('DROP POLICY IF EXISTS rls_tenant_isolation ON public.%I', t);
        EXECUTE format(
            'CREATE POLICY rls_tenant_isolation ON public.%I FOR ALL TO public USING (%s) WITH CHECK (%s)',
            t, v_using, v_using
        );
    END LOOP;
END
$policies$;

-- ------------------------------------------------------------
-- 5. 后置断言
-- ------------------------------------------------------------
DO $verify$
DECLARE
    t text;
    n int;
    v_null bigint;
    v_using text;
    v_check text;
    v_cmd text;
    v_permissive text;
    v_roles name[];
    v_rls boolean;
    v_frls boolean;
    v_using_expected constant text :=
        '((COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid))';
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'approvals', 'approval_records',
        'core_workflow_instances', 'core_workflow_tasks'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
        ) THEN
            RAISE EXCEPTION '后置断言失败：public.% 缺 tenant_id 列', t;
        END IF;

        IF to_regclass('public.idx_' || t || '_tenant_id') IS NULL THEN
            RAISE EXCEPTION '后置断言失败：public.% 缺 tenant_id 索引', t;
        END IF;

        SELECT count(*) INTO n FROM pg_policies
         WHERE schemaname = 'public' AND tablename = t;
        IF n <> 1 THEN
            RAISE EXCEPTION '后置断言失败：public.% 期望 1 条策略，实测 % 条', t, n;
        END IF;

        SELECT cmd, permissive, roles, qual, with_check
          INTO v_cmd, v_permissive, v_roles, v_using, v_check
          FROM pg_policies
         WHERE schemaname = 'public' AND tablename = t
           AND policyname = 'rls_tenant_isolation';

        IF v_cmd IS DISTINCT FROM 'ALL'
           OR v_permissive IS DISTINCT FROM 'PERMISSIVE'
           OR v_roles IS DISTINCT FROM ARRAY['public']::name[]
           OR v_using IS DISTINCT FROM v_using_expected
           OR v_check IS DISTINCT FROM v_using_expected THEN
            RAISE EXCEPTION '后置断言失败：public.% 策略形状不符（cmd=%, permissive=%, roles=%, using=%, check=%）',
                t, v_cmd, v_permissive, v_roles, v_using, v_check;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity
          INTO v_rls, v_frls
          FROM pg_class c
         WHERE c.oid = ('public.' || t)::regclass;
        IF NOT v_rls OR NOT v_frls THEN
            RAISE EXCEPTION '后置断言失败：public.% ENABLE/FORCE RLS 未同时开启', t;
        END IF;

        EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', t) INTO v_null;
        IF v_null > 0 THEN
            RAISE NOTICE 'public.% 仍有 % 行 tenant_id 为 NULL（策略 fail-closed，需业务确认回填口径）', t, v_null;
        END IF;
    END LOOP;
    RAISE NOTICE 'public 审批/流程 4 表租户隔离归一完成（0 NULL 行为预期）';
END
$verify$;
