# Quick Start: Database Optimization

## One-Command Optimization

Run this SQL script to optimize your database:

```bash
# Using psql command line
psql "your_connection_string" -f database/optimize_database.sql

# Or connect to your database and run:
\i database/optimize_database.sql
```

## What This Does

✅ Adds PRIMARY KEYs (most important!)  
✅ Creates 20+ indexes for faster queries  
✅ Adds constraints for data integrity  
✅ Creates materialized views for instant stats  
✅ Updates query planner statistics  

## Expected Results

- **10-100x faster** queries
- **Instant** dashboard loading (with materialized views)
- **Better** data integrity with PRIMARY KEYs

## After Running

1. **Test your app** - Everything should be much faster
2. **Set up auto-refresh** for materialized views (see README_OPTIMIZATION.md)
3. **Monitor performance** - Check that indexes are being used

## Need Help?

See `README_OPTIMIZATION.md` for detailed documentation.

