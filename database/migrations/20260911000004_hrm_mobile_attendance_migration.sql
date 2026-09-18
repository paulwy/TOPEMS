-- HRM Mobile-BFF 考勤数据迁移脚本
-- 从 mobile.mobile_attendance 迁移到 hrm.attendance_records
--
-- 迁移阶段：
-- 1. 数据映射：user_id → employee_id（通过 hrm.employees 表）
-- 2. 字段转换：text → date/time，经纬度 → location
-- 3. 数据导入：INSERT ... SELECT ... WHERE NOT EXISTS
-- 4. 验证：行数比对 + 抽样校验

-- ===== 阶段 0: 防御化补列（2026-09-18 空库重建链卡点）=====
-- hrm.attendance_records 在空库重建路径缺 organization_id（5432 权威 18 列含该列）；
-- INSERT 引用该列，先幂等补列。
ALTER TABLE hrm.attendance_records ADD COLUMN IF NOT EXISTS organization_id uuid;

-- ===== 阶段 1: 数据迁移（幂等，可重复执行）=====

INSERT INTO hrm.attendance_records (
    id,
    organization_id,
    employee_id,
    date,
    check_in_time,
    check_out_time,
    check_in_location,
    check_out_location,
    status,
    work_hours,
    notes,
    created_at,
    updated_at,
    tenant_id
)
SELECT
    m.id,
    e.org_id AS organization_id,  -- 2026-09-18 防御化：5433 的 hrm.employees 无 organization_id（用 org_id）
    e.id AS employee_id,
    m.date::date,
    m.check_in_time::time,
    m.check_out_time::time,
    COALESCE(m.check_in_address, '') AS check_in_location,
    COALESCE(m.check_out_address, '') AS check_out_location,
    COALESCE(m.status, 'normal') AS status,
    -- 计算工作时长（小时）
    CASE
        WHEN m.check_in_time IS NOT NULL AND m.check_out_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (m.check_out_time::time - m.check_in_time::time)) / 3600.0
        ELSE NULL
    END AS work_hours,
    '从 mobile.mobile_attendance 迁移' AS notes,
    m.created_at,
    COALESCE(m.updated_at, m.created_at) AS updated_at,
    e.tenant_id
FROM mobile.mobile_attendance m
JOIN hrm.employees e ON e.user_id = m.user_id::uuid  -- 2026-09-18 防御化：mobile.user_id 为 varchar，加 cast
WHERE NOT EXISTS (
    SELECT 1 FROM hrm.attendance_records ar
    WHERE ar.employee_id = e.id AND ar.date = m.date::date
)
AND m.deleted_at IS NULL;

-- ===== 阶段 2: 验证 =====

-- 验证迁移行数
DO $$
DECLARE
    mobile_count INTEGER;
    hrm_count INTEGER;
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mobile_count FROM mobile.mobile_attendance WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO hrm_count FROM hrm.attendance_records WHERE notes LIKE '%从 mobile.mobile_attendance 迁移%';

    RAISE NOTICE '迁移验证：mobile 表记录数=%, hrm 表迁移记录数=%', mobile_count, hrm_count;

    IF mobile_count > 0 AND hrm_count = 0 THEN
        RAISE WARNING '警告：mobile 表有数据但 hrm 表无迁移记录，请检查 user_id 映射';
    END IF;
END $$;

-- ===== 阶段 3: 旧表处理（确认无引用后执行）=====
-- 注意：执行前请确认 mobile 服务已不再使用 mobile_attendance 表
--
-- -- 将旧表重命名为备份（保留 30 天）
-- ALTER TABLE mobile.mobile_attendance RENAME TO mobile_attendance_backup_20260911;
--
-- -- 30 天后确认无问题再删除
-- DROP TABLE IF EXISTS mobile.mobile_attendance_backup_20260911;
