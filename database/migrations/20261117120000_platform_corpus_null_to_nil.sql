-- 平台语料归一：字典 / AI 内置模板与模型的 NULL 租户行 → PLATFORM_TENANT_ID（全零 UUID）
--
-- 背景：public.core_dict_types / public.core_dict_items / ai.ai_prompt_templates / ai.ai_models
--   历史上用 tenant_id IS NULL 表示「平台内置语料」，并靠宽松的 rls_global_read SELECT 策略
--   （B 范式 + OR tenant_id IS NULL）让所有租户可读。这与「缺租户上下文即全放行」在策略文本上
--   无法区分，属于必须拆除的宽松形态。
--
-- 目标形态（与 core.ai_faqs 既有做法一致）：
--   1. 平台语料行的 tenant_id 一律为 PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000000'，
--      不再使用 NULL；读取端改为「本租户行 ∪ 平台行」：
--      本租户行走请求事务（scope_with），平台行走 scope_read_platform()（系统只读通道）
--      并带显式平台谓词 tenant_id = PLATFORM_TENANT_ID。
--   2. 删除 4 张表的 rls_global_read 宽松 SELECT 策略；保留既有 rls_tenant_isolation（B 范式，
--      本迁移不改动其文本）。此后平台语料只能经系统只读通道 + 显式谓词读取，
--      租户请求事务不再能直接看到平台行。
--
-- 现状（2026-11-17 对克隆库 m2_dryrun_20261116 实测，与生产同源）：
--   public.core_dict_types     NULL 租户 77 行，全零租户 0 行
--   public.core_dict_items     NULL 租户 397 行，全零租户 0 行
--   ai.ai_prompt_templates     NULL 租户 3 行， 全零租户 0 行
--   ai.ai_models               NULL 租户 4 行，  全零租户 0 行
--   4 张表均 relrowsecurity=t / relforcerowsecurity=t，且同时存在
--   rls_tenant_isolation(ALL, B 范式) 与 rls_global_read(SELECT, B 范式 + tenant_id IS NULL)。
--
-- 前置硬断言：4 张表在迁移前不得存在全零租户行。若已存在，说明平台语料已部分归一或有其它来源，
--   本迁移直接中止（回滚脚本的「全零 → NULL」逆操作以迁移前全零行数为 0 为前提）。
--
-- 锁影响：4 次 UPDATE 各自行锁（77/397/3/4 行，小表瞬时）；DROP POLICY 需 ACCESS EXCLUSIVE（瞬时）。
--   不做任何列形状变更，不影响既有读写 SQL 的 parse。
--
-- 部署耦合（重要）：本迁移与读取端代码改造必须同一停机窗口发布。
--   仅上迁移不上代码 → 租户在请求事务里看不到平台语料（字典列表/内置模板/全局模型会空）；
--   仅上代码不上迁移 → scope_read_platform() 按全零租户谓词查不到仍为 NULL 的语料行。
--
-- 回滚：database/rollback/20261117120000_platform_corpus_null_to_nil.rollback.sql

-- 1. 前置断言：表存在、宽松策略存在、全零租户行数为 0
DO $$
DECLARE
    t text;
    n_nil bigint;
    n_pol int;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_dict_types', 'public.core_dict_items',
        'ai.ai_prompt_templates', 'ai.ai_models'
    ] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id = %L', t,
                       '00000000-0000-0000-0000-000000000000')
          INTO n_nil;
        IF n_nil <> 0 THEN
            RAISE EXCEPTION '前置断言失败：% 已存在 % 行全零租户数据，需先人工甄别来源，本迁移中止', t, n_nil;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_global_read';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 的 rls_global_read 策略数 = %（期望 1，现状可能已收紧）', t, n_pol;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 缺少既有 rls_tenant_isolation（B 范式）策略', t;
        END IF;
    END LOOP;
END $$;

-- 2. 迁移会话显式走系统通道（FORCE RLS 下表 owner 同样受策略约束）
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. NULL → PLATFORM_TENANT_ID 归一
-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 平台内置字典类型由 NULL 租户归一到全零平台租户，配合拆除宽松 rls_global_read
-- destructive-owner: master-data
-- destructive-ticket: PLATFORM-CORPUS-20261117
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1000
-- destructive-backup: 窗口前超户 pg_dump -t public.core_dict_types；down 迁移可将全零行还原为 NULL
UPDATE public.core_dict_types
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 平台内置字典项由 NULL 租户归一到全零平台租户，配合拆除宽松 rls_global_read
-- destructive-owner: master-data
-- destructive-ticket: PLATFORM-CORPUS-20261117
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1000
-- destructive-backup: 窗口前超户 pg_dump -t public.core_dict_items；down 迁移可将全零行还原为 NULL
UPDATE public.core_dict_items
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 内置提示词模板由 NULL 租户归一到全零平台租户，配合拆除宽松 rls_global_read
-- destructive-owner: ai
-- destructive-ticket: PLATFORM-CORPUS-20261117
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1000
-- destructive-backup: 窗口前超户 pg_dump -t ai.ai_prompt_templates；down 迁移可将全零行还原为 NULL
UPDATE ai.ai_prompt_templates
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 全局模型由 NULL 租户归一到全零平台租户，配合拆除宽松 rls_global_read
-- destructive-owner: ai
-- destructive-ticket: PLATFORM-CORPUS-20261117
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1000
-- destructive-backup: 窗口前超户 pg_dump -t ai.ai_models；down 迁移可将全零行还原为 NULL
UPDATE ai.ai_models
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
 WHERE tenant_id IS NULL;

-- 4. 归一完整性断言：NULL 行必须清零
DO $$
DECLARE
    t text;
    n_null bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_dict_types', 'public.core_dict_items',
        'ai.ai_prompt_templates', 'ai.ai_models'
    ] LOOP
        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_null;
        IF n_null <> 0 THEN
            RAISE EXCEPTION '归一失败：% 仍有 % 行 NULL 租户，中止迁移', t, n_null;
        END IF;
    END LOOP;
END $$;

-- 5. 拆除宽松 SELECT 策略（rls_tenant_isolation 保持原样）
DROP POLICY rls_global_read ON public.core_dict_types;
DROP POLICY rls_global_read ON public.core_dict_items;
DROP POLICY rls_global_read ON ai.ai_prompt_templates;
DROP POLICY rls_global_read ON ai.ai_models;

-- 6. 后置断言：宽松策略清零、B 范式策略仍在、RLS 仍强制、归一后行数未丢
DO $$
DECLARE
    t text;
    n_pol int;
    n_rows bigint;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_dict_types', 'public.core_dict_items',
        'ai.ai_prompt_templates', 'ai.ai_models'
    ] LOOP
        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_global_read';
        IF n_pol <> 0 THEN
            RAISE EXCEPTION '后置断言失败：% 仍存在 rls_global_read 宽松策略', t;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls_tenant_isolation 策略数 = %（期望 1）', t, n_pol;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id = %L', t,
                       '00000000-0000-0000-0000-000000000000')
          INTO n_rows;
        IF n_rows = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 归一后全零租户行为 0，语料行丢失', t;
        END IF;
    END LOOP;
END $$;
