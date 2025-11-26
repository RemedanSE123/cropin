import { Pool } from 'pg';

// Database connection string
// Note: The connection string contains URL-encoded characters
const getConnectionString = () => {
  if (process.env.DATABASE_URL) {
    // If DATABASE_URL is set, use it (it may already be decoded)
    return process.env.DATABASE_URL;
  }
  // Fallback to the provided connection string
  return 'postgresql://Ethiopian%20Map%20System_owner:npg_wLSNX7Qg6hDi@ep-autumn-frost-a8zg2v20-pooler.eastus2.azure.neon.tech/cropin?sslmode=require&channel_binding=require';
};

const connectionString = getConnectionString();

// Optimized connection pool for faster queries
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool optimizations for faster queries
  max: 20, // Maximum number of clients in the pool
  min: 5, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

export default pool;

