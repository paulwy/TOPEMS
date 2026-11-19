-- 回滚 20261119150000_pdm_master_data_refs_rls_strict_forward
-- 恢复迁移前原状：删除 rls_tenant_isolation，重建两条原策略：
--   1) pdm_master_data_refs_read   SELECT USING (true)
--   2) pdm_master_data_refs_write  ALL    USING/WITH CHECK (app.rls_system='on')
-- RLS/FORCE 在迁移前即已开启，回滚保持开启，不回退到 DISABLE。

DO $$
DECLARE r record;
BEGIN
    IF to_regclass('pdm.pdm_master_data_refs') IS NULL THEN
        RAISE NOTICE '回滚跳过：pdm.pdm_master_data_refs 不存在';
        RETURN;
    END IF;

    FOR r IN
        SELECT policyname FROM pg_policies
         WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
    LOOP
        EXECUTE format('DROP POLICY %I ON pdm.pdm_master_data_refs', r.policyname);
        RAISE NOTICE '已删除策略 pdm.pdm_master_data_refs.%', r.policyname;
    END LOOP;
END $$;

CREATE POLICY pdm_master_data_refs_read ON pdm.pdm_master_data_refs
    FOR SELECT TO PUBLIC
    USING (true);

CREATE POLICY pdm_master_data_refs_write ON pdm.pdm_master_data_refs
    FOR ALL TO PUBLIC
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

DO $$
DECLARE
    n_pol int;
    v_rls boolean;
    v_force boolean;
BEGIN
    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs';
    IF n_pol <> 2 THEN
        RAISE EXCEPTION '回滚断言失败：策略数应为 2，实际 %', n_pol;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
          AND policyname = 'pdm_master_data_refs_read'
          AND cmd = 'SELECT' AND qual = 'true'
    ) THEN
        RAISE EXCEPTION '回滚断言失败：pdm_master_data_refs_read(SELECT USING true) 未恢复';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
          AND policyname = 'pdm_master_data_refs_write'
          AND cmd = 'ALL' AND qual LIKE '%app.rls_system%'
    ) THEN
        RAISE EXCEPTION '回滚断言失败：pdm_master_data_refs_write(系统通道) 未恢复';
    END IF;

    SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_force
    FROM pg_class WHERE oid = 'pdm.pdm_master_data_refs'::regclass;
    IF NOT v_rls OR NOT v_force THEN
        RAISE EXCEPTION '回滚断言失败：RLS/FORCE 未保持开启（rls=%, force=%）', v_rls, v_force;
    END IF;

    RAISE NOTICE '回滚完成：pdm.pdm_master_data_refs 已恢复 read(true) + write(系统通道) 原状';
END $$;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261119150000;
