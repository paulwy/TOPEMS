-- ============================================================
-- W7 · B4-PDM 主数据引用表：全局只读 + 系统通道写（1 张）
-- 版本：20261110204100
--
-- 依据：docs/quality/w7-b4-module-comparison-2026-11-10.md §2.5
--
-- pdm.pdm_master_data_refs 无 tenant_id 列（主数据引用是跨租户共享的元数据），
-- 收敛前是 `pdm_allow_all_pdm_master_data_refs`：ALL / PERMISSIVE / USING(true) / WITH CHECK(true)。
--
-- 目标形态：
--   1) pdm_master_data_refs_read   FOR SELECT  USING (true)
--        ——— 全局只读：任何租户都可读主数据引用（无租户归属，不构成跨租户泄漏）
--   2) pdm_master_data_refs_write  FOR ALL     USING (app.rls_system='on')
--                                              WITH CHECK (app.rls_system='on')
--        ——— 写入只允许系统通道。业务代码侧已改为 Db::scope_system()
--            （svc/pdm/src/event_handlers/mod.rs），且事件载荷缺 tenant_id 直接报错。
--
-- 为什么不是「tenant_id IS NULL 全局行」：本表没有 tenant_id，无法用租户谓词表达归属，
-- 放宽写会让任何租户上下文都能污染跨租户共享表。
--
-- 回滚（急停）：
--   DROP POLICY pdm_master_data_refs_read  ON pdm.pdm_master_data_refs;
--   DROP POLICY pdm_master_data_refs_write ON pdm.pdm_master_data_refs;
--   CREATE POLICY pdm_allow_all_pdm_master_data_refs ON pdm.pdm_master_data_refs
--       FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
-- ============================================================

SET lock_timeout = '5s';

DO $w7b4_pdm_refs$
DECLARE
    p record;
BEGIN
    IF to_regclass('pdm.pdm_master_data_refs') IS NULL THEN
        RAISE WARNING 'W7-B4-PDM 跳过 pdm.pdm_master_data_refs：表不存在';
        RETURN;
    END IF;

    FOR p IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON pdm.pdm_master_data_refs', p.policyname);
    END LOOP;

    EXECUTE 'ALTER TABLE pdm.pdm_master_data_refs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE pdm.pdm_master_data_refs FORCE ROW LEVEL SECURITY';

    CREATE POLICY pdm_master_data_refs_read ON pdm.pdm_master_data_refs
        FOR SELECT TO PUBLIC
        USING (true);

    CREATE POLICY pdm_master_data_refs_write ON pdm.pdm_master_data_refs
        FOR ALL TO PUBLIC
        USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
        WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

    RAISE NOTICE 'W7-B4-PDM：pdm_master_data_refs 已收敛（全局只读 + 系统通道写）';
END
$w7b4_pdm_refs$;

-- 结构断言
DO $w7b4_pdm_refs_assert$
DECLARE
    v_pols int;
    v_force boolean;
BEGIN
    SELECT count(*) INTO v_pols FROM pg_policies
    WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs';
    IF v_pols <> 2 THEN
        RAISE EXCEPTION 'W7-B4-PDM 断言失败：pdm_master_data_refs 策略数=%（期望 2）', v_pols;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
          AND policyname = 'pdm_master_data_refs_read' AND cmd = 'SELECT' AND qual = 'true'
    ) THEN
        RAISE EXCEPTION 'W7-B4-PDM 断言失败：pdm_master_data_refs 缺全局只读策略';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
          AND policyname = 'pdm_master_data_refs_write'
          AND coalesce(qual, '') LIKE '%app.rls_system%'
          AND coalesce(with_check, '') LIKE '%app.rls_system%'
    ) THEN
        RAISE EXCEPTION 'W7-B4-PDM 断言失败：pdm_master_data_refs 写策略未绑系统通道';
    END IF;
    SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_force
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pdm' AND c.relname = 'pdm_master_data_refs';
    IF NOT coalesce(v_force, false) THEN
        RAISE EXCEPTION 'W7-B4-PDM 断言失败：pdm_master_data_refs 未 ENABLE/FORCE';
    END IF;
    RAISE NOTICE 'W7-B4-PDM 断言通过：pdm_master_data_refs（2 条策略，全局只读 + 系统通道写）';
END
$w7b4_pdm_refs_assert$;

-- schema_defense_ledger 明确不在本次 RLS 范围内（启动指纹表，无租户上下文）
DO $w7b4_pdm_ledger_assert$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'pdm' AND c.relname = 'schema_defense_ledger'
          AND (c.relrowsecurity OR c.relforcerowsecurity)
    ) THEN
        RAISE EXCEPTION 'W7-B4-PDM 断言失败：pdm.schema_defense_ledger 不得开启 RLS';
    END IF;
END
$w7b4_pdm_ledger_assert$;
