-- Comprehensive Database Optimization Script for Cropin Grow System
-- This script adds PRIMARY KEYs, indexes, constraints, and other performance optimizations
-- Run this script to dramatically improve database query performance

-- ============================================================================
-- STEP 0: Ensure status column exists (if not already added)
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'da_users' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE da_users ADD COLUMN status VARCHAR(50) DEFAULT 'Active';
        UPDATE da_users SET status = 'Active' WHERE status IS NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 1: Add PRIMARY KEYs (Critical for performance and data integrity)
-- ============================================================================

-- Add PRIMARY KEY to woreda_reps table
-- First, check if primary key already exists and handle duplicates
DO $$ 
BEGIN
    -- Remove rows with NULL phone_number (can't be PK)
    DELETE FROM woreda_reps WHERE phone_number IS NULL;
    
    -- Remove duplicates if any exist (keep the first occurrence)
    DELETE FROM woreda_reps a USING woreda_reps b 
    WHERE a.ctid < b.ctid AND a.phone_number = b.phone_number;
    
    -- Add primary key constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'woreda_reps_pkey'
    ) THEN
        ALTER TABLE woreda_reps 
        ADD CONSTRAINT woreda_reps_pkey PRIMARY KEY (phone_number);
    END IF;
END $$;

-- Add PRIMARY KEY to da_users table
-- First, check if primary key already exists and handle duplicates
DO $$ 
BEGIN
    -- Remove rows with NULL contactnumber (can't be PK)
    DELETE FROM da_users WHERE contactnumber IS NULL;
    
    -- Remove duplicates if any exist (keep the first occurrence)
    DELETE FROM da_users a USING da_users b 
    WHERE a.ctid < b.ctid AND a.contactnumber = b.contactnumber;
    
    -- Add primary key constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'da_users_pkey'
    ) THEN
        ALTER TABLE da_users 
        ADD CONSTRAINT da_users_pkey PRIMARY KEY (contactnumber);
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add NOT NULL constraints where appropriate (improves query planning)
-- ============================================================================

-- woreda_reps constraints
-- First, handle NULL values before adding constraints
DO $$ 
BEGIN
    -- Update NULL names to a default value
    UPDATE woreda_reps SET name = 'Unknown' WHERE name IS NULL;
    
    -- phone_number is already NOT NULL if it's a PK (handled in step 1)
END $$;

-- Now add NOT NULL constraints for woreda_reps
DO $$ 
BEGIN
    -- Only add NOT NULL if column doesn't already have it and has no NULLs
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'woreda_reps' 
        AND column_name = 'name' 
        AND is_nullable = 'YES'
    ) THEN
        -- Double check no NULLs exist (shouldn't after UPDATE above)
        IF NOT EXISTS (SELECT 1 FROM woreda_reps WHERE name IS NULL) THEN
            ALTER TABLE woreda_reps ALTER COLUMN name SET NOT NULL;
        END IF;
    END IF;
END $$;

-- da_users constraints
-- First, handle NULL values before adding constraints
DO $$ 
BEGIN
    -- Update NULL names to a default value
    UPDATE da_users SET name = 'Unknown' WHERE name IS NULL;
    
    -- contactnumber is already NOT NULL if it's a PK (handled in step 1)
END $$;

-- Now add NOT NULL constraints for da_users
DO $$ 
BEGIN
    -- contactnumber is already NOT NULL if it's a PK (handled in step 1)
    
    -- Only add NOT NULL to name if column doesn't already have it and has no NULLs
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'da_users' 
        AND column_name = 'name' 
        AND is_nullable = 'YES'
    ) THEN
        -- Double check no NULLs exist (shouldn't after UPDATE above)
        IF NOT EXISTS (SELECT 1 FROM da_users WHERE name IS NULL) THEN
            ALTER TABLE da_users ALTER COLUMN name SET NOT NULL;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Add single-column indexes (for WHERE clauses and JOINs)
-- ============================================================================

-- woreda_reps indexes
CREATE INDEX IF NOT EXISTS idx_woreda_reps_phone_number 
    ON woreda_reps(phone_number);

-- da_users indexes - most frequently queried columns
CREATE INDEX IF NOT EXISTS idx_da_users_reporting_manager_mobile 
    ON da_users(reporting_manager_mobile) 
    WHERE reporting_manager_mobile IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_da_users_contactnumber 
    ON da_users(contactnumber);

CREATE INDEX IF NOT EXISTS idx_da_users_region 
    ON da_users(region) 
    WHERE region IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_da_users_zone 
    ON da_users(zone) 
    WHERE zone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_da_users_woreda 
    ON da_users(woreda) 
    WHERE woreda IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_da_users_status 
    ON da_users(status) 
    WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_da_users_name 
    ON da_users(name);

-- ============================================================================
-- STEP 4: Add composite indexes (for multi-column WHERE clauses)
-- ============================================================================

-- Common query pattern: manager + region filtering
CREATE INDEX IF NOT EXISTS idx_da_users_manager_region 
    ON da_users(reporting_manager_mobile, region) 
    WHERE reporting_manager_mobile IS NOT NULL AND region IS NOT NULL;

-- Common query pattern: manager + zone filtering
CREATE INDEX IF NOT EXISTS idx_da_users_manager_zone 
    ON da_users(reporting_manager_mobile, zone) 
    WHERE reporting_manager_mobile IS NOT NULL AND zone IS NOT NULL;

-- Common query pattern: manager + woreda filtering
CREATE INDEX IF NOT EXISTS idx_da_users_manager_woreda 
    ON da_users(reporting_manager_mobile, woreda) 
    WHERE reporting_manager_mobile IS NOT NULL AND woreda IS NOT NULL;

-- Common query pattern: manager + status filtering
CREATE INDEX IF NOT EXISTS idx_da_users_manager_status 
    ON da_users(reporting_manager_mobile, status) 
    WHERE reporting_manager_mobile IS NOT NULL AND status IS NOT NULL;

-- Common query pattern: region + zone filtering
CREATE INDEX IF NOT EXISTS idx_da_users_region_zone 
    ON da_users(region, zone) 
    WHERE region IS NOT NULL AND zone IS NOT NULL;

-- Common query pattern: zone + woreda filtering
CREATE INDEX IF NOT EXISTS idx_da_users_zone_woreda 
    ON da_users(zone, woreda) 
    WHERE zone IS NOT NULL AND woreda IS NOT NULL;

-- ============================================================================
-- STEP 5: Add covering indexes (include frequently selected columns)
-- ============================================================================

-- Covering index for common SELECT pattern: manager lookup with key fields
CREATE INDEX IF NOT EXISTS idx_da_users_manager_covering 
    ON da_users(reporting_manager_mobile) 
    INCLUDE (name, region, zone, woreda, contactnumber, status, total_collected_data)
    WHERE reporting_manager_mobile IS NOT NULL;

-- Covering index for contactnumber lookups (for updates)
CREATE INDEX IF NOT EXISTS idx_da_users_contactnumber_covering 
    ON da_users(contactnumber) 
    INCLUDE (reporting_manager_mobile, total_collected_data, status);

-- ============================================================================
-- STEP 6: Add indexes for aggregation queries (GROUP BY, ORDER BY)
-- ============================================================================

-- Index for region aggregations (used in public-stats)
CREATE INDEX IF NOT EXISTS idx_da_users_region_agg 
    ON da_users(region, total_collected_data) 
    WHERE region IS NOT NULL;

-- Index for zone aggregations (used in public-stats)
CREATE INDEX IF NOT EXISTS idx_da_users_zone_agg 
    ON da_users(zone, total_collected_data) 
    WHERE zone IS NOT NULL;

-- Index for status aggregations (used in public-stats)
CREATE INDEX IF NOT EXISTS idx_da_users_status_agg 
    ON da_users(status, total_collected_data) 
    WHERE status IS NOT NULL;

-- Index for ORDER BY name (used in da-users API)
CREATE INDEX IF NOT EXISTS idx_da_users_name_sort 
    ON da_users(name);

-- ============================================================================
-- STEP 7: Add indexes for DISTINCT queries (used in filters API)
-- ============================================================================

-- These are covered by the single-column indexes above, but we can add
-- partial indexes specifically for DISTINCT queries
CREATE INDEX IF NOT EXISTS idx_da_users_region_distinct 
    ON da_users(region) 
    WHERE region IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_da_users_zone_distinct 
    ON da_users(zone) 
    WHERE zone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_da_users_woreda_distinct 
    ON da_users(woreda) 
    WHERE woreda IS NOT NULL;

-- ============================================================================
-- STEP 8: Add functional indexes for common patterns
-- ============================================================================

-- Index for case-insensitive name searches (if needed in future)
-- CREATE INDEX IF NOT EXISTS idx_da_users_name_lower 
--     ON da_users(LOWER(name));

-- ============================================================================
-- STEP 9: Update table statistics (critical for query planner)
-- ============================================================================

ANALYZE woreda_reps;
ANALYZE da_users;

-- ============================================================================
-- STEP 10: Set table storage parameters (for large tables)
-- ============================================================================

-- Increase fillfactor for tables that are mostly read-only
-- This reduces page splits and improves read performance
ALTER TABLE da_users SET (fillfactor = 90);
ALTER TABLE woreda_reps SET (fillfactor = 90);

-- ============================================================================
-- STEP 11: Create materialized view for public stats (optional optimization)
-- ============================================================================

-- This can significantly speed up the public dashboard
-- Refresh it periodically or on data updates
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_public_stats AS
SELECT 
    COUNT(*) as total_das,
    COALESCE(SUM(total_collected_data), 0) as total_data,
    COUNT(DISTINCT reporting_manager_mobile) as total_reps,
    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_das,
    COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_das,
    COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_das,
    AVG(total_collected_data) as avg_data_per_da
FROM da_users;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_public_stats_unique 
    ON mv_public_stats(total_das);

-- Materialized view for region data (top 10)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_region_stats AS
SELECT 
    region,
    COUNT(*) as da_count,
    COALESCE(SUM(total_collected_data), 0) as total_data
FROM da_users
WHERE region IS NOT NULL
GROUP BY region
ORDER BY total_data DESC
LIMIT 10;

CREATE INDEX IF NOT EXISTS idx_mv_region_stats_region 
    ON mv_region_stats(region);

-- Materialized view for zone data (top 10)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_zone_stats AS
SELECT 
    zone,
    COUNT(*) as da_count,
    COALESCE(SUM(total_collected_data), 0) as total_data
FROM da_users
WHERE zone IS NOT NULL
GROUP BY zone
ORDER BY total_data DESC
LIMIT 10;

CREATE INDEX IF NOT EXISTS idx_mv_zone_stats_zone 
    ON mv_zone_stats(zone);

-- ============================================================================
-- STEP 12: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE woreda_reps IS 'Woreda Representatives table - stores manager information';
COMMENT ON TABLE da_users IS 'Development Agents table - stores all DA user information';
COMMENT ON INDEX idx_da_users_reporting_manager_mobile IS 'Index for filtering DAs by their reporting manager';
COMMENT ON INDEX idx_da_users_manager_covering IS 'Covering index for common manager queries - includes frequently selected columns';

-- ============================================================================
-- VERIFICATION: Check index usage (run after some queries to verify)
-- ============================================================================

-- Uncomment to check index usage statistics:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- MAINTENANCE: Refresh materialized views (run periodically)
-- ============================================================================

-- To refresh materialized views, run:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_public_stats;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_region_stats;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zone_stats;

