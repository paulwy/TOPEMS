-- P5 B4：pm.projects 结算字段（项目收入按结算确认）
--
-- 背景：pm.projects 只有 budget，没有结算额/结算时间/结算人，导致项目收入断链
--      （PmProjectSettled 事件没有真实金额来源）。本迁移只补字段，不造数据。
-- 口径：
--   settled_amount numeric(15,2) —— 与 budget 同精度，金额不用浮点；
--   settled_at     timestamptz   —— 结算确认时刻（与 start_date/end_date 一致用 tz 类型）；
--   settled_by     varchar(100)  —— 与 created_by 同型，存操作人标识。
-- 幂等：ADD COLUMN IF NOT EXISTS，二跑零变更；可空，不回填、不设假默认值。

DO $$
BEGIN
    IF to_regclass('pm.projects') IS NULL THEN
        RAISE NOTICE 'pm.projects 不存在，跳过结算字段补列';
        RETURN;
    END IF;

    EXECUTE 'ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS settled_amount numeric(15,2)';
    EXECUTE 'ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS settled_at timestamptz';
    EXECUTE 'ALTER TABLE pm.projects ADD COLUMN IF NOT EXISTS settled_by varchar(100)';
END $$;

COMMENT ON COLUMN pm.projects.settled_amount IS '项目结算额（按结算确认的收入），NULL 表示未结算';
COMMENT ON COLUMN pm.projects.settled_at IS '项目结算确认时间，NULL 表示未结算';
COMMENT ON COLUMN pm.projects.settled_by IS '执行结算确认的操作人标识';
