import { Pool } from 'pg';

// Database connection string
// Uses DATABASE_URL environment variable for local PostgreSQL
// Format: postgresql://username:password@localhost:5432/database_name
const getConnectionString = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required. Please set it in .env.local file.');
  }
  return process.env.DATABASE_URL;
};

const connectionString = getConnectionString();

// Check if connection string indicates local database (no SSL needed)
const isLocalDatabase = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

// Optimized connection pool for faster queries
const pool = new Pool({
  connectionString: connectionString,
  // SSL only needed for remote databases, not local PostgreSQL
  ssl: isLocalDatabase ? false : {
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

