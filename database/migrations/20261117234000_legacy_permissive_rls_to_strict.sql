-- 三张历史宽松策略表收紧为严格 B 范式（生产窗口第 5 条）
--
-- 目标表：public.core_files、bi.analytics_datasets、master_data.mdm_metadata_objects
--
-- 定性依据（2026-11-17 生产 topems_prod / 克隆库 m2_dryrun_20261116 只读核查）：
--   public.core_files               tenant_id NOT NULL、无 default；两库均 0 行、3 个租户索引
--   bi.analytics_datasets           tenant_id NOT NULL default '00000000-0000-0000-0000-000000000001'；
--                                   两库均 0 行、idx_analytics_datasets_tenant_id
--   master_data.mdm_metadata_objects tenant_id 可空、default '...0001'；两库均 0 行、无 tenant_id 索引
--   → 三表 tenant_id 分布：NULL=0 / 全零=0 / 真实租户=0；无历史行需要归属推断。
--     平台种子路径仅 20261014000060 的 mdm_metadata_objects INSERT（未写 tenant_id，落 default 0001），
--     生产该表 0 行 → 当前无平台种子行；本迁移仍把「NULL 租户」归一为全零平台租户，
--     以免其它环境里平台可见文件/对象在收紧后失去应有可见性。
--
-- 策略现状（关键差异）：
--   生产：三表已是严格 B 范式（M-2 batch06 线下收紧），但 bi.analytics_datasets 上同时残留
--         两条严格策略（rls_tenant_isolation + tenant_isolation_analytics_datasets）。
--   克隆库：三表仍是历史宽松策略（tenant_id IS NULL / GUC 未设 / 空串 / 全零 四个放行分支）。
--   → 本迁移对「宽松」与「已严格」两种输入都幂等：先归一 NULL，再清空该表全部策略，
--     统一重建唯一严格策略 rls_tenant_isolation（USING + WITH CHECK 全显式）。
--
-- 与本窗口其它迁移的关系：20261117120000 处理平台语料四表、20261117180000/220000 处理
--   unified-core 11 表、20261117233000 处理 schema_registry/dynamic_data；本迁移对象与它们无重叠。
--
-- 锁影响：3 次 UPDATE（两库均 0 行，瞬时）、3 次 ALTER TABLE ENABLE/FORCE（SHARE ROW EXCLUSIVE）、
--   策略 DROP/CREATE（ACCESS EXCLUSIVE，瞬时）、mdm 表 SET NOT NULL 全表扫描（0 行）、
--   1 次 CREATE INDEX（空表瞬时）。不改变列类型，不影响既有 SQL 的 parse。
--
-- 部署耦合：读取端已用请求事务 scope_with + 显式 tenant_id 谓词（list_files / dataset.rs /
--   metadata_v60 / master_plugin），本迁移不要求代码同改；平台可见行走全零租户作用域。
--
-- 回滚：database/rollback/20261117234000_legacy_permissive_rls_to_strict.rollback.sql

-- 1. 前置断言：表存在；记录归一前读数（不阻断，仅用于窗口台账核对）
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_null bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_files', 'bi.analytics_datasets', 'master_data.mdm_metadata_objects'
    ] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;
        EXECUTE format('SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM %s', t)
          INTO n_rows, n_null;
        RAISE NOTICE '归一前 %：总行 %，NULL 租户 % 行', t, n_rows, n_null;
    END LOOP;
END $$;

-- 2. 迁移会话显式走系统通道（FORCE RLS 下 owner 同样受策略约束）
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. NULL 租户 → 全零平台租户归一（平台可见性保留）
-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 历史文件行的 NULL 租户归一到全零平台租户，避免收紧策略后平台可见文件失去可见性
-- destructive-owner: unified-core
-- destructive-ticket: PLATFORM-CORPUS-20261117
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1000
-- destructive-backup: 窗口前超户 pg_dump -t public.core_files；回滚不回退归一（避免平台行重新失去归属）
UPDATE public.core_files
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 历史数据集行的 NULL 租户归一到全零平台租户，避免收紧策略后平台数据集失去可见性
-- destructive-owner: analytics
-- destructive-ticket: PLATFORM-CORPUS-20261117
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1000
-- destructive-backup: 窗口前超户 pg_dump -t bi.analytics_datasets；回滚不回退归一
UPDATE bi.analytics_datasets
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
 WHERE tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 历史元数据对象行的 NULL 租户归一到全零平台租户，避免收紧策略后平台对象失去可见性
-- destructive-owner: master-data
-- destructive-ticket: PLATFORM-CORPUS-20261117
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1000
-- destructive-backup: 窗口前超户 pg_dump -t master_data.mdm_metadata_objects；回滚不回退归一
UPDATE master_data.mdm_metadata_objects
   SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
 WHERE tenant_id IS NULL;

-- 4. 归一完整性断言：NULL 行必须清零（否则严格策略下这些行会彻底不可见）
DO $$
DECLARE
    t text;
    n_null bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_files', 'bi.analytics_datasets', 'master_data.mdm_metadata_objects'
    ] LOOP
        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_null;
        IF n_null <> 0 THEN
            RAISE EXCEPTION '归一失败：% 仍有 % 行 NULL 租户，中止迁移', t, n_null;
        END IF;
    END LOOP;
END $$;

-- 5. 清空三表既有策略（宽松或已严格一律重建，确保不留放行分支/重复策略）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
          FROM pg_policies
         WHERE (schemaname, tablename) IN (
               ('public', 'core_files'),
               ('bi', 'analytics_datasets'),
               ('master_data', 'mdm_metadata_objects'))
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

-- 6. 强制 RLS + 唯一严格 B 范式策略
ALTER TABLE public.core_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_files FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.core_files
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE bi.analytics_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi.analytics_datasets FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON bi.analytics_datasets
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE master_data.mdm_metadata_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data.mdm_metadata_objects FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON master_data.mdm_metadata_objects
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 7. 租户列收敛：mdm 表 tenant_id 可空 → NOT NULL（策略已拒绝 NULL 写入，此处消除历史遗留）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'master_data' AND table_name = 'mdm_metadata_objects'
           AND column_name = 'tenant_id' AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE master_data.mdm_metadata_objects ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- 8. 严格策略的过滤列索引（mdm 表原先缺 tenant_id 索引）
CREATE INDEX IF NOT EXISTS idx_mdm_metadata_objects_tenant_id
    ON master_data.mdm_metadata_objects (tenant_id);

-- 9. 后置断言：每表恰好 1 条策略、必含 rls_system 分支、不含 tenant_id IS NULL 放行分支、RLS 强制
DO $$
DECLARE
    t text;
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_files', 'bi.analytics_datasets', 'master_data.mdm_metadata_objects'
    ] LOOP
        SELECT count(*), max(p.qual::text), max(p.with_check::text) INTO n_pol, v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1) AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;
        IF v_qual IS NULL OR position('app.rls_system' IN v_qual) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 缺少 app.rls_system 系统通道分支：%', t, v_qual;
        END IF;
        IF position('tenant_id IS NULL' IN v_qual) > 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 仍含 tenant_id IS NULL 放行分支：%', t, v_qual;
        END IF;
        IF v_wcheck IS NULL OR position('app.rls_system' IN v_wcheck) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 WITH CHECK 缺失或未显式：%', t, v_wcheck;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;
    END LOOP;
END $$;
