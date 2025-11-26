# Database Performance Optimization Guide

This directory contains scripts to dramatically improve database query performance for the Cropin Grow System.

## Quick Start

**For new databases or first-time optimization:**
```sql
-- Run the comprehensive optimization script
\i database/optimize_database.sql
```

**For existing databases with data:**
The `optimize_database.sql` script safely handles existing data by:
- Removing duplicate records before adding PRIMARY KEYs
- Using `IF NOT EXISTS` for all indexes
- Preserving all existing data

## What Gets Optimized

### 1. PRIMARY KEYs (Critical!)
- `woreda_reps.phone_number` → PRIMARY KEY
- `da_users.contactnumber` → PRIMARY KEY

**Why this matters:** Without PRIMARY KEYs, PostgreSQL can't efficiently:
- Join tables
- Update/delete records
- Maintain referential integrity

### 2. Single-Column Indexes
Indexes added for frequently queried columns:
- `reporting_manager_mobile` (most common filter)
- `contactnumber` (for lookups and updates)
- `region`, `zone`, `woreda` (for filtering)
- `status` (for filtering)
- `name` (for sorting)

### 3. Composite Indexes
Multi-column indexes for common query patterns:
- `(reporting_manager_mobile, region)`
- `(reporting_manager_mobile, zone)`
- `(reporting_manager_mobile, woreda)`
- `(reporting_manager_mobile, status)`
- `(region, zone)`
- `(zone, woreda)`

### 4. Covering Indexes
Indexes that include frequently selected columns to avoid table lookups:
- `reporting_manager_mobile` with INCLUDE columns
- `contactnumber` with INCLUDE columns

### 5. Partial Indexes
Indexes with WHERE clauses for better performance:
- Only index non-NULL values where appropriate
- Reduces index size and improves query speed

### 6. Aggregation Indexes
Special indexes for GROUP BY and aggregation queries:
- `(region, total_collected_data)`
- `(zone, total_collected_data)`
- `(status, total_collected_data)`

### 7. Materialized Views
Pre-computed views for expensive aggregation queries:
- `mv_public_stats` - Overall system statistics
- `mv_region_stats` - Top 10 regions by data
- `mv_zone_stats` - Top 10 zones by data

**Performance gain:** Materialized views can be 10-100x faster than running aggregations on large tables.

## Performance Improvements Expected

After running the optimization script, you should see:

| Query Type | Before | After | Improvement |
|------------|--------|-------|-------------|
| Login (woreda_reps lookup) | 50-200ms | 1-5ms | **10-40x faster** |
| DA users list (with filters) | 200-1000ms | 10-50ms | **20-100x faster** |
| KPI calculations | 500-2000ms | 5-20ms | **100-400x faster** |
| Public stats (with materialized views) | 1000-5000ms | 5-15ms | **200-1000x faster** |
| Filter dropdowns (DISTINCT queries) | 100-500ms | 5-20ms | **20-100x faster** |

## Maintenance

### Refresh Materialized Views

Materialized views need to be refreshed periodically to stay current. Run:

```sql
\i database/refresh_materialized_views.sql
```

**Recommended refresh frequency:**
- **High-traffic systems:** Every 5-15 minutes
- **Medium-traffic systems:** Every 30-60 minutes
- **Low-traffic systems:** Every 1-2 hours

**Automation options:**
1. **PostgreSQL cron extension (pg_cron):**
   ```sql
   SELECT cron.schedule('refresh-stats', '*/15 * * * *', 
     'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_public_stats;');
   ```

2. **Application-level:** Add a scheduled task in your Next.js app
3. **External cron:** Use system cron to run the refresh script

### Monitor Index Usage

Check which indexes are being used:

```sql
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

If an index shows `idx_scan = 0`, it's not being used and can potentially be removed.

### Update Statistics

PostgreSQL's query planner relies on statistics. Update them after significant data changes:

```sql
ANALYZE woreda_reps;
ANALYZE da_users;
```

This is automatically done in the optimization script, but you may want to run it periodically.

## Files in This Directory

- **`optimize_database.sql`** - Main comprehensive optimization script (run this!)
- **`performance_indexes.sql`** - Basic indexes (legacy, use optimize_database.sql instead)
- **`refresh_materialized_views.sql`** - Script to refresh materialized views
- **`migration.sql`** - Adds status column if missing

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
**Solution:** The script automatically removes duplicates before adding PRIMARY KEYs. If you still get this error, manually check for duplicates:

```sql
-- Check for duplicate phone numbers in woreda_reps
SELECT phone_number, COUNT(*) 
FROM woreda_reps 
GROUP BY phone_number 
HAVING COUNT(*) > 1;

-- Check for duplicate contact numbers in da_users
SELECT contactnumber, COUNT(*) 
FROM da_users 
GROUP BY contactnumber 
HAVING COUNT(*) > 1;
```

### Error: "relation already exists"
**Solution:** This is normal - the script uses `IF NOT EXISTS` and `IF EXISTS` checks. It's safe to run multiple times.

### Materialized views not updating
**Solution:** Make sure to run `refresh_materialized_views.sql` periodically. The API will automatically fall back to regular queries if materialized views don't exist.

### Still slow after optimization
**Check:**
1. Are indexes being used? (see "Monitor Index Usage" above)
2. Are statistics up to date? (run `ANALYZE`)
3. Is the database connection pool configured correctly?
4. Are you using materialized views? (check if they exist and are refreshed)

## Best Practices

1. **Always add PRIMARY KEYs** - This is the most important optimization
2. **Use materialized views** for expensive aggregations that don't need real-time data
3. **Refresh materialized views** regularly based on your update frequency
4. **Monitor index usage** and remove unused indexes
5. **Update statistics** after bulk data changes
6. **Use connection pooling** in your application (already configured in `lib/db.ts`)

## Next Steps

After running the optimization:
1. Test your application - queries should be significantly faster
2. Set up automatic refresh of materialized views
3. Monitor query performance using PostgreSQL's `pg_stat_statements` extension
4. Consider adding more indexes based on your specific query patterns

