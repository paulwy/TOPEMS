-- BE-02 组织计数最小纠正（方案 A：物化视图）
-- 背景：BI 仪表盘 totalCompanies/totalDepartments/totalEmployees 此前为 null + orgStatsStatus=not-connected
-- （analytics 服务 schema=bi，boundary-gate allow=[] 不允许裸引 hrm.*）；
-- 组织数据真实归属 hrm（companies/departments/employees，RLS 开）。
-- 方案 A：在 bi schema 物化组织计数快照——analytics 只读自己 schema 的物化视图，不违反边界。
-- 物化视图为静态快照：需刷新（REFRESH MATERIALIZED VIEW bi.org_stats），见 ensure-bi-org-stats.sh。
-- 语义：全租户合计（仪表盘为全局组织规模视图，与 core_users 超管口径一致）；
-- 计数排除软删（deleted_at IS NOT NULL）。
-- 幂等：IF NOT EXISTS + 重建时 DROP。

CREATE MATERIALIZED VIEW IF NOT EXISTS bi.org_stats AS
SELECT
  (SELECT COUNT(*) FROM hrm.companies WHERE deleted_at IS NULL)      AS companies,
  (SELECT COUNT(*) FROM hrm.departments WHERE deleted_at IS NULL)   AS departments,
  (SELECT COUNT(*) FROM hrm.employees WHERE deleted_at IS NULL)     AS employees,
  NOW() AS refreshed_at;
