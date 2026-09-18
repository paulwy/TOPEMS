-- ================================================================================
-- 20260826000000_restore_legacy_accounting_subjects.sql
-- 空库重建遗留表恢复（V321 迁移的源表）
-- ================================================================================
-- 背景（2026-09-18 全链验证发现）：20260827000002_v321_accounting_subjects_migration
-- 将 accounting_subjects 从 plugin_erp 迁移到 plugin_finance，其 INSERT...SELECT
-- FROM plugin_erp.accounting_subjects 在解析期即要求源表存在（WHERE EXISTS 防御
-- 无法阻止 FROM 解析失败），而空库重建时该遗留表从未创建（5432 上它位于 erp schema，
-- plugin_erp 位置在任何库中都不存在）。
-- 本迁移在 V321 之前以 V321 目标结构（14 列）恢复 plugin_erp.accounting_subjects
-- 空表，使 V321 的 INSERT...SELECT 可解析（0 行数据），随后 V321 自行 DROP。
-- 幂等：CREATE TABLE IF NOT EXISTS。仅作用于空库重建路径（5432 不应用）。
-- ================================================================================

CREATE TABLE IF NOT EXISTS plugin_erp.accounting_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    level INTEGER NOT NULL DEFAULT 1,
    parent_code VARCHAR(50),
    description TEXT,
    is_cash_flow BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    tenant_id UUID
);
