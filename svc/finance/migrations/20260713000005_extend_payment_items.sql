ALTER TABLE core_finance_payment_items
ADD COLUMN payable_id UUID;

ALTER TABLE core_finance_payment_items
ADD COLUMN payable_amount NUMERIC(18,4) DEFAULT 0;

ALTER TABLE core_finance_payment_items
ADD COLUMN write_off_amount NUMERIC(18,4) DEFAULT 0;

ALTER TABLE core_finance_payment_items
ADD COLUMN write_off_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE core_finance_payment_items
ADD COLUMN write_off_date TIMESTAMP;

ALTER TABLE core_finance_payment_items
ADD COLUMN write_off_by VARCHAR(100);

ALTER TABLE core_finance_payment_items
ADD COLUMN remaining_amount NUMERIC(18,4) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payment_items_payable_id ON core_finance_payment_items(payable_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_write_off_status ON core_finance_payment_items(write_off_status);
