-- Add score columns to tender_bids table
ALTER TABLE plugin_srm.tender_bids
ADD COLUMN IF NOT EXISTS technical_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS commercial_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS total_score NUMERIC(5,2);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tender_bids_total_score ON plugin_srm.tender_bids(total_score);
