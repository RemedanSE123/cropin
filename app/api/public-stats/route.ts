import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Public API endpoint for dashboard stats (no authentication required)
export async function GET() {
  try {
    // Always use direct query to get fresh data (materialized views may be stale)
    // Use case-insensitive status matching
    const statsQuery = `
      SELECT 
        COUNT(*) as total_das,
        COALESCE(SUM(total_collected_data), 0) as total_data,
        COUNT(DISTINCT reporting_manager_mobile) as total_reps,
        COUNT(CASE WHEN LOWER(status) = 'active' THEN 1 END) as active_das,
        COUNT(CASE WHEN LOWER(status) = 'inactive' THEN 1 END) as inactive_das,
        COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END) as pending_das,
        AVG(total_collected_data) as avg_data_per_da
      FROM da_users
    `;
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log('=== STATS QUERY RESULTS ===');
    console.log('Raw stats from DB:', JSON.stringify(stats, null, 2));

    // Diagnostic: Check if total_collected_data has any non-zero values
    const diagnosticQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(CASE WHEN total_collected_data > 0 THEN 1 END) as rows_with_data,
        SUM(total_collected_data) as grand_total,
        MAX(total_collected_data) as max_data,
        MIN(total_collected_data) as min_data
      FROM da_users
    `);
    console.log('=== DATABASE DIAGNOSTIC ===');
    console.log('Diagnostic data:', JSON.stringify(diagnosticQuery.rows[0], null, 2));

    // Always use direct query to get fresh data (materialized views may be stale)
    // This matches how AdminDashboard calculates it
    const regionDataQuery = `
      SELECT 
        region,
        COUNT(*) as da_count,
        COALESCE(SUM(total_collected_data), 0) as total_data
      FROM da_users
      WHERE region IS NOT NULL AND region != ''
      GROUP BY region
      ORDER BY total_data DESC
    `;
    const regionResult = await pool.query(regionDataQuery);
    console.log('Region data from direct query:', regionResult.rows.length, 'rows');
    
    // Log first few rows for debugging
    if (regionResult.rows.length > 0) {
      console.log('Sample region data:', JSON.stringify(regionResult.rows.slice(0, 3), null, 2));
      console.log('First region total_data value:', regionResult.rows[0].total_data, 'type:', typeof regionResult.rows[0].total_data);
    }

    // Always use direct query to get fresh data (materialized views may be stale)
    const zoneDataQuery = `
      SELECT 
        zone,
        COUNT(*) as da_count,
        COALESCE(SUM(total_collected_data), 0) as total_data
      FROM da_users
      WHERE zone IS NOT NULL AND zone != '' AND zone IS NOT NULL
      GROUP BY zone
      ORDER BY total_data DESC
      LIMIT 10
    `;
    const zoneResult = await pool.query(zoneDataQuery);
    console.log('Zone data from direct query:', zoneResult.rows.length, 'rows');
    
    // Log first few rows for debugging
    if (zoneResult.rows.length > 0) {
      console.log('Sample zone data:', JSON.stringify(zoneResult.rows.slice(0, 3), null, 2));
      console.log('First zone total_data value:', zoneResult.rows[0].total_data, 'type:', typeof zoneResult.rows[0].total_data);
    }

    // Get monthly trend (if you have date columns, otherwise use current data)
    const trendQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_collected_data), 0) as total_data
      FROM da_users
      GROUP BY status
    `;

    const trendResult = await pool.query(trendQuery);

    // Get top 5 DAs by data collection
    const topDAsQuery = `
      SELECT 
        name,
        region,
        zone,
        woreda,
        total_collected_data,
        status,
        reporting_manager_name
      FROM da_users
      WHERE total_collected_data > 0
      ORDER BY total_collected_data DESC
      LIMIT 5
    `;
    const topDAsResult = await pool.query(topDAsQuery);

    // Ensure proper data formatting for regions and zones
    // Handle PostgreSQL numeric types which can be strings
    const formattedRegionData = regionResult.rows.map(row => {
      const totalData = row.total_data != null ? (typeof row.total_data === 'string' ? parseFloat(row.total_data) : Number(row.total_data)) : 0;
      const daCount = row.da_count != null ? (typeof row.da_count === 'string' ? parseInt(row.da_count) : Number(row.da_count)) : 0;
      
      return {
        region: (row.region || 'Unknown').trim(),
        da_count: isNaN(daCount) ? 0 : daCount,
        total_data: isNaN(totalData) ? 0 : totalData,
      };
    });

    const formattedZoneData = zoneResult.rows.map(row => {
      const totalData = row.total_data != null ? (typeof row.total_data === 'string' ? parseFloat(row.total_data) : Number(row.total_data)) : 0;
      const daCount = row.da_count != null ? (typeof row.da_count === 'string' ? parseInt(row.da_count) : Number(row.da_count)) : 0;
      
      return {
        zone: (row.zone || 'Unknown').trim(),
        da_count: isNaN(daCount) ? 0 : daCount,
        total_data: isNaN(totalData) ? 0 : totalData,
      };
    });

    console.log('Formatted region data count:', formattedRegionData.length);
    console.log('Formatted region data sample:', JSON.stringify(formattedRegionData.slice(0, 3), null, 2));
    console.log('Formatted zone data count:', formattedZoneData.length);
    console.log('Formatted zone data sample:', JSON.stringify(formattedZoneData.slice(0, 3), null, 2));

    // Ensure proper number conversion for all stats
    const formattedStats = {
      totalDAs: stats.total_das != null ? (typeof stats.total_das === 'string' ? parseInt(stats.total_das) : Number(stats.total_das)) : 0,
      totalData: stats.total_data != null ? (typeof stats.total_data === 'string' ? parseFloat(stats.total_data) : Number(stats.total_data)) : 0,
      totalReps: stats.total_reps != null ? (typeof stats.total_reps === 'string' ? parseInt(stats.total_reps) : Number(stats.total_reps)) : 0,
      activeDAs: stats.active_das != null ? (typeof stats.active_das === 'string' ? parseInt(stats.active_das) : Number(stats.active_das)) : 0,
      inactiveDAs: stats.inactive_das != null ? (typeof stats.inactive_das === 'string' ? parseInt(stats.inactive_das) : Number(stats.inactive_das)) : 0,
      pendingDAs: stats.pending_das != null ? (typeof stats.pending_das === 'string' ? parseInt(stats.pending_das) : Number(stats.pending_das)) : 0,
      avgDataPerDA: stats.avg_data_per_da != null ? (typeof stats.avg_data_per_da === 'string' ? parseFloat(stats.avg_data_per_da) : Number(stats.avg_data_per_da)) : 0,
    };

    console.log('Formatted stats:', JSON.stringify(formattedStats, null, 2));

    return NextResponse.json({
      stats: formattedStats,
      regionData: formattedRegionData, // All regions, not just top 5
      zoneData: formattedZoneData,
      statusTrend: trendResult.rows,
      topDAs: topDAsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

