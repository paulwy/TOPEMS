-- 2026-10-15 修复 finance 异步投影器 schema 告警
-- 现象：AsyncProjector run error: column "tenant_id" of relation "cqrs_projection_progress" does not exist
-- 根因：RLS 方案 C 批为 finance 写路径引入租户约束（INSERT 含 tenant_id），
--       但 cqrs_projection_progress 建表（20260915000001）未含 tenant_id 列。
-- 修复：幂等补列（RLS 绑租户要求该列存在；空库/已建库均可安全重放）。
ALTER TABLE finance.cqrs_projection_progress
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 索引：投影进度按租户隔离的常规查询路径（view_name + tenant_id）
CREATE INDEX IF NOT EXISTS idx_cqrs_projection_progress_tenant
    ON finance.cqrs_projection_progress (tenant_id, view_name);
