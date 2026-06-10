-- Migration: Create attachments table for mail service
-- Date: 2026-06-11

-- Create attachments table
CREATE TABLE IF NOT EXISTS mail.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES mail.emails(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,           -- System filename (unique)
    original_filename VARCHAR(500) NOT NULL,   -- Original uploaded filename
    file_path VARCHAR(1000) NOT NULL,         -- Full path to stored file
    file_size BIGINT NOT NULL,                -- File size in bytes
    content_type VARCHAR(100) NOT NULL,        -- MIME type
    created_by UUID,                          -- User who uploaded
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE mail.attachments IS 'Mail attachment storage';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mail_attachments_email_id ON mail.attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_mail_attachments_filename ON mail.attachments(filename);
CREATE INDEX IF NOT EXISTS idx_mail_attachments_created_at ON mail.attachments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_attachments_created_by ON mail.attachments(created_by);

-- Create update trigger function
CREATE OR REPLACE FUNCTION mail.update_attachment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update trigger
DROP TRIGGER IF EXISTS update_mail_attachment_timestamp ON mail.attachments;
CREATE TRIGGER update_mail_attachment_timestamp
    BEFORE UPDATE ON mail.attachments
    FOR EACH ROW
    EXECUTE FUNCTION mail.update_attachment_timestamp();

-- Grant permissions (for development)
-- In production, adjust according to your security requirements
GRANT USAGE ON SCHEMA mail TO topems_dev;
GRANT ALL PRIVILEGES ON TABLE mail.attachments TO topems_dev;
