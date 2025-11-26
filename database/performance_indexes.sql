-- Performance optimization indexes for Cropin Grow System
-- NOTE: This file contains basic indexes. For comprehensive optimization including
-- PRIMARY KEYs, constraints, covering indexes, and materialized views, 
-- please run: database/optimize_database.sql

-- Indexes for woreda_reps table
CREATE INDEX IF NOT EXISTS idx_woreda_reps_phone_number ON woreda_reps(phone_number);

-- Indexes for da_users table (most frequently queried columns)
CREATE INDEX IF NOT EXISTS idx_da_users_reporting_manager_mobile ON da_users(reporting_manager_mobile) WHERE reporting_manager_mobile IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_region ON da_users(region) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_zone ON da_users(zone) WHERE zone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_woreda ON da_users(woreda) WHERE woreda IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_contactnumber ON da_users(contactnumber);
CREATE INDEX IF NOT EXISTS idx_da_users_status ON da_users(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_name ON da_users(name);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_da_users_manager_region ON da_users(reporting_manager_mobile, region) WHERE reporting_manager_mobile IS NOT NULL AND region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_manager_zone ON da_users(reporting_manager_mobile, zone) WHERE reporting_manager_mobile IS NOT NULL AND zone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_manager_woreda ON da_users(reporting_manager_mobile, woreda) WHERE reporting_manager_mobile IS NOT NULL AND woreda IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_manager_status ON da_users(reporting_manager_mobile, status) WHERE reporting_manager_mobile IS NOT NULL AND status IS NOT NULL;

-- Indexes for aggregation queries
CREATE INDEX IF NOT EXISTS idx_da_users_region_agg ON da_users(region, total_collected_data) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_zone_agg ON da_users(zone, total_collected_data) WHERE zone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_da_users_status_agg ON da_users(status, total_collected_data) WHERE status IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE woreda_reps;
ANALYZE da_users;

