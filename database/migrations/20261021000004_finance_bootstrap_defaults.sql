-- =============================================================
-- P2-8: 财务默认科目/期间按新租户补播（bootstrap 函数 + 存量补播）
--
-- 背景：
--   20261020000005 只覆盖「迁移时已存在租户」，新建租户不补默认科目/期间。
--   本迁移把种子逻辑抽为幂等函数 finance.bootstrap_defaults(p_tenant_id)：
--     - p_tenant_id 为 NULL：收集全部既有租户（iam/public/flow.core_tenants +
--       iam.core_tenant_users + 已开通科目的租户）逐户补播；
--     - p_tenant_id 指定：仅补播该租户（供播种 API / 首启流程按需调用）。
--   函数幂等：每个 (tenant_id, code) / (tenant_id, period_name) NOT EXISTS 守卫，
--   不覆盖既有自定义科目/期间。
--   迁移末尾对存量租户执行一次全量补播，补齐 00005 之后新建租户的缺口。
-- =============================================================

CREATE OR REPLACE FUNCTION finance.bootstrap_defaults(p_tenant_id uuid DEFAULT NULL)
RETURNS int AS $$
DECLARE
    t uuid;
    cnt int := 0;
    v_year int := EXTRACT(YEAR FROM NOW())::int;
    v_month int := EXTRACT(MONTH FROM NOW())::int;
    v_period text := TO_CHAR(NOW(), 'YYYYMM');
    v_start timestamptz := date_trunc('month', NOW());
    v_end timestamptz := (date_trunc('month', NOW()) + interval '1 month') - interval '1 second';
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS bootstrap_seed_tenants (tenant_id uuid) ON COMMIT DROP;
    TRUNCATE bootstrap_seed_tenants;

    IF p_tenant_id IS NOT NULL THEN
        INSERT INTO bootstrap_seed_tenants VALUES (p_tenant_id);
    ELSE
        -- 动态收集既有租户（各来源守卫表存在，避免环境缺表导致失败）
        IF to_regclass('iam.core_tenants') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT id FROM iam.core_tenants WHERE deleted_at IS NULL';
        END IF;
        IF to_regclass('public.core_tenants') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT id FROM public.core_tenants WHERE deleted_at IS NULL';
        END IF;
        IF to_regclass('flow.core_tenants') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT id FROM flow.core_tenants WHERE deleted_at IS NULL';
        END IF;
        IF to_regclass('iam.core_tenant_users') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT DISTINCT tenant_id FROM iam.core_tenant_users WHERE tenant_id IS NOT NULL';
        END IF;
        IF to_regclass('finance.core_finance_accounts') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT DISTINCT tenant_id FROM finance.core_finance_accounts WHERE tenant_id IS NOT NULL';
        END IF;
    END IF;

    FOR t IN SELECT DISTINCT tenant_id FROM bootstrap_seed_tenants LOOP
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

        -- 当前月开放会计期间（缺失才插，已存在/已关闭期间不改动）
        INSERT INTO finance.core_finance_periods
            (tenant_id, year, month, period_name, status, start_date, end_date)
        SELECT t, v_year, v_month, v_period, 'open'::period_status, v_start, v_end
        WHERE NOT EXISTS (
            SELECT 1 FROM finance.core_finance_periods p
            WHERE p.tenant_id = t AND p.period_name = v_period
        );

        cnt := cnt + 1;
    END LOOP;

    DROP TABLE bootstrap_seed_tenants;
    RETURN cnt;
END $$ LANGUAGE plpgsql;

-- 存量补播：补齐 00005 之后新建租户的科目/期间缺口
SELECT finance.bootstrap_defaults(NULL) AS backfilled_tenants;
