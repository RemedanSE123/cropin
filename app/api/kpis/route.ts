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

export async function GET(request: NextRequest) {
  try {
    const phoneNumber = getWoredaRepPhone(request);
    const admin = isAdmin(request);

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

