import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to get woreda rep phone number from token
function getWoredaRepPhone(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    return decoded.phoneNumber || null;
  } catch {
    return null;
  }
}

// Helper function to check if user is admin
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    return decoded.isAdmin === true || decoded.phoneNumber === 'Admin@123' || decoded.phoneNumber === 'Admin123';
  } catch {
    return false;
  }
}

// Helper function to check if user is regional manager and get their region
function getRegionalManagerInfo(request: NextRequest): { isRegionalManager: boolean; region: string | null } {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { isRegionalManager: false, region: null };
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.isRegionalManager === true && decoded.region) {
      return { isRegionalManager: true, region: decoded.region };
    }
    return { isRegionalManager: false, region: null };
  } catch (error) {
    console.error('Error decoding token for regional manager:', error);
    return { isRegionalManager: false, region: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    const phoneNumber = getWoredaRepPhone(request);
    const admin = isAdmin(request);
    const regionalManagerInfo = getRegionalManagerInfo(request);

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Optimized: Single query for both rep and global KPIs
    if (admin) {
      // Admin sees all data
      const globalResult = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(total_data_collected), 0) as total 
         FROM da_users`
      );

      return NextResponse.json({
        repTotalDAs: parseInt(globalResult.rows[0].count),
        repTotalData: parseInt(globalResult.rows[0].total),
        globalTotalDAs: parseInt(globalResult.rows[0].count),
        globalTotalData: parseInt(globalResult.rows[0].total),
      });
    } else if (regionalManagerInfo.isRegionalManager && regionalManagerInfo.region) {
      // Regional Manager - get KPIs for their region
      // First, try to find the exact region name in the database (case-insensitive)
      let regionQuery = '';
      let regionParams: any[] = [];
      
      try {
        const regionCheck = await pool.query(
          'SELECT DISTINCT region FROM da_users WHERE LOWER(TRIM(region)) = LOWER(TRIM($1)) LIMIT 1',
          [regionalManagerInfo.region]
        );
        
        if (regionCheck.rows.length > 0) {
          // Use the actual region name from database
          regionQuery = `WHERE region = $1`;
          regionParams = [regionCheck.rows[0].region];
        } else {
          // Fallback to case-insensitive matching
          regionQuery = `WHERE LOWER(TRIM(region)) = LOWER(TRIM($1))`;
          regionParams = [regionalManagerInfo.region];
        }
      } catch (err) {
        // Fallback to case-insensitive matching if query fails
        regionQuery = `WHERE LOWER(TRIM(region)) = LOWER(TRIM($1))`;
        regionParams = [regionalManagerInfo.region];
      }

      // Get region-specific KPIs and global KPIs
      const [regionResult, globalResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(total_data_collected), 0) as total 
           FROM da_users 
           ${regionQuery}`,
          regionParams
        ),
        pool.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(total_data_collected), 0) as total 
           FROM da_users`
        )
      ]);

      return NextResponse.json({
        repTotalDAs: parseInt(regionResult.rows[0].count),
        repTotalData: parseInt(regionResult.rows[0].total),
        globalTotalDAs: parseInt(globalResult.rows[0].count),
        globalTotalData: parseInt(globalResult.rows[0].total),
      });
    } else {
      // Woreda Rep - optimized query with index
      const [repResult, globalResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(total_data_collected), 0) as total 
           FROM da_users 
           WHERE reporting_manager_mobile = $1`,
          [phoneNumber]
        ),
        pool.query(
          `SELECT COUNT(*) as count, COALESCE(SUM(total_data_collected), 0) as total 
           FROM da_users`
        )
      ]);

      return NextResponse.json({
        repTotalDAs: parseInt(repResult.rows[0].count),
        repTotalData: parseInt(repResult.rows[0].total),
        globalTotalDAs: parseInt(globalResult.rows[0].count),
        globalTotalData: parseInt(globalResult.rows[0].total),
      });
    }
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

