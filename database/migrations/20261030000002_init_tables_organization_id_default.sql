-- 初始化流程修复（2026-10-30 生产排障）：hrm 初始化步骤（departments/positions 及
-- 初始化日志）的 handler INSERT 语句未包含 organization_id 列，而该列 NOT NULL 且
-- 无默认值，导致"提交公司信息/部门/岗位"必现 500。
-- 语义对齐：初始化阶段组织归属 = DEFAULT_ORG_ID（与 companies.tenant_id 默认
-- '00000000-0000-0000-0000-000000000001' 及 setup handler 的 org_id 取值一致）。
ALTER TABLE "hrm"."departments" ALTER COLUMN "organization_id" SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "hrm"."positions" ALTER COLUMN "organization_id" SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE "hrm"."initialization_logs" ALTER COLUMN "organization_id" SET DEFAULT '00000000-0000-0000-0000-000000000001';
