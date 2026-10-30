-- ehs.safety_checks 补齐 handler 已引用但建表缺失的 5 列
-- 成因：20260725000000 建表仅 id，20261027130000 补了 check_no 等 8 列，
-- 但 handler（svc/ehs/src/modules/safety.rs）的 SELECT/INSERT/UPDATE 还引用
-- check_date/location/result/issues/attachments 5 列，生产库从未补过 → relation/column 不存在 → 500
-- 以 handler+前端契约为源补列（safetyCheck.ts 使用这些字段）
-- 幂等：ADD COLUMN IF NOT EXISTS

ALTER TABLE ehs.safety_checks
    ADD COLUMN IF NOT EXISTS check_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS result TEXT,
    ADD COLUMN IF NOT EXISTS issues JSONB,
    ADD COLUMN IF NOT EXISTS attachments JSONB;
