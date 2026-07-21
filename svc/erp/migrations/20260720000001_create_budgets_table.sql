-- Make organization_id nullable in erp.budgets table
ALTER TABLE IF EXISTS erp.budgets ALTER COLUMN organization_id DROP NOT NULL;