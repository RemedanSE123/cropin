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
    let woredaManagerResult;
    try {
      woredaManagerResult = await pool.query(
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
    } catch (dbError: any) {
      // If woreda_managers table doesn't exist, fall back to old method
      console.error('Error querying woreda_managers table:', dbError);
      
      // Check if table doesn't exist error
      if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
        console.warn('woreda_managers table does not exist, falling back to old login method');
        
        // Fallback to old method: check da_users table with fixed password "123"
        if (password !== '123') {
          return NextResponse.json(
            { error: 'Invalid credentials. Please contact administrator.' },
            { status: 401 }
          );
        }
        
        const fallbackResult = await pool.query(
          'SELECT DISTINCT reporting_manager_name, reporting_manager_mobile FROM da_users WHERE reporting_manager_mobile = $1 LIMIT 1',
          [phoneNumber]
        );

        if (fallbackResult.rows.length === 0) {
          return NextResponse.json(
            { error: 'Invalid phone number' },
            { status: 401 }
          );
        }

        const manager = fallbackResult.rows[0];
        const token = Buffer.from(JSON.stringify({
          phoneNumber: manager.reporting_manager_mobile,
          isAdmin: false
        })).toString('base64');

        return NextResponse.json({
          token,
          woredaRepPhone: manager.reporting_manager_mobile,
          name: manager.reporting_manager_name || 'Woreda Manager',
          isAdmin: false,
        }, { status: 200 });
      }
      
      // Other database errors
      throw dbError;
    }

    if (woredaManagerResult.rows.length === 0) {
      // Check if phone number exists but password is wrong
      let phoneCheck;
      try {
        phoneCheck = await pool.query(
          'SELECT phone_number FROM woreda_managers WHERE phone_number = $1',
          [phoneNumber]
        );
      } catch (err) {
        // If table doesn't exist, fall back to old method
        console.warn('Could not check woreda_managers table, falling back');
        if (password === '123') {
          const fallbackResult = await pool.query(
            'SELECT DISTINCT reporting_manager_name, reporting_manager_mobile FROM da_users WHERE reporting_manager_mobile = $1 LIMIT 1',
            [phoneNumber]
          );

          if (fallbackResult.rows.length > 0) {
            const manager = fallbackResult.rows[0];
            const token = Buffer.from(JSON.stringify({
              phoneNumber: manager.reporting_manager_mobile,
              isAdmin: false
            })).toString('base64');

            return NextResponse.json({
              token,
              woredaRepPhone: manager.reporting_manager_mobile,
              name: manager.reporting_manager_name || 'Woreda Manager',
              isAdmin: false,
            }, { status: 200 });
          }
        }
        
        return NextResponse.json(
          { error: 'Invalid phone number or password' },
          { status: 401 }
        );
      }
      
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
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      { status: 500 }
    );
  }
}

