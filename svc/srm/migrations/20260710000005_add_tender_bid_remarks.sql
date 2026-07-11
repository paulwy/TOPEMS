-- Add remarks column to tender_bids table
ALTER TABLE plugin_srm.tender_bids
ADD COLUMN IF NOT EXISTS remarks TEXT;
