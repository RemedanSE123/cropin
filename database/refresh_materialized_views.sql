-- Script to refresh materialized views
-- Run this periodically (e.g., via cron job or scheduled task) to keep stats up to date
-- For production, consider refreshing every 5-15 minutes depending on update frequency

-- Refresh all materialized views concurrently (non-blocking)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_public_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_region_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zone_stats;

-- Note: CONCURRENTLY requires unique indexes on the materialized views
-- These are created in optimize_database.sql

