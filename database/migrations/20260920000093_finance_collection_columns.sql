-- 000093: finance.erp_collection_records 补代码引用剩余列（sales-collections export/detail）
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS collection_no text;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS collection_date date;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS remark text;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS deleted_at timestamptz with time zone;
