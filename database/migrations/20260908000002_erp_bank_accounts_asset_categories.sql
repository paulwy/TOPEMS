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

-- 2026-09-18 防御化（空库重建链卡点）：若 erp.bank_accounts 仅为 business_base_tables 建的 2 列裸骨架
-- （无 status 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='erp' AND table_name='bank_accounts')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='bank_accounts' AND column_name='status')
  THEN
    DROP TABLE erp.bank_accounts;
  END IF;
END $skel$;

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

-- 存量库兼容：旧版 bank_accounts 无 is_default 列（补列后再建索引）
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON erp.bank_accounts (is_default);

-- 2026-09-18 防御化（空库重建链卡点）：若 erp.asset_categories 仅为 business_base_tables 建的 2 列裸骨架
-- （无 name 列）则 DROP 重建（骨架无数据）；结构完整则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='erp' AND table_name='asset_categories')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='asset_categories' AND column_name='name')
  THEN
    DROP TABLE erp.asset_categories;
  END IF;
END $skel$;

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
