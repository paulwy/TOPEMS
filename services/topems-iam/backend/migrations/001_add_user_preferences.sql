-- Migration: Add user preferences and avatar support
-- Description: Add user_preferences table and avatar_url column to users table

-- Add avatar_url column to users table (if not exists)
ALTER TABLE iam.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN iam.users.avatar_url IS 'User avatar URL';

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS iam.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES iam.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE iam.user_preferences IS 'User preferences and settings';
COMMENT ON COLUMN iam.user_preferences.user_id IS 'Reference to user';
COMMENT ON COLUMN iam.user_preferences.preferences IS 'JSON containing notification settings, shortcuts, language, timezone, etc.';

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON iam.user_preferences(user_id);

-- Add updated_at index
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON iam.user_preferences(updated_at);
