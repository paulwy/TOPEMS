-- ============================================================
-- P4: crm.audit_logs status CHECK 重加（含 'error'）
--
-- 背景：P5b（20261104110000）按 prod 实测删除 ck_audit_logs_status_standard；
--       业务决策（2026-11-05）：审计日志必须能记录失败结果，允许 'error'。
-- 值域：历史标准值 active/inactive/archived/success/failure + 运行时实际写入值
--       failed/error/pending/unknown（shared-auth 中间件、CRM handlers、SRM 审计）。
-- 数据：prod 只读核对 status 仅 17 行 success，无历史异常值，可安全加约束。
-- 方式：缺失则 ADD NOT VALID + VALIDATE；已有旧定义（不含 error）则先 DROP 再重建。
-- 幂等：约束定义已包含 error 时跳过；单事务执行，lock_timeout 5s。
-- ============================================================

SET lock_timeout = '5s';

DO $m$
BEGIN
    IF to_regclass('crm.audit_logs') IS NOT NULL THEN
        -- 旧约束存在但不含 'error'：先删除，下面按新值域重建
        IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = to_regclass('crm.audit_logs')
              AND conname = 'ck_audit_logs_status_standard'
              AND position('error' in pg_get_constraintdef(oid)) = 0
        ) THEN
            ALTER TABLE crm.audit_logs DROP CONSTRAINT ck_audit_logs_status_standard;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = to_regclass('crm.audit_logs')
              AND conname = 'ck_audit_logs_status_standard'
        ) THEN
            ALTER TABLE crm.audit_logs
                ADD CONSTRAINT ck_audit_logs_status_standard
                CHECK (
                    status IS NULL OR status IN (
                        'active', 'inactive', 'archived', 'success', 'failure',
                        'failed', 'error', 'pending', 'unknown'
                    )
                ) NOT VALID;

            ALTER TABLE crm.audit_logs
                VALIDATE CONSTRAINT ck_audit_logs_status_standard;
        END IF;
    END IF;
END $m$;

-- 终态校验：约束存在且包含 'error'
DO $m$
BEGIN
    IF to_regclass('crm.audit_logs') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('crm.audit_logs')
          AND conname = 'ck_audit_logs_status_standard'
          AND position('error' in pg_get_constraintdef(oid)) > 0
    ) THEN
        RAISE EXCEPTION 'P4 ABORT: crm.audit_logs status CHECK missing or lacks error';
    END IF;
END $m$;
