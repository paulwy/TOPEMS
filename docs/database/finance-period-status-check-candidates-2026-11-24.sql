-- B252：finance.core_finance_periods.status 收敛到 PeriodStatus 三态
-- 该列已是原生枚举 period_status（open/closing/closed），DB 本身拒绝枚举外值；
-- 这里再落一条 CHECK，用于锁定枚举扩展（例如未来有人 ADD VALUE 'locked'）
-- 并让状态盘点器能识别该列已受显式约束。当前 1489 行全部为 open，NOT VALID 应用安全。

ALTER TABLE finance.core_finance_periods
    ADD CONSTRAINT ck_core_finance_periods_status_standard
    CHECK (
        (status)::text = ANY (ARRAY['open'::text, 'closing'::text, 'closed'::text])
    ) NOT VALID;
