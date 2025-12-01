import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Diagnostic endpoint to check if woreda_managers table exists and has data
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'woreda_managers'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
      return NextResponse.json({
        tableExists: false,
        message: 'woreda_managers table does not exist. Please run the migration script.',
        recommendation: 'Create the table using the migration script or fallback to old login method will be used.'
      });
    }

    // Check table structure
    const structureCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'woreda_managers'
      ORDER BY ordinal_position;
    `);

    // Count records
    const countResult = await pool.query('SELECT COUNT(*) as count FROM woreda_managers');
    const recordCount = parseInt(countResult.rows[0].count);

    // Get sample records (first 5)
    const sampleResult = await pool.query(`
      SELECT phone_number, password, manager_name 
      FROM woreda_managers 
      LIMIT 5
    `);

    return NextResponse.json({
      tableExists: true,
      recordCount,
      columns: structureCheck.rows.map(r => ({ name: r.column_name, type: r.data_type })),
      sampleRecords: sampleResult.rows,
      message: recordCount > 0 
        ? `Table exists with ${recordCount} records. Login should work with unique passwords.`
        : 'Table exists but is empty. Please run the populate script to generate passwords.'
    });
  } catch (error: any) {
    console.error('Table check error:', error);
    return NextResponse.json({
      tableExists: false,
      error: error.message,
      code: error.code,
      message: 'Error checking table status'
    }, { status: 500 });
  }
}

