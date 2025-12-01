/**
 * Script to populate unique 4-digit passwords for woreda managers
 * 
 * This script:
 * 1. Finds all distinct woreda managers from da_users table
 * 2. Generates unique 4-digit passwords for each
 * 3. Inserts/updates them in woreda_managers table
 * 
 * Usage: node database/populate_woreda_manager_passwords.js
 * 
 * Make sure to set DATABASE_URL in your environment or .env.local file
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Try to load .env.local file manually if dotenv is not available
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // If dotenv is not installed, try to read .env.local manually
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8');
      envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (err) {
    console.warn('Could not load .env.local file. Make sure DATABASE_URL is set in environment.');
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Generate a random 4-digit password
 */
function generate4DigitPassword() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate unique 4-digit passwords for all woreda managers
 */
async function populatePasswords() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get all distinct woreda managers from da_users
    const managersResult = await client.query(`
      SELECT DISTINCT 
        reporting_manager_mobile,
        reporting_manager_name
      FROM da_users
      WHERE reporting_manager_mobile IS NOT NULL 
        AND reporting_manager_mobile != ''
      ORDER BY reporting_manager_mobile
    `);

    console.log(`Found ${managersResult.rows.length} woreda managers`);

    // Get existing passwords to avoid duplicates
    const existingPasswordsResult = await client.query(`
      SELECT password FROM woreda_managers WHERE password IS NOT NULL
    `);
    const existingPasswords = new Set(existingPasswordsResult.rows.map(r => r.password));
    console.log(`Found ${existingPasswords.size} existing passwords`);

    let inserted = 0;
    let updated = 0;
    const usedPasswords = new Set(existingPasswords);

    for (const manager of managersResult.rows) {
      // Generate unique password
      let password;
      do {
        password = generate4DigitPassword();
      } while (usedPasswords.has(password));
      
      usedPasswords.add(password);

      // Check if manager already exists
      const existingResult = await client.query(
        'SELECT id, password FROM woreda_managers WHERE phone_number = $1',
        [manager.reporting_manager_mobile]
      );

      if (existingResult.rows.length > 0) {
        // Update existing manager with new password if they don't have one
        if (!existingResult.rows[0].password || existingResult.rows[0].password === '123') {
          await client.query(
            'UPDATE woreda_managers SET password = $1, manager_name = $2, updated_at = CURRENT_TIMESTAMP WHERE phone_number = $3',
            [password, manager.reporting_manager_name, manager.reporting_manager_mobile]
          );
          updated++;
          console.log(`Updated: ${manager.reporting_manager_mobile} -> Password: ${password} (${manager.reporting_manager_name || 'N/A'})`);
        } else {
          console.log(`Skipped: ${manager.reporting_manager_mobile} already has password: ${existingResult.rows[0].password}`);
        }
      } else {
        // Insert new manager
        await client.query(
          'INSERT INTO woreda_managers (phone_number, password, manager_name) VALUES ($1, $2, $3)',
          [manager.reporting_manager_mobile, password, manager.reporting_manager_name]
        );
        inserted++;
        console.log(`Inserted: ${manager.reporting_manager_mobile} -> Password: ${password} (${manager.reporting_manager_name || 'N/A'})`);
      }
    }

    await client.query('COMMIT');
    
    console.log('\n=== Summary ===');
    console.log(`Total managers processed: ${managersResult.rows.length}`);
    console.log(`New managers inserted: ${inserted}`);
    console.log(`Existing managers updated: ${updated}`);
    console.log('\nAll passwords are unique 4-digit numbers!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error populating passwords:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
populatePasswords()
  .then(() => {
    console.log('\nScript completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

