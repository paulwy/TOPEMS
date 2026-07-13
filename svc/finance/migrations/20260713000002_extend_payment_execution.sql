-- 扩展付款单表，添加付款执行相关字段
ALTER TABLE IF EXISTS core_finance_payments 
ADD COLUMN IF NOT EXISTS bank_transaction_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS executed_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP;

-- 扩展付款核销明细表，添加核销状态和关联字段
ALTER TABLE IF EXISTS core_finance_payment_items 
ADD COLUMN IF NOT EXISTS write_off_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS write_off_amount NUMERIC(18,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS write_off_date DATE;
