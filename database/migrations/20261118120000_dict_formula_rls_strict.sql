-- 第五批宽松策略收口：erp 字典 2 表 + rs.formulas allow_all → 严格 B 范式（仅隔离，无平台读）
--（本文件只出方案，生产另行开窗；生产零 DDL / 零数据修复 / 零停服）
--
-- 定性结论（2026-11-17 生产 topems_prod 只读核查，superuser）：
--
--   a) erp.dict_types / erp.dict_items：0 行，tenant_id 可空、无默认。
--      代码写入点已在本批同时收口（svc/erp/src/modules/dict.rs 三处 INSERT 由
--      「NULLIF(current_setting('app.tenant_id', true), '')::UUID」改为
--      TenantScope::from_claims(...).create_tenant_id() 显式绑定：真实租户 / 服务身份显式哨兵 /
--      缺租户 400，不再有「条件不满足悄悄写 NULL」）。
--      读路径：列表/详情均走请求级 scope，unified-core 无跨租户读取；无平台读语义。
--      tenant_id 无索引，本批补 idx_dict_types_tenant_id / idx_dict_items_tenant_id。
--
--   b) rs.formulas：0 行，tenant_id 可空、无默认；存在两条 permissive 策略
--      rls_tenant_isolation(ALL 严格) + rs_allow_all_formulas(ALL true)，OR 合并后 allow_all 生效。
--      写路径显式绑定 Uuid（超管回落 …0001，非 NULL）；读路径仅按请求租户经 RLS 过滤，
--      无跨租户读取、无平台读分支。本批删除 allow_all，保留唯一严格策略。
--
--   c) core.core_plugins 本批不纳入：读路径存在租户通道的全局目录 JOIN
--      （tenant_plugins.rs:134 list_tenant_plugins JOIN core.core_plugins、:449 uninstall 按 code 读取、
--      install 子查询按 code 取 id），严格隔离会让租户看不到他方发布的插件，需先定平台读方案，
--      已单独登记待决策。
--
--   d) bi.audit_logs 不写策略：全仓无读者、无写者（共享审计白名单不含 bi），登记 DROP 候选。
--
-- 可见范围（收紧后）：未设/空串 → 0；租户 A → 仅 A 行；租户 B → 仅 B 行；
--   全零 GUC → 仅 tenant_id 为全零的行；A + app.rls_system=on → 全部（系统通道）。
--   现有租户读路径本来就只应看到本租户行，收紧不减少正常可见行，只消除跨租户泄漏。
--
-- 变更：动态清空 3 张表既有策略 → ENABLE + FORCE RLS →
--       重建唯一严格 B 范式策略 rls_tenant_isolation（USING + WITH CHECK）→
--       补 3 个 tenant_id 索引。不改列、不改数据、不做 NULL→哨兵归一。
--
-- 锁影响：3 次 ENABLE + 3 次 FORCE（ACCESS EXCLUSIVE 瞬时）+ 3 次 DROP/CREATE POLICY
--   + 3 次 CREATE INDEX IF NOT EXISTS（0 行表，秒级）。
--
-- 回滚：database/rollback/20261118120000_dict_formula_rls_strict.rollback.sql
--       回滚重建原 allow_all 策略（rs 同时保留严格策略，还原基线两条），并删除本批索引。
--
-- 部署耦合：与 svc/erp、svc/rd 同窗口（代码显式绑定与策略同批）。
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言与读数
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_null bigint;
    n_col int;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'erp.dict_types',
        'erp.dict_items',
        'rs.formulas'
    ]
    LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;

        SELECT count(*) INTO n_col
        FROM information_schema.columns
        WHERE table_schema = split_part(t, '.', 1)
          AND table_name = split_part(t, '.', 2)
          AND column_name = 'tenant_id';
        IF n_col <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 缺少 tenant_id 列', t;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s', t) INTO n_rows;
        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_null;
        IF n_null > 0 THEN
            RAISE EXCEPTION '前置断言失败：% 存在 % 行 NULL tenant_id，需先定性，禁止静默收严', t, n_null;
        END IF;

        RAISE NOTICE '前置读数：% 共 % 行，NULL tenant_id = %', t, n_rows, n_null;
    END LOOP;
END $$;

-- 2. 清空既有策略 → 严格 B 范式唯一策略
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

        EXECUTE format($fmt$
            CREATE POLICY rls_tenant_isolation ON %s
            FOR ALL
            USING (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
        $fmt$, t);
    END LOOP;
END $$;

-- 3. tenant_id 索引
CREATE INDEX IF NOT EXISTS idx_dict_types_tenant_id ON erp.dict_types (tenant_id);
CREATE INDEX IF NOT EXISTS idx_dict_items_tenant_id ON erp.dict_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_formulas_tenant_id ON rs.formulas (tenant_id);

-- 4. 后置断言
DO $$
DECLARE
    t text;
    n_pol int;
    v_cmd text;
    v_qual text;
    v_check text;
    v_rls boolean;
    v_force boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'erp.dict_types',
        'erp.dict_items',
        'rs.formulas'
    ]
    LOOP
        SELECT count(*) INTO n_pol FROM pg_policies
        WHERE schemaname = split_part(t, '.', 1)
          AND tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;

        SELECT cmd, qual, with_check INTO v_cmd, v_qual, v_check
        FROM pg_policies
        WHERE schemaname = split_part(t, '.', 1)
          AND tablename = split_part(t, '.', 2)
          AND policyname = 'rls_tenant_isolation';
        IF v_cmd IS DISTINCT FROM 'ALL'
           OR v_qual NOT LIKE '%rls_system%'
           OR v_qual NOT LIKE '%tenant_id%'
           OR v_check NOT LIKE '%rls_system%'
           OR v_check NOT LIKE '%tenant_id%' THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls_tenant_isolation 定义不符（cmd=%）', t, v_cmd;
        END IF;

        SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_force
        FROM pg_class
        WHERE oid = to_regclass(t);
        IF NOT v_rls OR NOT v_force THEN
            RAISE EXCEPTION '后置断言失败：% RLS=% / FORCE=%', t, v_rls, v_force;
        END IF;
    END LOOP;
END $$;
