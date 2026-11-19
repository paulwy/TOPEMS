-- 回滚 20261119151000_mobile_oa_announcement_reads_tenant_rls
-- 恢复迁移前原状：删除严格策略与索引、取消 NOT NULL、删除 tenant_id 列，
-- 重建 mobile_allow_all_oa_announcement_reads（ALL USING(true) WITH CHECK(true)）。
-- RLS/FORCE 在迁移前即已开启，回滚保持开启。
-- 注意：回滚会丢弃 tenant_id 列内已回填的数据（列本身为本次新增）。

DO $$
DECLARE r record;
BEGIN
    IF to_regclass('mobile.oa_announcement_reads') IS NULL THEN
        RAISE NOTICE '回滚跳过：mobile.oa_announcement_reads 不存在';
        RETURN;
    END IF;

    FOR r IN
        SELECT policyname FROM pg_policies
         WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads'
    LOOP
        EXECUTE format('DROP POLICY %I ON mobile.oa_announcement_reads', r.policyname);
        RAISE NOTICE '已删除策略 mobile.oa_announcement_reads.%', r.policyname;
    END LOOP;
END $$;

DROP INDEX IF EXISTS mobile.idx_oa_announcement_reads_tenant_user;

ALTER TABLE mobile.oa_announcement_reads ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE mobile.oa_announcement_reads DROP COLUMN tenant_id;

CREATE POLICY mobile_allow_all_oa_announcement_reads ON mobile.oa_announcement_reads
    FOR ALL TO PUBLIC
    USING (true)
    WITH CHECK (true);

DO $$
DECLARE
    n_pol int;
    v_rls boolean;
    v_force boolean;
BEGIN
    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '回滚断言失败：策略数应为 1，实际 %', n_pol;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'mobile' AND tablename = 'oa_announcement_reads'
          AND policyname = 'mobile_allow_all_oa_announcement_reads'
          AND cmd = 'ALL' AND qual = 'true' AND with_check = 'true'
    ) THEN
        RAISE EXCEPTION '回滚断言失败：mobile_allow_all_oa_announcement_reads 未恢复';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'mobile' AND table_name = 'oa_announcement_reads'
          AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION '回滚断言失败：tenant_id 列仍存在';
    END IF;

    SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_force
    FROM pg_class WHERE oid = 'mobile.oa_announcement_reads'::regclass;
    IF NOT v_rls OR NOT v_force THEN
        RAISE EXCEPTION '回滚断言失败：RLS/FORCE 未保持开启（rls=%, force=%）', v_rls, v_force;
    END IF;

    RAISE NOTICE '回滚完成：mobile.oa_announcement_reads 已恢复无 tenant_id、allow_all 策略原状';
END $$;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261119151000;
