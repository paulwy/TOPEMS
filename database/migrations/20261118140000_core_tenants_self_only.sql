-- 事项一：public.core_tenants 收为「仅自己」+ 平台行经系统通道（2026-11-18 草案，不申请上生产）
--
-- 拍板口径（D）：
--   1. 回填 tenant_id = id（原全局行 tenant_id IS NULL → 自指）；
--   2. 读/写策略只允许系统通道或本租户行；
--   3. 平台管理员访问目录走显式系统通道（代码已改 scope_with_system，见
--      docs/database/rls-tenant-admin-system-channel-2026-11-18.md）；
--   4. GUC 未设/空串不匹配任何行（tenant_id = NULLIF(GUC,'')::uuid 天然 fail-closed）。
--
-- 现状（2026-11-18 本地 topems_prod 只读核查）：
--   - core_tenants 1 行，tenant_id 全 NULL；RLS=on/force=on；
--   - 策略 2 条：rls_global_read(SELECT: system OR tenant_id IS NULL)、
--     rls_system_only(ALL: system)；
--   - tenant_id 无默认值、无触发器；create_tenant / onboard_tenant 的 INSERT
--     均未写 tenant_id。
--
-- 配套代码前置（不在本迁移内，上线前必须同窗口）：
--   - create_tenant（svc/unified-core/src/modules/tenant/handlers.rs:269）
--     与 onboard_tenant（:597）的 INSERT 必须显式写 tenant_id = id；
--     否则新租户 tenant_id 为 NULL，本租户自读为 0 行。
--   - 若不改 INSERT，可在独立迁移里加 BEFORE INSERT 触发器补 tenant_id；
--     本草案不选触发器，保持代码显式。
--
-- 本迁移范围：
--   - 回填 1 行 tenant_id = id；
--   - 删除 rls_global_read / rls_system_only，重建单条 rls_tenant_isolation(ALL)；
--   - 保持 ENABLE/FORCE RLS；
--   - 不新增 NOT NULL（新建租户的写入方式由配套代码决定）。
--
-- 回滚：database/rollback/20261118140000_core_tenants_self_only.rollback.sql
--   （恢复两条旧策略，tenant_id 回填为 NULL）。
--
-- 锁影响：1 行 UPDATE + 策略替换（瞬时 ACCESS EXCLUSIVE）；无长事务回填。
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言
DO $$
DECLARE
    n_rows bigint;
    n_null bigint;
    n_mismatch bigint;
BEGIN
    IF to_regclass('public.core_tenants') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：表 public.core_tenants 不存在';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'core_tenants'
           AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION '前置断言失败：public.core_tenants 缺少 tenant_id 列';
    END IF;

    SELECT count(*),
           count(*) FILTER (WHERE tenant_id IS NULL),
           count(*) FILTER (WHERE tenant_id IS NOT NULL AND tenant_id <> id)
      INTO n_rows, n_null, n_mismatch
      FROM public.core_tenants;

    IF n_mismatch > 0 THEN
        RAISE EXCEPTION '前置断言失败：已有 % 行 tenant_id 非空且不等于 id，需人工确认后再执行', n_mismatch;
    END IF;

    RAISE NOTICE '前置断言通过：core_tenants % 行，待回填 % 行，tenant_id 已自指 % 行',
        n_rows, n_null, n_rows - n_null;
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 回填：全局行改为自指
-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 core_tenants 全局行（tenant_id IS NULL）改为自指，仅填补空值行，走系统通道会话
-- destructive-owner: iam
-- destructive-ticket: TENANT-SELF-20261118
-- destructive-expires: 2027-03-31
-- destructive-max-rows: 10
-- destructive-backup: 迁移前 pg_dump -t public.core_tenants（2026-11-18 只读核查 1 行）
UPDATE public.core_tenants
   SET tenant_id = id
 WHERE tenant_id IS NULL;

-- 4. 清空既有策略（幂等）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'core_tenants'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.core_tenants', r.policyname);
        RAISE NOTICE '已删除策略 core_tenants.%', r.policyname;
    END LOOP;
END $$;

-- 5. 重建单条严格策略：系统通道 OR 本租户
ALTER TABLE public.core_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_tenants FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_tenant_isolation ON public.core_tenants
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 6. 后置断言
DO $$
DECLARE
    n_rows bigint;
    n_null bigint;
    n_mismatch bigint;
    n_pol int;
    has_isolation boolean;
    has_old boolean;
    v_qual text;
    rls boolean;
    frls boolean;
BEGIN
    SELECT count(*),
           count(*) FILTER (WHERE tenant_id IS NULL),
           count(*) FILTER (WHERE tenant_id IS NOT NULL AND tenant_id <> id)
      INTO n_rows, n_null, n_mismatch
      FROM public.core_tenants;

    IF n_null > 0 THEN
        RAISE EXCEPTION '后置断言失败：仍有 % 行 tenant_id IS NULL', n_null;
    END IF;
    IF n_mismatch > 0 THEN
        RAISE EXCEPTION '后置断言失败：% 行 tenant_id <> id', n_mismatch;
    END IF;

    SELECT count(*),
           bool_or(p.policyname = 'rls_tenant_isolation'),
           bool_or(p.policyname IN ('rls_global_read', 'rls_system_only'))
      INTO n_pol, has_isolation, has_old
      FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = 'core_tenants';

    IF n_pol <> 1 OR NOT coalesce(has_isolation, false) THEN
        RAISE EXCEPTION '后置断言失败：core_tenants 策略数 = %（期望 1：rls_tenant_isolation）', n_pol;
    END IF;
    IF coalesce(has_old, false) THEN
        RAISE EXCEPTION '后置断言失败：core_tenants 仍存在旧策略 rls_global_read/rls_system_only';
    END IF;

    SELECT p.qual::text INTO v_qual
      FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = 'core_tenants'
       AND p.policyname = 'rls_tenant_isolation';
    IF position('app.rls_system' IN coalesce(v_qual, '')) = 0
       OR position('app.tenant_id' IN coalesce(v_qual, '')) = 0
       OR position('NULLIF' IN coalesce(v_qual, '')) = 0 THEN
        RAISE EXCEPTION '后置断言失败：策略谓词不完整（需 system + GUC + NULLIF）：%', v_qual;
    END IF;
    IF position('tenant_id IS NULL' IN coalesce(v_qual, '')) > 0 THEN
        RAISE EXCEPTION '后置断言失败：策略仍含 tenant_id IS NULL fail-open 分支：%', v_qual;
    END IF;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
      FROM pg_class c WHERE c.oid = 'public.core_tenants'::regclass;
    IF NOT rls OR NOT frls THEN
        RAISE EXCEPTION '后置断言失败：core_tenants 的 rls/force_rls = %/%（期望 true/true）', rls, frls;
    END IF;

    RAISE NOTICE '后置断言通过：core_tenants = 仅自己 + 系统通道（% 行已自指）', n_rows;
END $$;
