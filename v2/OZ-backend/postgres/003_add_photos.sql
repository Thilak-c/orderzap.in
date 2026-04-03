-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- OrderZap — Migration: Add Photos
-- Database: OZ-T (PostgreSQL 16)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(1000);
