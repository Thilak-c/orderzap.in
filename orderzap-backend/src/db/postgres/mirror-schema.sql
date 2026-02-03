-- ============================================
-- CONVEX → POSTGRESQL MIRROR SCHEMA
-- Full data mirroring with soft deletes
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-generate-v4";

-- ============================================
-- SYNC LOG TABLE (Track all sync operations)
-- ============================================
CREAT