-- Migration: Add social media fields to users table
-- Date: 2025-11-15
-- Purpose: Support self-built social task verification (Twitter, Discord, Telegram)

-- Add Twitter fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(100);

-- Add Discord fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username VARCHAR(100);

-- Add Telegram fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);

-- Rollback script (if needed):
-- DROP INDEX IF EXISTS idx_users_twitter_id;
-- DROP INDEX IF EXISTS idx_users_discord_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS twitter_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS twitter_username;
-- ALTER TABLE users DROP COLUMN IF EXISTS discord_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS discord_username;
-- ALTER TABLE users DROP COLUMN IF EXISTS telegram_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS telegram_username;
