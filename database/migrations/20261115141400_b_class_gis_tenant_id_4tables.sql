-- B 类列补齐（3/7）· gis · gis.geodata / gis.geofeatures / gis.map_layers / gis.spatial_analysis（4 表 4 列，均为 tenant_id）
--
-- 口径：B 类 = prod 缺列、且 HEAD 代码已真实读/写该列（docs/database/column-drift-attribution-2026-11-15.md §4.2.2）。
--   本迁移只做 ADD COLUMN，不建索引、不建约束、不改策略、不含 BEGIN/COMMIT。
--
-- 目标定义（以 dev 现有定义为唯一依据）：4 列均为
--   tenant_id  uuid  NOT NULL  （无默认值）
--
-- 证据（取证门已回读，行号直接引用）：
--   gis.geodata         写：svc/gis/src/modules/geodata.rs:127-131
--       INSERT INTO gis.geodata (name, data_type, format, geojson_data, feature_count, uploaded_by, tenant_id)
--   gis.geofeatures     写：svc/gis/src/modules/geodata.rs:186-190
--       INSERT INTO gis.geofeatures (geodata_id, feature_type, geometry, properties, tenant_id)
--   gis.map_layers      写：svc/gis/src/modules/map.rs:391-396（INSERT 列清单含 tenant_id）
--                       读：svc/gis/src/modules/map.rs:351-353（SELECT 列清单与 WHERE ... tenant_id = $2）
--   gis.spatial_analysis 写：svc/gis/src/modules/spatial.rs:94-97
--       INSERT INTO gis.spatial_analysis (analysis_type, input_data, parameters, result_geometry,
--                                         execution_time_ms, created_by, tenant_id)
--
--   prod 缺列时的失败方式：以上 4 条 INSERT 均把 tenant_id 写进列清单，prod 无该列时在
--   parse/analyze 阶段报 SQLSTATE 42703 undefined_column（column "tenant_id" does not exist），
--   gis 新建/查询图层与分析结果的全部路径稳定 500；map.rs:352 的 SELECT 同样 42703。
--
-- 前置断言：4 表存在；tenant_id 均不存在；4 表 prod 均 0 行（dev 定义为 NOT NULL，非 0 行则拒绝直加）。
-- 同名对象冲突：本迁移不创建索引；dev 侧 idx_<table>_tenant_id 不随本次创建；prod 既有索引
--   （各表 pkey 及 map_layers/geodata 的既有索引）均不引用 tenant_id（列不存在，必然不引用）。
-- 后置断言：4 表 tenant_id 形状 = (uuid, NOT NULL, 无默认)。
--
-- RLS 副作用核查（prod 实测）：4 表均为 relrowsecurity=true / relforcerowsecurity=true，策略是
--   gis_allow_all_geodata / gis_allow_all_geofeatures / gis_allow_all_map_layers /
--   gis_allow_all_spatial_analysis，谓词为 USING (true)（PERMISSIVE ALL，WITH CHECK 继承 true）。
--   补 tenant_id 不会改变这些谓词：补列前后可见行集合、写入许可均不变，无新增拒绝分支。
--   与 dev 的 tenant 隔离策略差异属后续收紧批次，本迁移不涉及。
--
-- 残余缺列：无。这 4 张表在 prod 除 tenant_id 外与 dev 列集合一致，本迁移后 INSERT/SELECT 路径
--   在列层面齐备（实际可用性还取决于 prod 是否已部署对应二进制）。
--
-- 回滚：database/rollback/20261115141400_b_class_gis_tenant_id_4tables.rollback.sql
--   （逐表：仅当列内无任何非空值才删列，有数据则保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
DECLARE
    t text;
    n_rows bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY['gis.geodata', 'gis.geofeatures', 'gis.map_layers', 'gis.spatial_analysis'] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION 'B 类前置断言失败：表 % 不存在', t;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'gis'
               AND table_name = split_part(t, '.', 2)
               AND column_name = 'tenant_id'
        ) THEN
            RAISE EXCEPTION 'B 类前置断言失败：%.tenant_id 已存在，本迁移只补缺失列', t;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s', t) INTO n_rows;
        IF n_rows <> 0 THEN
            RAISE EXCEPTION 'B 类前置断言失败：% 有 % 行，dev 定义为 NOT NULL，禁止直接加 NOT NULL', t, n_rows;
        END IF;
    END LOOP;
END $$;

-- 2. 补列
ALTER TABLE gis.geodata          ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL;
ALTER TABLE gis.geofeatures      ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL;
ALTER TABLE gis.map_layers       ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL;
ALTER TABLE gis.spatial_analysis ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL;

-- 3. 后置断言：形状与 dev 定义逐项对齐
DO $$
DECLARE
    t text;
    v_type text;
    v_nullable text;
    v_default text;
BEGIN
    FOREACH t IN ARRAY ARRAY['gis.geodata', 'gis.geofeatures', 'gis.map_layers', 'gis.spatial_analysis'] LOOP
        SELECT data_type, is_nullable, column_default
          INTO v_type, v_nullable, v_default
          FROM information_schema.columns
         WHERE table_schema = split_part(t, '.', 1)
           AND table_name = split_part(t, '.', 2)
           AND column_name = 'tenant_id';

        IF v_type IS NULL THEN
            RAISE EXCEPTION 'B 类后置断言失败：%.tenant_id 未创建', t;
        END IF;
        IF v_type <> 'uuid' OR v_nullable <> 'NO' OR v_default IS NOT NULL THEN
            RAISE EXCEPTION 'B 类后置断言失败：%.tenant_id 形状=(%,%,%)，期望=(uuid,NO,NULL)',
                t, v_type, v_nullable, coalesce(v_default, 'NULL');
        END IF;
    END LOOP;
END $$;
