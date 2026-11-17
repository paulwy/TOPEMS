-- 第六批：core.core_plugins 平台语料化（发布迁哨兵行 + 平台读 + 安装表外键）
--（本文件只出方案，生产另行开窗；生产零 DDL / 零数据修复 / 零停服）
--
-- 设计依据：docs/database/core-plugins-platform-catalog-design-2026-11-18.md
-- 拍板口径（2026-11-17）：
--   ① 不保留草稿副本：发布原地把行迁到哨兵，新增 owner_tenant_id 记发布方；
--   ② code 保持全局唯一；name 平台维度唯一（哨兵行、未删除），发布冲突返回 409；
--   ③ 租户下线：平台行保留、owner_tenant_id 置空，last_owner_tenant_id 与 unpublished_at 留痕；
--   ④ 同批补 iam.core_tenant_plugins.plugin_id → core.core_plugins(id) 外键（先查孤儿）；
--   ⑤ 发布/下架/install_count 走系统通道 + owner 校验，不给哨兵行开写入放行。
--
-- 状态语义：
--   草稿      tenant_id = 发布方,  owner_tenant_id = 发布方, is_published = false
--   平台条目  tenant_id = 哨兵,    owner_tenant_id = 发布方, is_published = true
--   平台原生  tenant_id = 哨兵,    owner_tenant_id = NULL,  last_owner_tenant_id = NULL
--   下线留痕  tenant_id = 哨兵,    owner_tenant_id = NULL,  last_owner_tenant_id = 原发布方,
--             unpublished_at = 下架时间
--
-- 变更：加 owner_tenant_id / last_owner_tenant_id / unpublished_at；
--       回填（0 行）；去掉 tenant_id 默认 …0001；平台维度 name 唯一索引；
--       清空策略 → ENABLE+FORCE → rls_tenant_isolation(ALL) + rls_platform_read(SELECT)；
--       补安装表外键。不改数据、不做 NULL 归一。
--
-- 锁影响：3 次 ADD COLUMN（默认值 NULL，瞬时）+ 策略重建 + 2 个索引（0 行）
--   + 1 次外键校验（0 行）+ 1 次 DROP DEFAULT。
--
-- 回滚：database/rollback/20261118123000_core_plugins_platform_catalog.rollback.sql
--
-- 部署耦合：与 svc/plugin-registry 同窗口（发布/下架/计数/市场读同批改）。
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118
--
-- 事务：文件内不自带 BEGIN/COMMIT，由迁移 runner 以单事务执行（--single-transaction）。

-- 1. 前置断言：表/列存在、无孤儿安装行、无平台同名、无 NULL 租户行
DO $$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('core.core_plugins') IS NULL OR to_regclass('iam.core_tenant_plugins') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：core.core_plugins 或 iam.core_tenant_plugins 不存在';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'core' AND table_name = 'core_plugins' AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION '前置断言失败：core.core_plugins 缺少 tenant_id';
    END IF;

    SELECT count(*) INTO n
    FROM iam.core_tenant_plugins tp
    LEFT JOIN core.core_plugins p ON p.id = tp.plugin_id
    WHERE p.id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION '前置断言失败：iam.core_tenant_plugins 存在 % 行孤儿 plugin_id，需先定性再补外键', n;
    END IF;

    SELECT count(*) INTO n
    FROM (
        SELECT name
        FROM core.core_plugins
        WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
          AND name IS NOT NULL
          AND deleted_at IS NULL
        GROUP BY name
        HAVING count(*) > 1
    ) d;
    IF n > 0 THEN
        RAISE EXCEPTION '前置断言失败：哨兵行存在 % 组同名插件（name 平台维度唯一），需先改名', n;
    END IF;

    SELECT count(*) INTO n FROM core.core_plugins WHERE tenant_id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION '前置断言失败：core.core_plugins 存在 % 行 NULL tenant_id，需先定性', n;
    END IF;

    RAISE NOTICE '前置读数：core.core_plugins = % 行，iam.core_tenant_plugins = % 行，孤儿 0',
        (SELECT count(*) FROM core.core_plugins),
        (SELECT count(*) FROM iam.core_tenant_plugins);
END $$;

-- 2. 归属列
ALTER TABLE core.core_plugins ADD COLUMN IF NOT EXISTS owner_tenant_id uuid;
ALTER TABLE core.core_plugins ADD COLUMN IF NOT EXISTS last_owner_tenant_id uuid;
ALTER TABLE core.core_plugins ADD COLUMN IF NOT EXISTS unpublished_at timestamptz;

COMMENT ON COLUMN core.core_plugins.owner_tenant_id IS
    '当前发布方；平台原生/租户下线后为 NULL';
COMMENT ON COLUMN core.core_plugins.last_owner_tenant_id IS
    '最近一次发布方留痕；租户下线置空 owner 后仍保留';
COMMENT ON COLUMN core.core_plugins.unpublished_at IS
    '最近一次下架/下线时间；重新发布时清空';

-- 既有行回填（当前 0 行）：非哨兵行视为在途草稿，发布方即所属租户
-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 回填草稿行的发布方归属（平台语料化前置，生产 0 行）
-- destructive-owner: core
-- destructive-ticket: RESIDUAL-RLS-20261118
-- destructive-expires: 2027-05-10
-- destructive-max-rows: 1000
-- destructive-backup: 窗口前超户 pg_dump -t core.core_plugins
UPDATE core.core_plugins
SET owner_tenant_id = tenant_id,
    last_owner_tenant_id = tenant_id
WHERE tenant_id <> '00000000-0000-0000-0000-000000000000'
  AND owner_tenant_id IS NULL;

-- 禁止再靠默认 …0001 落行
ALTER TABLE core.core_plugins ALTER COLUMN tenant_id DROP DEFAULT;

-- 3. 平台维度 name 唯一（仅哨兵行、未删除）
CREATE UNIQUE INDEX IF NOT EXISTS core_plugins_platform_name_key
    ON core.core_plugins (name)
    WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
      AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_core_plugins_owner_tenant
    ON core.core_plugins (owner_tenant_id);

-- 平台读索引
CREATE INDEX IF NOT EXISTS idx_core_plugins_platform_tenant
    ON core.core_plugins (tenant_id)
    WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- 4. 安装表外键（孤儿已在第 1 步断言）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'iam.core_tenant_plugins'::regclass
          AND conname = 'fk_core_tenant_plugins_plugin'
    ) THEN
        ALTER TABLE iam.core_tenant_plugins
            ADD CONSTRAINT fk_core_tenant_plugins_plugin
            FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 5. 策略：严格隔离 + 平台读（不放水）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'core' AND tablename = 'core_plugins'
    LOOP
        EXECUTE format('DROP POLICY %I ON core.core_plugins', r.policyname);
    END LOOP;

    ALTER TABLE core.core_plugins ENABLE ROW LEVEL SECURITY;
    ALTER TABLE core.core_plugins FORCE ROW LEVEL SECURITY;

    CREATE POLICY rls_tenant_isolation ON core.core_plugins
        FOR ALL
        USING (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        )
        WITH CHECK (
            COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
            OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
        );

    CREATE POLICY rls_platform_read ON core.core_plugins
        FOR SELECT
        USING (
            tenant_id = '00000000-0000-0000-0000-000000000000'
            AND NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
        );
END $$;

-- 6. 后置断言
DO $$
DECLARE
    n_pol int;
    v_qual text;
    v_check text;
BEGIN
    SELECT count(*) INTO n_pol FROM pg_policies
    WHERE schemaname = 'core' AND tablename = 'core_plugins';
    IF n_pol <> 2 THEN
        RAISE EXCEPTION '后置断言失败：策略数 = %（期望 2）', n_pol;
    END IF;

    SELECT qual, with_check INTO v_qual, v_check FROM pg_policies
    WHERE schemaname = 'core' AND tablename = 'core_plugins' AND policyname = 'rls_tenant_isolation';
    IF v_qual IS NULL OR v_qual NOT LIKE '%rls_system%' OR v_check NOT LIKE '%rls_system%' THEN
        RAISE EXCEPTION '后置断言失败：rls_tenant_isolation 定义不符';
    END IF;

    SELECT qual INTO v_qual FROM pg_policies
    WHERE schemaname = 'core' AND tablename = 'core_plugins' AND policyname = 'rls_platform_read';
    IF v_qual IS NULL OR v_qual NOT LIKE '%00000000-0000-0000-0000-000000000000%' OR v_qual NOT LIKE '%IS NOT NULL%' THEN
        RAISE EXCEPTION '后置断言失败：rls_platform_read 定义不符';
    END IF;

    IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'core.core_plugins'::regclass) THEN
        RAISE EXCEPTION '后置断言失败：RLS / FORCE 未开启';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'core' AND tablename = 'core_plugins'
          AND indexname = 'core_plugins_platform_name_key'
    ) THEN
        RAISE EXCEPTION '后置断言失败：name 平台唯一索引缺失';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'iam.core_tenant_plugins'::regclass
          AND conname = 'fk_core_tenant_plugins_plugin'
          AND convalidated
    ) THEN
        RAISE EXCEPTION '后置断言失败：安装表外键缺失或未校验';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'core' AND table_name = 'core_plugins'
          AND column_name = 'tenant_id' AND column_default IS NOT NULL
    ) THEN
        RAISE EXCEPTION '后置断言失败：tenant_id 默认值未移除';
    END IF;
END $$;
