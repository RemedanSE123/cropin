-- =================================
-- Migration: Add Woreda Managers Table
-- =================================
-- This migration creates a table to store unique passwords for woreda managers
-- Run this script in your PostgreSQL database

-- =================================
-- 1. Create Woreda Managers Table
-- =================================
CREATE TABLE IF NOT EXISTS woreda_managers (
    id SERIAL PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    password VARCHAR(4) NOT NULL,
    manager_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================
-- 2. Create Index for Fast Lookups
-- =================================
CREATE INDEX IF NOT EXISTS idx_woreda_manager_phone ON woreda_managers(phone_number);
CREATE INDEX IF NOT EXISTS idx_woreda_manager_password ON woreda_managers(password);

-- =================================
-- 3. Populate with Existing Managers
-- =================================
-- This will insert distinct woreda managers from da_users table
-- with auto-generated unique 4-digit passwords
INSERT INTO woreda_managers (phone_number, manager_name, password)
SELECT DISTINCT 
    reporting_manager_mobile,
    reporting_manager_name,
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') as password
FROM da_users
WHERE reporting_manager_mobile IS NOT NULL 
  AND reporting_manager_mobile != ''
  AND reporting_manager_mobile NOT IN (
    SELECT phone_number FROM woreda_managers
  )
ON CONFLICT (phone_number) DO NOTHING;

-- Note: The above password generation might create duplicates
-- Run the populate_passwords.js script to ensure all passwords are unique

