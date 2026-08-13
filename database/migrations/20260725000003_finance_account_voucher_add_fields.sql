-- V63.4 B-3: Finance Account/Voucher 字段补齐
-- 为 core_finance_accounts / core_finance_vouchers 表添加前端期望的缺失字段
-- 可重复执行（IF NOT EXISTS）
--
-- 注意：实际表名为 core_finance_accounts / core_finance_vouchers（非 accounts/vouchers），
--       与 svc/finance/src/services/finance/{account,voucher}.rs 中的 SQL 保持一致。

-- ============================================
-- 0. 扩展 voucher_status 枚举类型，新增 reversed 值
-- ============================================
ALTER TYPE voucher_status ADD VALUE IF NOT EXISTS 'reversed';

-- ============================================
-- 1. Account 表（core_finance_accounts）新增字段
-- ============================================
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS full_name VARCHAR(500);
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS balance_direction VARCHAR(20);
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS parent_code VARCHAR(50);
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS haschildren BOOLEAN DEFAULT FALSE;
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS is_cash_flow BOOLEAN DEFAULT FALSE;
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS enable_quantity BOOLEAN DEFAULT FALSE;
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS enable_foreign_currency BOOLEAN DEFAULT FALSE;
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS default_currency VARCHAR(10);
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS is_detail BOOLEAN DEFAULT FALSE;
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS isactive BOOLEAN DEFAULT TRUE;
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE core_finance_accounts ADD COLUMN IF NOT EXISTS updated_by UUID;

-- ============================================
-- 2. Voucher 表（core_finance_vouchers）新增字段
-- ============================================
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS voucher_number VARCHAR(100);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS month INTEGER;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS total_amount DECIMAL(18,2);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'CNY';
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS submitter_id UUID;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS maker_id UUID;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS maker_name VARCHAR(255);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS approver_id UUID;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS approver_name VARCHAR(255);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS checker_id UUID;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS checker_name VARCHAR(255);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS poster_id UUID;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS poster_name VARCHAR(255);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS bookkeeper_id UUID;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS bookkeeper_name VARCHAR(255);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS reverse_voucher_id UUID;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS source_module VARCHAR(50);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS source_id VARCHAR(100);
ALTER TABLE core_finance_vouchers ADD COLUMN IF NOT EXISTS updated_by UUID;

-- ============================================
-- 3. 索引（若不存在则创建）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounts_parent_code ON core_finance_accounts(parent_code);
CREATE INDEX IF NOT EXISTS idx_vouchers_year_month ON core_finance_vouchers(year, month);
CREATE INDEX IF NOT EXISTS idx_vouchers_submitter ON core_finance_vouchers(submitter_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON core_finance_vouchers(status);
