ALTER TABLE quality_standards ADD COLUMN IF NOT EXISTS effective_date TIMESTAMP;
ALTER TABLE quality_standards ADD COLUMN IF NOT EXISTS inspection_type VARCHAR(64);
ALTER TABLE quality_standard_values ADD COLUMN IF NOT EXISTS inspection_method VARCHAR(256);