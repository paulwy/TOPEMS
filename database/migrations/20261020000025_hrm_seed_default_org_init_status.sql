-- ============================================================================
-- 20261020000025_hrm_seed_default_org_init_status.sql
--
-- P0-2 向导新库自洽（1/2）：为默认组织幂等播种初始化五步待办行。
--
-- 背景：
--   多步初始化向导的进度读取（GET /api/hrm/setup/progress）与各步完成回写都
--   围绕 hrm.initialization_status 的 (organization_id, step_name) 行展开；
--   干净新库该表为空时，进度接口空集会被误判（all()=true → 已完成、
--   current_step 兜底 5），且各步 UPDATE 找不到行等于静默不生效。
--   本迁移为默认组织（setup.rs 内 DEFAULT_ORG_ID = 0001）补齐 5 条 pending 行。
--
-- 步骤清单（与 setup.rs 各步回写的 step_name 对齐）：
--   1 company_info  公司信息
--   2 departments   部门
--   3 positions     职位
--   4 admin_user    管理员账号
--   5 completion    完成向导
--
-- 幂等保证：
--   - 该表 (organization_id, step_name) 无唯一索引，无法用 ON CONFLICT，
--     故采用 NOT EXISTS 守卫逐行插入；干净重放与存量库都不重复、不覆盖
--     用户已推进的进度（已 completed 的行不会被改回 pending）。
--   - 不播种默认公司行：公司行由 setup_company_info 的 upsert 首次调用时
--     无则 INSERT 自动创建，避免写入无意义的占位公司名。
-- ============================================================================

INSERT INTO hrm.initialization_status
    (tenant_id, organization_id, step_name, step_order, status, created_at, updated_at)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    v.step_name,
    v.step_order,
    'pending',
    NOW(),
    NOW()
FROM (VALUES
    ('company_info',  1),
    ('departments',   2),
    ('positions',     3),
    ('admin_user',    4),
    ('completion',    5)
) AS v(step_name, step_order)
WHERE NOT EXISTS (
    SELECT 1
    FROM hrm.initialization_status s
    WHERE s.organization_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND s.step_name = v.step_name
);
