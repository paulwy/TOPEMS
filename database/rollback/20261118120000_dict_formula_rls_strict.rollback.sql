-- 回滚：20261118120000_dict_formula_rls_strict.sql
-- erp.dict_types / erp.dict_items 还原唯一 allow_all；rs.formulas 还原 allow_all + 严格策略两条基线。
-- 删除本批新增的 tenant_id 索引；RLS / FORCE 保持开启（与基线一致）。

BEGIN;

DROP INDEX IF EXISTS erp.idx_dict_types_tenant_id;
DROP INDEX IF EXISTS erp.idx_dict_items_tenant_id;
DROP INDEX IF EXISTS rs.idx_formulas_tenant_id;

DO $$
DECLARE
    t text;
    r record;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'erp.dict_types',
        'erp.dict_items',
        'rs.formulas'
    ]
    LOOP
        FOR r IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = split_part(t, '.', 1)
              AND tablename = split_part(t, '.', 2)
        LOOP
            EXECUTE format('DROP POLICY %I ON %s', r.policyname, t);
        END LOOP;

        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- erp：还原原 allow_all 策略名
CREATE POLICY erp_allow_all_dict_types ON erp.dict_types
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY erp_allow_all_dict_items ON erp.dict_items
    FOR ALL USING (true) WITH CHECK (true);

-- rs：基线为 allow_all + 严格策略并存（permissive OR，allow_all 生效）
CREATE POLICY rs_allow_all_formulas ON rs.formulas
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY rls_tenant_isolation ON rs.formulas
    FOR ALL
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 回滚后置断言
DO $$
BEGIN
    IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'erp' AND tablename = 'dict_types') <> 1
       OR (SELECT count(*) FROM pg_policies WHERE schemaname = 'erp' AND tablename = 'dict_items') <> 1
       OR (SELECT count(*) FROM pg_policies WHERE schemaname = 'rs' AND tablename = 'formulas') <> 2 THEN
        RAISE EXCEPTION '回滚断言失败：策略数未还原到基线';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'erp' AND tablename IN ('dict_types', 'dict_items')
          AND (qual IS DISTINCT FROM 'true' OR with_check IS DISTINCT FROM 'true')
    ) THEN
        RAISE EXCEPTION '回滚断言失败：erp allow_all 定义不符';
    END IF;

    IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = to_regclass('erp.dict_types'))
       OR NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = to_regclass('erp.dict_items'))
       OR NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = to_regclass('rs.formulas')) THEN
        RAISE EXCEPTION '回滚断言失败：RLS / FORCE 未保持开启';
    END IF;
END $$;

COMMIT;
