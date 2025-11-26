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
    return decoded.isAdmin === true || decoded.phoneNumber === 'Admin@123';
  } catch {
    return false;
  }
}

// GET - Fetch DA users
export async function GET(request: NextRequest) {
  try {
    const woredaRepPhone = getWoredaRepPhone(request);
    const admin = isAdmin(request);
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const zone = searchParams.get('zone');
    const woreda = searchParams.get('woreda');
    const global = searchParams.get('global') === 'true';

    // Optimized query - only select needed columns
    let query = 'SELECT name, region, zone, woreda, kebele, contactnumber, reporting_manager_name, reporting_manager_mobile, language, total_collected_data, status FROM da_users WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Admin can see all, Woreda Reps only see their own
    if (!admin && !global && woredaRepPhone && woredaRepPhone !== 'Admin@123') {
      paramCount++;
      query += ` AND reporting_manager_mobile = $${paramCount}`;
      params.push(woredaRepPhone);
    }

    // Apply filters
    if (region) {
      paramCount++;
      query += ` AND region = $${paramCount}`;
      params.push(region);
    }
    if (zone) {
      paramCount++;
      query += ` AND zone = $${paramCount}`;
      params.push(zone);
    }
    if (woreda) {
      paramCount++;
      query += ` AND woreda = $${paramCount}`;
      params.push(woreda);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);

    return NextResponse.json({ daUsers: result.rows });
  } catch (error) {
    console.error('Error fetching DA users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update DA user (only total_collected_data and status)
export async function PATCH(request: NextRequest) {
  try {
    const woredaRepPhone = getWoredaRepPhone(request);
    const admin = isAdmin(request);
    
    if (!woredaRepPhone) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { contactnumber, total_collected_data, status } = await request.json();

    if (!contactnumber) {
      return NextResponse.json(
        { error: 'Contact number is required' },
        { status: 400 }
      );
    }

    // Admin can edit any DA, Woreda Reps can only edit their own
    if (!admin && woredaRepPhone !== 'Admin@123') {
      const daCheck = await pool.query(
        'SELECT contactnumber FROM da_users WHERE contactnumber = $1 AND reporting_manager_mobile = $2',
        [contactnumber, woredaRepPhone]
      );

      if (daCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'You can only edit your own DA users' },
          { status: 403 }
        );
      }
    }

    // Update the DA user
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 0;

    if (total_collected_data !== undefined) {
      paramCount++;
      updateFields.push(`total_collected_data = $${paramCount}`);
      updateValues.push(total_collected_data);
    }

    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    paramCount++;
    updateValues.push(contactnumber);

    const updateQuery = `
      UPDATE da_users 
      SET ${updateFields.join(', ')} 
      WHERE contactnumber = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    return NextResponse.json({ daUser: result.rows[0] });
  } catch (error) {
    console.error('Error updating DA user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

