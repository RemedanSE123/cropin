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

// Helper function to check if user is view-only admin
function isViewOnlyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    return decoded.isViewOnlyAdmin === true || decoded.phoneNumber === 'Admin123';
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
    console.log('Regional Manager Debug - Decoded token:', JSON.stringify(decoded));
    if (decoded.isRegionalManager === true && decoded.region) {
      console.log('Regional Manager - Identified as regional manager with region:', decoded.region);
      return { isRegionalManager: true, region: decoded.region };
    }
    return { isRegionalManager: false, region: null };
  } catch (error) {
    console.error('Regional Manager - Error decoding token:', error);
    return { isRegionalManager: false, region: null };
  }
}

// GET - Fetch DA users
export async function GET(request: NextRequest) {
  try {
    const woredaRepPhone = getWoredaRepPhone(request);
    const admin = isAdmin(request);
    const regionalManagerInfo = getRegionalManagerInfo(request);
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const zone = searchParams.get('zone');
    const woreda = searchParams.get('woreda');
    const global = searchParams.get('global') === 'true';

    // Optimized query - only select needed columns
    let query = 'SELECT name, region, zone, woreda, kebele, contact_number, reporting_manager_name, reporting_manager_mobile, language, total_data_collected, status FROM da_users WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Regional Managers see all DAs from their region (read-only)
    if (regionalManagerInfo.isRegionalManager && regionalManagerInfo.region) {
      // First, try to find the exact region name in the database (case-insensitive)
      try {
        const regionCheck = await pool.query(
          'SELECT DISTINCT region FROM da_users WHERE LOWER(TRIM(region)) = LOWER(TRIM($1)) LIMIT 1',
          [regionalManagerInfo.region]
        );
        
        if (regionCheck.rows.length > 0) {
          // Use the actual region name from database
          paramCount++;
          query += ` AND region = $${paramCount}`;
          params.push(regionCheck.rows[0].region);
          console.log('Regional Manager - Using exact region:', regionCheck.rows[0].region);
        } else {
          // Fallback to case-insensitive matching
          paramCount++;
          query += ` AND LOWER(TRIM(region)) = LOWER(TRIM($${paramCount}))`;
          params.push(regionalManagerInfo.region);
          console.log('Regional Manager - Using case-insensitive match for:', regionalManagerInfo.region);
        }
      } catch (err) {
        // Fallback to case-insensitive matching if query fails
        paramCount++;
        query += ` AND LOWER(TRIM(region)) = LOWER(TRIM($${paramCount}))`;
        params.push(regionalManagerInfo.region);
        console.log('Regional Manager - Fallback to case-insensitive match');
      }
    }
    // Admin can see all, Woreda Reps only see their own
    else if (!admin && !global && woredaRepPhone && woredaRepPhone !== 'Admin@123' && woredaRepPhone !== 'Admin123') {
      paramCount++;
      query += ` AND reporting_manager_mobile = $${paramCount}`;
      params.push(woredaRepPhone);
    }

    // Apply filters (only if not already filtered by regional manager)
    if (region && !regionalManagerInfo.isRegionalManager) {
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

    // Order by: Active users first, then by total_data_collected DESC, then alphabetically by name
    // Clean/trim names and handle Amharic characters (they come after Z in Unicode)
    query += ` ORDER BY 
      CASE WHEN status = 'Active' THEN 0 ELSE 1 END,
      CASE WHEN status = 'Active' THEN total_data_collected ELSE 0 END DESC,
      TRIM(COALESCE(name, ''))`;

    console.log('Regional Manager - Final query:', query);
    console.log('Regional Manager - Query params:', params);

    const result = await pool.query(query, params);

    console.log('Regional Manager - Query result count:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('Regional Manager - Sample result region:', result.rows[0].region);
    }

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
    const isViewOnly = isViewOnlyAdmin(request);
    const regionalManagerInfo = getRegionalManagerInfo(request);
    
    if (!woredaRepPhone) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // View-only Admins cannot edit (read-only access)
    if (isViewOnly) {
      return NextResponse.json(
        { error: 'View-only administrators have read-only access' },
        { status: 403 }
      );
    }

    // Regional Managers cannot edit (read-only access)
    if (regionalManagerInfo.isRegionalManager) {
      return NextResponse.json(
        { error: 'Regional managers have read-only access' },
        { status: 403 }
      );
    }

    const { contact_number, total_data_collected, status } = await request.json();

    if (!contact_number) {
      return NextResponse.json(
        { error: 'Contact number is required' },
        { status: 400 }
      );
    }

    // Validate status - only allow 'Active' or 'Inactive'
    if (status !== undefined && status !== 'Active' && status !== 'Inactive') {
      return NextResponse.json(
        { error: 'Status must be either Active or Inactive' },
        { status: 400 }
      );
    }

    // Admin can edit any DA, Woreda Reps can only edit their own
    // Note: View-only admin check already done above
    if (!admin && woredaRepPhone !== 'Admin@123' && woredaRepPhone !== 'Admin123') {
      const daCheck = await pool.query(
        'SELECT contact_number FROM da_users WHERE contact_number = $1 AND reporting_manager_mobile = $2',
        [contact_number, woredaRepPhone]
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

    if (total_data_collected !== undefined) {
      paramCount++;
      updateFields.push(`total_data_collected = $${paramCount}::INTEGER`);
      // Ensure it's a number, default to 0 if invalid
      const dataValue = Number(total_data_collected);
      updateValues.push(isNaN(dataValue) ? 0 : dataValue);
    }

    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}::VARCHAR`);
      updateValues.push(status);
    }

    // Always update last_updated timestamp (no parameter needed)
    updateFields.push(`last_updated = CURRENT_TIMESTAMP`);

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add contact_number for WHERE clause
    paramCount++;
    updateValues.push(contact_number);

    const updateQuery = `
      UPDATE da_users 
      SET ${updateFields.join(', ')} 
      WHERE contact_number = $${paramCount}
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

