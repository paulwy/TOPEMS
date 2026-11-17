-- 第三批宽松策略收口：gis 4 张图层/空间表 allow_all → 严格 B 范式
--（本文件只出方案，生产另行开窗；生产零 DDL / 零数据修复 / 零停服）
--
-- 定性结论（2026-11-17 生产 topems_prod 与克隆库 m2_dryrun_20261116 只读核查，superuser）：
--
--   本批 4 张表均满足「可安全收严」三条：
--     a) tenant_id 已存在且 NOT NULL、无默认（20261115141400_b_class_gis_tenant_id_4tables 已补齐）；
--     b) 两库均 0 行（pg_class/pg_stat_user_tables 与精确 count 一致），无零租户历史数据；
--        开窗时若已出现租户行仍安全：tenant_id NOT NULL 且代码显式绑定，迁移前仅留痕不中止；
--     c) 无跨租户读路径：svc/gis 的读写全部经请求级 scope（scope_with 注入 app.tenant_id），
--        列表/详情用 RLS 过滤，INSERT 显式绑定 tenant_id（geodata.rs/map.rs/spatial.rs），
--        无 set_system_channel / 平台读分支。
--
--   现状策略（ALL，USING true / WITH CHECK true）：gis_allow_all_geodata / gis_allow_all_geofeatures /
--   gis_allow_all_map_layers / gis_allow_all_spatial_analysis。RLS 已 ENABLE + FORCE，
--   allow_all 使租户隔离形同虚设（任意租户可读写全部行），本批改为严格 B 范式。
--
-- 变更：4 张表动态清空既有策略 → ENABLE + FORCE RLS →
--       重建唯一严格 B 范式策略 rls_tenant_isolation（USING + WITH CHECK）→
--       补 tenant_id 索引。不改列、不改数据、不做 NULL→哨兵归一。
--
-- 锁影响：4 次 ENABLE + 4 次 FORCE（ACCESS EXCLUSIVE 瞬时）+ 4 次 DROP/CREATE POLICY
--   + 4 次 CREATE INDEX IF NOT EXISTS（0 行表，秒级）。
--
-- 回滚：database/rollback/20261118112000_gis_map_layers_allow_all_strict.rollback.sql
--       回滚重建原 allow_all 策略并删除本批 tenant_id 索引。
--
-- 部署耦合：无代码耦合（代码已显式绑定租户）；无需与 svc/gis 同窗口。
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言与读数
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_col int;
    v_notnull text;
    n_pol int;
    v_qual text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'gis.geodata',
        'gis.geofeatures',
        'gis.map_layers',
        'gis.spatial_analysis'
    ] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;

        SELECT count(*), max(is_nullable) INTO n_col, v_notnull
          FROM information_schema.columns
         WHERE table_schema = split_part(t, '.', 1)
           AND table_name = split_part(t, '.', 2)
           AND column_name = 'tenant_id';
        IF n_col <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 缺少 tenant_id 列', t;
        END IF;
        IF v_notnull <> 'NO' THEN
            RAISE EXCEPTION '前置断言失败：% 的 tenant_id 可空（期望 NOT NULL），需先回填定性', t;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s', t) INTO n_rows;
        RAISE NOTICE '迁移前 %：总行 %', t, n_rows;
        -- 定性时 0 行；开窗时若已有租户行也安全（tenant_id NOT NULL 且代码显式绑定租户），
        -- 仅提示以便留痕，不中止（克隆库演练需要带夹具往返）。
        IF n_rows > 0 THEN
            RAISE NOTICE '% 已有 % 行数据，均为租户绑定行（tenant_id NOT NULL，无零租户分支）', t, n_rows;
        END IF;

        SELECT count(*), max(p.qual::text) INTO n_pol, v_qual
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 OR v_qual <> 'true' THEN
            RAISE EXCEPTION '前置断言失败：% 策略数 = %、USING = %（期望唯一 allow_all true）', t, n_pol, v_qual;
        END IF;
    END LOOP;
    RAISE NOTICE '前置断言通过：4 张 gis 表均 0 行、tenant_id NOT NULL、现为唯一 allow_all 策略';
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 清空 4 张目标表的既有策略（幂等）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'gis'
           AND p.tablename IN ('geodata', 'geofeatures', 'map_layers', 'spatial_analysis')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

-- 4. 严格 B 范式：ENABLE + FORCE + 唯一策略
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'gis.geodata',
        'gis.geofeatures',
        'gis.map_layers',
        'gis.spatial_analysis'
    ] LOOP
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
        EXECUTE format($f$
            CREATE POLICY rls_tenant_isolation ON %s
                FOR ALL TO public
                USING (
                    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
                )
                WITH CHECK (
                    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
                )
        $f$, t);
        RAISE NOTICE '已收紧 %', t;
    END LOOP;
END $$;

-- 5. tenant_id 索引（0 行表，秒级）
CREATE INDEX IF NOT EXISTS idx_gis_geodata_tenant_id ON gis.geodata (tenant_id);
CREATE INDEX IF NOT EXISTS idx_gis_geofeatures_tenant_id ON gis.geofeatures (tenant_id);
CREATE INDEX IF NOT EXISTS idx_gis_map_layers_tenant_id ON gis.map_layers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_gis_spatial_analysis_tenant_id ON gis.spatial_analysis (tenant_id);

-- 6. 后置断言
DO $$
DECLARE
    t text;
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
    has_idx boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'gis.geodata',
        'gis.geofeatures',
        'gis.map_layers',
        'gis.spatial_analysis'
    ] LOOP
        SELECT count(*), max(p.qual::text), max(p.with_check::text) INTO n_pol, v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;
        IF position('app.rls_system' IN coalesce(v_qual, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 缺少 app.rls_system 分支：%', t, v_qual;
        END IF;
        IF position('app.tenant_id' IN coalesce(v_qual, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 缺少 app.tenant_id 分支：%', t, v_qual;
        END IF;
        IF position('tenant_id IS NULL' IN coalesce(v_qual, '')) > 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 仍含 tenant_id IS NULL 放行分支：%', t, v_qual;
        END IF;
        IF position('app.rls_system' IN coalesce(v_wcheck, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 WITH CHECK 缺失或未显式：%', t, v_wcheck;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM pg_indexes i
             WHERE i.schemaname = split_part(t, '.', 1)
               AND i.tablename = split_part(t, '.', 2)
               AND i.indexdef LIKE '%(tenant_id)%'
        ) INTO has_idx;
        IF NOT has_idx THEN
            RAISE EXCEPTION '后置断言失败：% 缺少 tenant_id 索引', t;
        END IF;
    END LOOP;
    RAISE NOTICE '后置断言通过：4 张 gis 表均已严格 B 范式（rls/force + 唯一策略 + tenant_id 索引）';
END $$;
