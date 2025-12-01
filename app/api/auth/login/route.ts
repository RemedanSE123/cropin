import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Force dynamic rendering for faster response
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, password } = await request.json();

    // Early validation - check inputs before any processing
    if (!phoneNumber || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      );
    }

    // Admin login check - instant, no DB query
    if (phoneNumber === 'Admin@123' && password === 'Admin@123') {
      const token = Buffer.from(JSON.stringify({
        phoneNumber: 'Admin@123',
        isAdmin: true
      })).toString('base64');

      return NextResponse.json({
        token,
        woredaRepPhone: 'Admin@123',
        name: 'Administrator',
        isAdmin: true,
      }, { status: 200 });
    }

    // Regional Manager login check - instant, no DB query
    // Using actual database region names (Amharic and English as stored in DB)
    const regionalManagerMap: { [key: string]: { region: string; name: string } } = {
      'tigray@123': { region: 'ትግራይ', name: 'Tigray Regional Manager' },
      'south@123': { region: 'ደቡብ ኢትዮጵያ', name: 'Southern Ethiopia Regional Manager' },
      'sidama@123': { region: 'Sidama', name: 'Sidama Regional Manager' },
      'ce@123': { region: 'Central Ethiopia', name: 'Central Ethiopia Regional Manager' },
      'amhara@123': { region: 'Amhara', name: 'Amhara Regional Manager' },
      'oromia@123': { region: 'Oromiya', name: 'Oromiya Regional Manager' },
    };

    if (phoneNumber in regionalManagerMap && password === '123') {
      const managerInfo = regionalManagerMap[phoneNumber];
      const token = Buffer.from(JSON.stringify({
        phoneNumber: phoneNumber,
        isAdmin: false,
        isRegionalManager: true,
        region: managerInfo.region
      })).toString('base64');

      return NextResponse.json({
        token,
        woredaRepPhone: phoneNumber,
        name: managerInfo.name,
        isAdmin: false,
        isRegionalManager: true,
        region: managerInfo.region,
      }, { status: 200 });
    }

    // Woreda Manager login - check unique password from woreda_managers table
    // First check if phone number exists in woreda_managers table with matching password
    const woredaManagerResult = await pool.query(
      `SELECT wm.phone_number, 
              COALESCE(wm.manager_name, 
                       (SELECT DISTINCT reporting_manager_name 
                        FROM da_users 
                        WHERE reporting_manager_mobile = wm.phone_number 
                        LIMIT 1)) as name,
              wm.manager_name
       FROM woreda_managers wm
       WHERE wm.phone_number = $1 AND wm.password = $2
       LIMIT 1`,
      [phoneNumber, password]
    );

    if (woredaManagerResult.rows.length === 0) {
      // Check if phone number exists but password is wrong
      const phoneCheck = await pool.query(
        'SELECT phone_number FROM woreda_managers WHERE phone_number = $1',
        [phoneNumber]
      );
      
      if (phoneCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    const manager = woredaManagerResult.rows[0];

    // Generate token
    const token = Buffer.from(JSON.stringify({
      phoneNumber: manager.phone_number,
      isAdmin: false
    })).toString('base64');

    return NextResponse.json({
      token,
      woredaRepPhone: manager.phone_number,
      name: manager.name || manager.manager_name || 'Woreda Manager',
      isAdmin: false,
    }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

