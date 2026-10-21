-- =============================================================
-- C9: 财务基础数据幂等种子（默认科目 + 当前月开放会计期间）
--
-- 背景：
--   空库无初始化基础数据时，付款创建流程在凭证生成阶段按 code 查
--   core_finance_accounts（2202 应付账款 / 1002 银行存款）会 RowNotFound，
--   表现为「记录不存在」；同时 core_finance_periods 无开放期间。
--
-- 方案选择：采用「幂等种子迁移」（而非独立 seed 脚本）。
--   - 随迁移链一次性落地，干净库重放自动生效，无需运维手工执行；
--   - 不硬编码任何特定演示租户：tenant_id 集合动态取自现有租户注册表
--     （iam/public/flow.core_tenants、iam.core_tenant_users）以及已经
--     开通科目的既有租户（finance.core_finance_accounts）；
--   - 每个 (tenant_id, code) / (tenant_id, period_name) 先 NOT EXISTS
--     守卫，重复执行/重放不重复插入、不覆盖用户自定义数据。
--
-- 说明：
--   - core_finance_accounts.tenant_id 为 NOT NULL，无法插入 NULL 公共行；
--     get_account_by_code 也只匹配本租户（或 nil UUID），故公共共享科目
--     在当前契约下不可行，种子按「既有租户」逐户播种。
--   - 迁移执行之后才新建的租户不在本种子覆盖范围，可通过开放期间 API /
--     科目管理界面补建（与本迁移幂等不冲突）。
-- =============================================================

DO $$
DECLARE
    t UUID;
    v_year INT := EXTRACT(YEAR FROM NOW())::INT;
    v_month INT := EXTRACT(MONTH FROM NOW())::INT;
    v_period TEXT := TO_CHAR(NOW(), 'YYYYMM');
    v_start TIMESTAMPTZ := date_trunc('month', NOW());
    v_end TIMESTAMPTZ := (date_trunc('month', NOW()) + INTERVAL '1 month') - INTERVAL '1 second';
BEGIN
    CREATE TEMP TABLE seed_tenant_ids (tenant_id UUID) ON COMMIT DROP;

    -- 动态收集已有租户：每个来源先守卫表是否存在，避免环境缺表导致整条迁移失败
    IF to_regclass('iam.core_tenants') IS NOT NULL THEN
        EXECUTE 'INSERT INTO seed_tenant_ids SELECT id FROM iam.core_tenants WHERE deleted_at IS NULL';
    END IF;
    IF to_regclass('public.core_tenants') IS NOT NULL THEN
        EXECUTE 'INSERT INTO seed_tenant_ids SELECT id FROM public.core_tenants WHERE deleted_at IS NULL';
    END IF;
    IF to_regclass('flow.core_tenants') IS NOT NULL THEN
        EXECUTE 'INSERT INTO seed_tenant_ids SELECT id FROM flow.core_tenants WHERE deleted_at IS NULL';
    END IF;
    IF to_regclass('iam.core_tenant_users') IS NOT NULL THEN
        EXECUTE 'INSERT INTO seed_tenant_ids SELECT DISTINCT tenant_id FROM iam.core_tenant_users WHERE tenant_id IS NOT NULL';
    END IF;
    -- 已开通科目的既有租户（可能晚于注册表播种）同样补全默认科目
    IF to_regclass('finance.core_finance_accounts') IS NOT NULL THEN
        EXECUTE 'INSERT INTO seed_tenant_ids SELECT DISTINCT tenant_id FROM finance.core_finance_accounts WHERE tenant_id IS NOT NULL';
    END IF;

    -- 去重
    DELETE FROM seed_tenant_ids a USING seed_tenant_ids b
    WHERE a.ctid < b.ctid AND a.tenant_id = b.tenant_id;

    -- 仅保留 FK 目标 public.core_tenants 中确实存在的租户：
    -- iam/flow 注册表与 public 主表漂移时（历史环境常见），
    -- 直接播种会触发 core_finance_* 的 tenant_id 外键违约
    IF to_regclass('public.core_tenants') IS NOT NULL THEN
        DELETE FROM seed_tenant_ids s
        WHERE NOT EXISTS (
            SELECT 1 FROM public.core_tenants t WHERE t.id = s.tenant_id
        );
    END IF;

    FOR t IN SELECT tenant_id FROM seed_tenant_ids LOOP
        -- 默认科目（缺失才插，不覆盖既有自定义科目）
        INSERT INTO finance.core_finance_accounts
            (tenant_id, code, name, account_type, level, currency, is_enabled, status)
        SELECT t, a.code, a.name, a.account_type::account_type, 1, 'CNY', TRUE, 'active'
        FROM (VALUES
            ('1001', '库存现金',     'asset'),
            ('1002', '银行存款',     'asset'),
            ('2202', '应付账款',     'liability'),
            ('6001', '主营业务收入', 'income'),
            ('6601', '管理费用',     'expense')
        ) AS a(code, name, account_type)
        WHERE NOT EXISTS (
            SELECT 1 FROM finance.core_finance_accounts fa
            WHERE fa.tenant_id = t AND fa.code = a.code
        );

        -- 当前月开放会计期间（缺失才插，已关闭/已存在的期间不改动）
        INSERT INTO finance.core_finance_periods
            (tenant_id, year, month, period_name, status, start_date, end_date)
        SELECT t, v_year, v_month, v_period, 'open'::period_status, v_start, v_end
        WHERE NOT EXISTS (
            SELECT 1 FROM finance.core_finance_periods p
            WHERE p.tenant_id = t AND p.period_name = v_period
        );
    END LOOP;
END $$;
