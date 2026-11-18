-- 回滚 20261118112000_gis_map_layers_allow_all_strict
-- 恢复 gis 4 张表原状：删除严格策略与 tenant_id 索引，重建原 allow_all 策略。
-- RLS / FORCE 保持在开（迁移前即为开），其余对象不动。

BEGIN;

DO $$
DECLARE
    r record;
    t text;
    orig record;
BEGIN
    -- 1. 删除本批引入的 tenant_id 索引
    DROP INDEX IF EXISTS gis.idx_gis_geodata_tenant_id;
    DROP INDEX IF EXISTS gis.idx_gis_geofeatures_tenant_id;
    DROP INDEX IF EXISTS gis.idx_gis_map_layers_tenant_id;
    DROP INDEX IF EXISTS gis.idx_gis_spatial_analysis_tenant_id;

    -- 2. 清空目标表全部策略（幂等）
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'gis'
           AND p.tablename IN ('geodata', 'geofeatures', 'map_layers', 'spatial_analysis')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;

    -- 3. 重建原 allow_all 策略（名称与迁移前一致）
    FOR orig IN
        SELECT * FROM (VALUES
            ('gis', 'geodata', 'gis_allow_all_geodata'),
            ('gis', 'geofeatures', 'gis_allow_all_geofeatures'),
            ('gis', 'map_layers', 'gis_allow_all_map_layers'),
            ('gis', 'spatial_analysis', 'gis_allow_all_spatial_analysis')
        ) AS v(sch, tbl, pol)
    LOOP
        EXECUTE format($f$
            CREATE POLICY %I ON %I.%I
                FOR ALL TO public
                USING (true)
                WITH CHECK (true)
        $f$, orig.pol, orig.sch, orig.tbl);
        RAISE NOTICE '已恢复 allow_all 策略 %.%.%', orig.sch, orig.tbl, orig.pol;
    END LOOP;

    -- 4. 恢复后断言：每表唯一策略、USING=true、rls/force 仍为 true
    FOREACH t IN ARRAY ARRAY[
        'gis.geodata', 'gis.geofeatures', 'gis.map_layers', 'gis.spatial_analysis'
    ] LOOP
        IF (SELECT count(*) FROM pg_policies p
             WHERE p.schemaname = split_part(t, '.', 1)
               AND p.tablename = split_part(t, '.', 2)) <> 1 THEN
            RAISE EXCEPTION '回滚断言失败：% 策略数 <> 1', t;
        END IF;
        IF (SELECT max(p.qual::text) FROM pg_policies p
             WHERE p.schemaname = split_part(t, '.', 1)
               AND p.tablename = split_part(t, '.', 2)) <> 'true' THEN
            RAISE EXCEPTION '回滚断言失败：% 未恢复 allow_all(true)', t;
        END IF;
        IF NOT (SELECT c.relrowsecurity AND c.relforcerowsecurity
                  FROM pg_class c WHERE c.oid = to_regclass(t)) THEN
            RAISE EXCEPTION '回滚断言失败：% 的 rls/force 未保持开启', t;
        END IF;
    END LOOP;
    RAISE NOTICE '回滚完成：4 张 gis 表已恢复 allow_all 策略，RLS/FORCE 保持开启';
END $$;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261118112000;

COMMIT;
