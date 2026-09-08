-- =============================================================
-- 20260908000002: ERP 银行账户 + 资产分类表（第一批-② 前后端对应性修复）
-- =============================================================
-- 背景：前端 bankAccountApi / assetCategoryApi 已存在完整契约
--       （/bank-accounts、/asset-categories 各 5 方法），但后端
--       svc/erp 无对应路由（前后端映射审计 P0 项）。
-- 本迁移建立 erp.bank_accounts 与 erp.asset_categories 两张业务表，
-- 供 svc/erp 新模块 bank_account.rs / asset_category.rs 使用。
-- 注意：asset_categories.parent_id 自引用树形结构；响应层将
--       parent_id 映射为前端契约字段 parentId（驼峰）。
-- =============================================================

CREATE SCHEMA IF NOT EXISTS erp;

CREATE TABLE IF NOT EXISTS erp.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    bank_code TEXT,
    currency TEXT DEFAULT 'CNY',
    balance DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON erp.bank_accounts (status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON erp.bank_accounts (is_default);

CREATE TABLE IF NOT EXISTS erp.asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES erp.asset_categories (id) ON DELETE SET NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_categories_parent_id ON erp.asset_categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_asset_categories_status ON erp.asset_categories (status);
