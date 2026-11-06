-- P3-15 删除零消费权限码（批 25 / 2026-11-06）
--
-- 删除对象：92 条「DB 有行、三端零消费」的权限码 + 其全部授权行。
--
-- 三道删除前确认（已执行并留证）：
--   ① 三端零引用：全仓 grep（FE 源码/测试、BE Rust、scripts、database/init）不截断，
--      排除定义文件（database/migrations/*、database/init/03_init_permissions.sql、
--      apps/web/src/config/permissions.ts 的 PERMISSION_DEFS 自检清单）→ 94/94 零引用。
--   ② 拼码校验反向确认：EntitySchema.permissionResource 拼出的 752 个码与删除集交集 0。
--   ③ 受影响授权：276 行（superadmin/admin 各 92，其余为 report_manager 14、
--      mes_manager 12、hrm/wms/finance/pm/qms/crm_manager 各 9、srm/lims/pdm/ehs_manager 各 3）。
--
-- 保留（本批不删，纠正批 24 的错误判断）：
--   rd:review:read / rd:release:read / rd:code:read —— 经核实为真实消费：
--     apps/web/src/modules/rd/config.ts 的 requiredPermissions（路由守卫）与 navItem.permission
--     （菜单过滤）均在使用，删除会导致 rd 三个页面入口 403 / 菜单消失。
--
-- SQL-only 未纳入本迁移（DB 无行）：finance:budget:approve、finance:report:write，
--   已在 database/init/03_init_permissions.sql 中同步移除声明。
--
-- 备份：database/backup/p3_25_20261106/core_permissions.csv（1252 行）
--       database/backup/p3_25_20261106/core_role_permissions.csv（3271 行）
--   pg_dump 因 RLS 强制策略无法导出（ERROR: query would be affected by row-level security policy），
--   改用 \copy 导出，行数与 SELECT count(*) 逐表核对一致。
--
-- 幂等：DELETE ... WHERE code IN (...) 二次执行为 0 行。
--
-- ROLLBACK（从备份恢复）：
--   1) 恢复权限码：
--      psql "$P" -c "\copy public.core_permissions FROM 'database/backup/p3_25_20261106/core_permissions.csv' WITH CSV HEADER"
--      （若主键冲突，先 DELETE 其余行或用临时表 JOIN 补齐）
--   2) 恢复授权：
--      psql "$P" -c "\copy public.core_role_permissions FROM 'database/backup/p3_25_20261106/core_role_permissions.csv' WITH CSV HEADER"
--   注意：备份为全量快照，恢复会覆盖当前表内容，务必在确认影响面后执行。

-- 1) 先删授权行（避免悬挂外键）
DELETE FROM public.core_role_permissions rp
USING public.core_permissions p
WHERE rp.permission_id = p.id
  AND p.code IN (
  'crm:opportunity:create',
  'crm:opportunity:delete',
  'crm:opportunity:update',
  'crm:sales_forecast:create',
  'crm:sales_forecast:delete',
  'crm:sales_forecast:update',
  'crm:sales_funnel:create',
  'crm:sales_funnel:delete',
  'crm:sales_funnel:update',
  'ehs:emergency:create',
  'ehs:emergency:delete',
  'ehs:emergency:update',
  'finance:budget:create',
  'finance:budget:delete',
  'finance:budget:update',
  'finance:consolidation:create',
  'finance:consolidation:delete',
  'finance:consolidation:update',
  'finance:report:create',
  'finance:report:delete',
  'finance:report:update',
  'hrm:attendance:create',
  'hrm:attendance:delete',
  'hrm:attendance:update',
  'hrm:report:create',
  'hrm:report:delete',
  'hrm:report:update',
  'hrm:training_plan:create',
  'hrm:training_plan:delete',
  'hrm:training_plan:update',
  'lims:result:create',
  'lims:result:delete',
  'lims:result:update',
  'mes:anomaly:create',
  'mes:anomaly:delete',
  'mes:anomaly:update',
  'mes:energy:create',
  'mes:energy:delete',
  'mes:energy:update',
  'mes:kanban:create',
  'mes:kanban:delete',
  'mes:kanban:update',
  'mes:traceability:create',
  'mes:traceability:delete',
  'mes:traceability:update',
  'pdm:stats:create',
  'pdm:stats:delete',
  'pdm:stats:update',
  'pm:report:create',
  'pm:report:delete',
  'pm:report:update',
  'pm:task:create',
  'pm:task:delete',
  'pm:task:update',
  'pm:template:create',
  'pm:template:delete',
  'pm:template:update',
  'qms:inspection:create',
  'qms:inspection:delete',
  'qms:inspection:update',
  'qms:nonconformance:create',
  'qms:nonconformance:delete',
  'qms:nonconformance:update',
  'qms:quality_control:create',
  'qms:quality_control:delete',
  'qms:quality_control:update',
  'report:builder:create',
  'report:builder:delete',
  'report:builder:read',
  'report:builder:update',
  'report:design:create',
  'report:design:delete',
  'report:design:read',
  'report:design:update',
  'report:schedule:create',
  'report:schedule:delete',
  'report:schedule:update',
  'report:template:create',
  'report:template:delete',
  'report:template:update',
  'srm:portal:create',
  'srm:portal:delete',
  'srm:portal:update',
  'wms:inventory_check:create',
  'wms:inventory_check:delete',
  'wms:inventory_check:update',
  'wms:report:create',
  'wms:report:delete',
  'wms:report:update',
  'wms:supplier:create',
  'wms:supplier:delete',
  'wms:supplier:update'
);

-- 2) 再删权限码
DELETE FROM public.core_permissions
WHERE code IN (
  'crm:opportunity:create',
  'crm:opportunity:delete',
  'crm:opportunity:update',
  'crm:sales_forecast:create',
  'crm:sales_forecast:delete',
  'crm:sales_forecast:update',
  'crm:sales_funnel:create',
  'crm:sales_funnel:delete',
  'crm:sales_funnel:update',
  'ehs:emergency:create',
  'ehs:emergency:delete',
  'ehs:emergency:update',
  'finance:budget:create',
  'finance:budget:delete',
  'finance:budget:update',
  'finance:consolidation:create',
  'finance:consolidation:delete',
  'finance:consolidation:update',
  'finance:report:create',
  'finance:report:delete',
  'finance:report:update',
  'hrm:attendance:create',
  'hrm:attendance:delete',
  'hrm:attendance:update',
  'hrm:report:create',
  'hrm:report:delete',
  'hrm:report:update',
  'hrm:training_plan:create',
  'hrm:training_plan:delete',
  'hrm:training_plan:update',
  'lims:result:create',
  'lims:result:delete',
  'lims:result:update',
  'mes:anomaly:create',
  'mes:anomaly:delete',
  'mes:anomaly:update',
  'mes:energy:create',
  'mes:energy:delete',
  'mes:energy:update',
  'mes:kanban:create',
  'mes:kanban:delete',
  'mes:kanban:update',
  'mes:traceability:create',
  'mes:traceability:delete',
  'mes:traceability:update',
  'pdm:stats:create',
  'pdm:stats:delete',
  'pdm:stats:update',
  'pm:report:create',
  'pm:report:delete',
  'pm:report:update',
  'pm:task:create',
  'pm:task:delete',
  'pm:task:update',
  'pm:template:create',
  'pm:template:delete',
  'pm:template:update',
  'qms:inspection:create',
  'qms:inspection:delete',
  'qms:inspection:update',
  'qms:nonconformance:create',
  'qms:nonconformance:delete',
  'qms:nonconformance:update',
  'qms:quality_control:create',
  'qms:quality_control:delete',
  'qms:quality_control:update',
  'report:builder:create',
  'report:builder:delete',
  'report:builder:read',
  'report:builder:update',
  'report:design:create',
  'report:design:delete',
  'report:design:read',
  'report:design:update',
  'report:schedule:create',
  'report:schedule:delete',
  'report:schedule:update',
  'report:template:create',
  'report:template:delete',
  'report:template:update',
  'srm:portal:create',
  'srm:portal:delete',
  'srm:portal:update',
  'wms:inventory_check:create',
  'wms:inventory_check:delete',
  'wms:inventory_check:update',
  'wms:report:create',
  'wms:report:delete',
  'wms:report:update',
  'wms:supplier:create',
  'wms:supplier:delete',
  'wms:supplier:update'
);
