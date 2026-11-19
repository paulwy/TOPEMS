-- P2 · mobile.oa_announcement_reads 补租户列 + 严格 B（USING(true) 定性 2026-11-19）
--
-- 背景：docs/database/rls-using-true-triage-2026-11-19.md §3 P2。
--   迁移前：仅 announcement_id/user_id/created_at，PK (announcement_id, user_id)；
--   策略 mobile_allow_all_oa_announcement_reads（ALL USING(true) WITH CHECK(true)），RLS+FORCE 已开启。
--   写入口 svc/mobile/src/modules/oa.rs:mark_announcement_read（普通租户连接、请求级 RLS 事务）。
--
-- 变更内容：
--   1) ADD COLUMN tenant_id uuid；
--   2) 回填：优先取关联公告 mobile.oa_announcements.tenant_id；剩余再按 user_id 从 public.core_users 推；
--   3) 断言 0 行 NULL → SET NOT NULL（不放宽）；
--   4) 动态清空既有策略 → 保持 ENABLE + FORCE → rls_tenant_isolation（ALL，严格 B，
--      表达式逐字取自 database/migrations/20261119140000_iam_core_tenant_plugins_rls_strict_forward.sql）；
--   5) CREATE INDEX idx_oa_announcement_reads_tenant_user (tenant_id, user_id)。
-- 幂等性：ADD COLUMN 前断言列不存在；策略先动态 DROP 再 CREATE；索引 IF NOT EXISTS。
-- 回滚：database/rollback/20261119151000_mobile_oa_announcement_reads_tenant_rls.rollback.sql
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

SET lock_timeout = '5s';

-- 1. 前置断言与读数
DO $$
DECLARE
    n_rows bigint;
    n_pol int;
    v_rls boolean;
    v_force boolean;
BEGIN
    IF to_regclass('mobile.oa_announcement_reads') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：mobile.oa_announcement_reads 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'mobile' AND table_name = 'oa_announcement_reads'
          AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION '前置断言失败：mobile.oa_announcement_reads.tenant_id 已存在，禁止重复补列';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'mobile.oa_announcement_reads'::regclass
          AND c.contype = 'p'
          AND (
              SELECT count(*)
              FROM unnest(c.conkey) AS k(attnum)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
              WHERE a.attname IN ('announcement_id', 'user_id')
          ) = 2
    ) THEN
        RAISE EXCEPTION '前置断言失败：主键 (announcement_id, user_id) 缺失';
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads';
    IF n_pol <> 1 OR NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads'
          AND policyname = 'mobile_allow_all_oa_announcement_reads'
          AND cmd = 'ALL' AND qual = 'true' AND with_check = 'true'
    ) THEN
        RAISE EXCEPTION '前置断言失败：预期唯一策略 mobile_allow_all_oa_announcement_reads(ALL true)，实际 % 条', n_pol;
    END IF;

    SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_force
    FROM pg_class WHERE oid = 'mobile.oa_announcement_reads'::regclass;
    IF NOT v_rls OR NOT v_force THEN
        RAISE EXCEPTION '前置断言失败：RLS/FORCE 未同时开启（rls=%, force=%）', v_rls, v_force;
    END IF;

    SELECT count(*) INTO n_rows FROM mobile.oa_announcement_reads;
    RAISE NOTICE '前置读数：mobile.oa_announcement_reads = % 行，无 tenant_id 列，既有策略 allow_all', n_rows;
END $$;

-- 2. 补列与回填
ALTER TABLE mobile.oa_announcement_reads ADD COLUMN tenant_id uuid;

-- 2.1 租户来源优先：关联公告的 tenant_id
UPDATE mobile.oa_announcement_reads r
   SET tenant_id = a.tenant_id
  FROM mobile.oa_announcements a
 WHERE a.id = r.announcement_id
   AND r.tenant_id IS NULL;

-- 2.2 兜底：从用户主体推（仅处理上一步仍未命中的行）
UPDATE mobile.oa_announcement_reads r
   SET tenant_id = u.tenant_id
  FROM public.core_users u
 WHERE u.id::text = r.user_id
   AND r.tenant_id IS NULL;

-- 3. 回填断言（不允许放宽）
DO $$
DECLARE
    n_nulls bigint;
    n_total bigint;
BEGIN
    SELECT count(*) INTO n_nulls FROM mobile.oa_announcement_reads WHERE tenant_id IS NULL;
    SELECT count(*) INTO n_total FROM mobile.oa_announcement_reads;
    IF n_nulls > 0 THEN
        RAISE EXCEPTION '回填断言失败：仍有 % / % 行 tenant_id 为空，需人工定性来源', n_nulls, n_total;
    END IF;
    RAISE NOTICE '回填完成：% 行全部写入 tenant_id', n_total;
END $$;

ALTER TABLE mobile.oa_announcement_reads ALTER COLUMN tenant_id SET NOT NULL;

-- 4. 策略收紧（保持 ENABLE + FORCE）
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
         WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads'
    LOOP
        EXECUTE format('DROP POLICY %I ON mobile.oa_announcement_reads', r.policyname);
        RAISE NOTICE '已删除策略 mobile.oa_announcement_reads.%', r.policyname;
    END LOOP;
END $$;

ALTER TABLE mobile.oa_announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_announcement_reads FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_tenant_isolation ON mobile.oa_announcement_reads
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

CREATE INDEX IF NOT EXISTS idx_oa_announcement_reads_tenant_user
    ON mobile.oa_announcement_reads (tenant_id, user_id);

-- 5. 后置断言
DO $$
DECLARE
    v_nullable text;
    n_pol int;
    v_qual text;
    v_check text;
    v_rls boolean;
    v_force boolean;
BEGIN
    SELECT is_nullable INTO v_nullable
    FROM information_schema.columns
    WHERE table_schema = 'mobile' AND table_name = 'oa_announcement_reads'
      AND column_name = 'tenant_id';
    IF v_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION '后置断言失败：tenant_id 不是 NOT NULL（当前 %）', v_nullable;
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '后置断言失败：策略数应为 1，实际 %', n_pol;
    END IF;

    SELECT qual, with_check INTO v_qual, v_check
    FROM pg_policies
    WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads'
      AND policyname = 'rls_tenant_isolation';
    IF v_qual IS NULL OR v_qual NOT LIKE '%app.rls_system%' OR v_qual NOT LIKE '%app.tenant_id%' THEN
        RAISE EXCEPTION '后置断言失败：USING 定义不符合严格 B 范式：%', v_qual;
    END IF;
    IF v_check IS NULL OR v_check NOT LIKE '%app.rls_system%' OR v_check NOT LIKE '%app.tenant_id%' THEN
        RAISE EXCEPTION '后置断言失败：WITH CHECK 定义不符合严格 B 范式：%', v_check;
    END IF;

    SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_force
    FROM pg_class WHERE oid = 'mobile.oa_announcement_reads'::regclass;
    IF NOT v_rls OR NOT v_force THEN
        RAISE EXCEPTION '后置断言失败：RLS/FORCE 未同时开启（rls=%, force=%）', v_rls, v_force;
    END IF;

    IF to_regclass('mobile.idx_oa_announcement_reads_tenant_user') IS NULL THEN
        RAISE EXCEPTION '后置断言失败：idx_oa_announcement_reads_tenant_user 缺失';
    END IF;

    RAISE NOTICE '后置断言通过：mobile.oa_announcement_reads 严格 B（1 策略，RLS+FORCE，tenant_user 索引）';
END $$;
