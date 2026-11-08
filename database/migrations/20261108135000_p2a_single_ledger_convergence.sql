-- P2a 第一笔：单账簿收敛（唯一账簿 = finance）
--
-- 目标：
--   1) finance.core_finance_vouchers 补 source_module / source_id（部分生产实例缺列），
--      并建部分唯一索引，为 create_auto_voucher 的 ON CONFLICT 提供真实落点；
--   2) 科目播种成组补齐企业会计准则通用科目（只补缺失 code，不覆盖租户既有名称/自定义科目）；
--   3) 停写 erp.financial_vouchers.organization_id 的随机 UUID 默认值，列语义显式废弃；
--   4) erp.financial_vouchers / erp.voucher_items / erp.vouchers 标注弃用（本轮不删表）。
--
-- 不改历史迁移；本文件为前向迁移，执行器以 --single-transaction 包裹。
--
-- ROLLBACK（人工评估后执行）：
--   DROP INDEX IF EXISTS finance.uq_finance_voucher_tenant_source;
--   ALTER TABLE erp.financial_vouchers ALTER COLUMN organization_id SET DEFAULT uuid_generate_v4();
--   ALTER TABLE erp.financial_vouchers ALTER COLUMN organization_id SET NOT NULL;
--   COMMENT ON TABLE erp.financial_vouchers IS NULL; ...（注释无副作用，可留）
--   finance.bootstrap_defaults 回退到 20261021000004 版本函数体。

-- ---------------------------------------------------------------------------
-- 1) 来源键列兜底 + 部分唯一索引（ON CONFLICT 落点）
-- ---------------------------------------------------------------------------

ALTER TABLE finance.core_finance_vouchers ADD COLUMN IF NOT EXISTS source_module varchar(64);
ALTER TABLE finance.core_finance_vouchers ADD COLUMN IF NOT EXISTS source_id varchar(64);

-- 建唯一索引前显式校验存量重复：不静默清理，直接失败交人工核对。
DO $$
DECLARE
    dup_groups bigint;
BEGIN
    SELECT count(*) INTO dup_groups
    FROM (
        SELECT tenant_id, source_module, source_id
        FROM finance.core_finance_vouchers
        WHERE source_id IS NOT NULL AND deleted_at IS NULL
        GROUP BY tenant_id, source_module, source_id
        HAVING count(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE EXCEPTION 'finance.core_finance_vouchers 存在 % 组重复来源键 (tenant_id, source_module, source_id)，请先人工核对，迁移中止', dup_groups;
    END IF;
END $$;

-- 幂等落点：同一业务事件（tenant + 来源模块 + 来源单据）只允许一张未删除凭证。
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_voucher_tenant_source
    ON finance.core_finance_vouchers (tenant_id, source_module, source_id)
    WHERE source_id IS NOT NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2) 默认科目成组补齐（幂等；只补缺失 code，不覆盖租户既有科目）
--    落点：unique_account_code UNIQUE (tenant_id, code)，用 ON CONFLICT DO NOTHING，
--    已存在的 code 一律跳过（不覆盖租户已改名称与自定义科目）。
-- ---------------------------------------------------------------------------

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

    -- 仅保留 FK 目标 public.core_tenants 中存在的租户：
    -- 历史环境中 iam/flow 注册表可能早于 public 主表出现漂移，
    -- 不过滤会触发 core_finance_* 的 tenant_id 外键违约
    IF to_regclass('public.core_tenants') IS NOT NULL THEN
        DELETE FROM bootstrap_seed_tenants s
        WHERE NOT EXISTS (
            SELECT 1 FROM public.core_tenants t WHERE t.id = s.tenant_id
        );
    END IF;

    FOR t IN SELECT DISTINCT tenant_id FROM bootstrap_seed_tenants LOOP
        -- 企业会计准则常用科目（成组补齐；缺失才插，不覆盖既有名称/自定义科目）
        INSERT INTO finance.core_finance_accounts
            (tenant_id, code, name, account_type, level, currency, is_enabled, status)
        SELECT t, a.code, a.name, a.account_type::account_type, 1, 'CNY', TRUE, 'active'
        FROM (VALUES
            -- 资产
            ('1001', '库存现金',     'asset'),
            ('1002', '银行存款',     'asset'),
            ('1122', '应收账款',     'asset'),
            ('1123', '预付账款',     'asset'),
            ('1403', '原材料',       'asset'),
            ('1405', '库存商品',     'asset'),
            ('1601', '固定资产',     'asset'),
            -- 负债
            ('2202', '应付账款',     'liability'),
            ('2203', '预收账款',     'liability'),
            ('2211', '应付职工薪酬', 'liability'),
            ('2221', '应交税费',     'liability'),
            ('2241', '其他应付款',   'liability'),
            -- 权益
            ('4001', '实收资本',     'equity'),
            ('4103', '本年利润',     'equity'),
            ('4104', '利润分配',     'equity'),
            -- 成本
            ('5001', '生产成本',     'cost'),
            ('5101', '制造费用',     'cost'),
            -- 损益
            ('6001', '主营业务收入', 'income'),
            ('6051', '其他业务收入', 'income'),
            ('6401', '主营业务成本', 'expense'),
            ('6402', '其他业务成本', 'expense'),
            ('6601', '销售费用',     'expense'),
            ('6602', '管理费用',     'expense'),
            ('6603', '财务费用',     'expense')
        ) AS a(code, name, account_type)
        ON CONFLICT (tenant_id, code) DO NOTHING;

        -- 工资凭证事件（HrmPayrollPosted）按明细科目 code 落账，补齐其引用的明细科目；
        -- 父科目在上一步已确保存在，parent_id 按 code 解析。
        INSERT INTO finance.core_finance_accounts
            (tenant_id, code, name, account_type, level, parent_id, parent_code,
             currency, is_enabled, status)
        SELECT t, a.code, a.name, a.account_type::account_type, 2,
               (SELECT fa.id FROM finance.core_finance_accounts fa
                WHERE fa.tenant_id = t AND fa.code = a.parent_code),
               a.parent_code, 'CNY', TRUE, 'active'
        FROM (VALUES
            ('100201', '银行存款-基本户',      'asset',     '1002'),
            ('222101', '应交税费-个人所得税',  'liability', '2221'),
            ('224101', '其他应付款-社保',      'liability', '2241'),
            ('660101', '管理费用-工资',        'expense',   '6602')
        ) AS a(code, name, account_type, parent_code)
        ON CONFLICT (tenant_id, code) DO NOTHING;

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

-- 存量租户立即补播缺失科目
SELECT finance.bootstrap_defaults(NULL) AS backfilled_tenants;

-- ---------------------------------------------------------------------------
-- 3) ERP 旧账簿停写：organization_id 去随机默认值 + 显式废弃语义
-- ---------------------------------------------------------------------------

ALTER TABLE erp.financial_vouchers ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE erp.financial_vouchers ALTER COLUMN organization_id DROP NOT NULL;

COMMENT ON COLUMN erp.financial_vouchers.organization_id IS
    '【已弃用 2026-11-09】语义不明（历史遗留 uuid_generate_v4() 随机值，非真实组织）。唯一账簿已收敛至 finance.core_finance_vouchers，本表停写，该列不再写入。';
COMMENT ON TABLE erp.financial_vouchers IS
    '【已弃用 2026-11-09，停写】唯一账簿 = finance.core_finance_vouchers / core_finance_voucher_lines。本表与 erp.voucher_items 不再写入，仅保留历史数据；删除留待后续迁移。';
COMMENT ON TABLE erp.voucher_items IS
    '【已弃用 2026-11-09，停写】分录唯一落点 = finance.core_finance_voucher_lines；本表停写，删除留待后续迁移。';
COMMENT ON TABLE erp.vouchers IS
    '【已弃用 2026-11-09，停写】无金额的库存凭证桩，不再写入；账务凭证唯一落点 = finance.core_finance_vouchers。';
