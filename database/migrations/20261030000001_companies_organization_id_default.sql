-- 修复：hrm.companies.organization_id 为 NOT NULL 且无默认值，而
-- svc/hrm modules/setup.rs setup_company_info 的 INSERT 语句未包含该列，
-- 初始化"提交公司信息"必现 500 内部服务器错误（2026-10-30 生产排障定位）。
-- 语义对齐：初始化阶段的公司组织归属 = DEFAULT_ORG_ID（与 tenant_id 列默认值
-- '00000000-0000-0000-0000-000000000001' 一致，同 handler 内 org_id 取值）。
ALTER TABLE "hrm"."companies" ALTER COLUMN "organization_id" SET DEFAULT '00000000-0000-0000-0000-000000000001';
