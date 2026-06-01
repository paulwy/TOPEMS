-- Migrate notifications table
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS data JSONB,
  ADD COLUMN IF NOT EXISTS priority SMALLINT,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- Copy data from old columns (if they exist)
UPDATE notifications
  SET notification_type = type
  WHERE type IS NOT NULL;

-- Drop old columns
ALTER TABLE notifications
  DROP COLUMN IF EXISTS type;

-- Set default priority
UPDATE notifications
  SET priority = 2
  WHERE priority IS NULL;

-- Make notification_type and priority not null
ALTER TABLE notifications
  ALTER COLUMN notification_type SET NOT NULL,
  ALTER COLUMN priority SET NOT NULL;
