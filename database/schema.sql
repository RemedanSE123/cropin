-- =================================
-- Cropin Grow System Database Schema
-- =================================
-- Run this script in your local PostgreSQL database
-- Database: Create a database first (e.g., CREATE DATABASE cropin_grow;)

-- =================================
-- 1. Create DA Users Table
-- =================================
CREATE TABLE da_users (
    id SERIAL PRIMARY KEY,

    region TEXT,
    zone TEXT,
    woreda TEXT,
    kebele TEXT,

    contact_number TEXT,
    name TEXT,

    reporting_manager_name TEXT,
    reporting_manager_mobile TEXT,

    language TEXT,

    total_data_collected INT DEFAULT 0,
    last_updated TIMESTAMP,
    status VARCHAR(10) DEFAULT 'inactive',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================
-- 2. Indexes for Speed
-- =================================
CREATE INDEX idx_da_region ON da_users(region);
CREATE INDEX idx_da_zone ON da_users(zone);
CREATE INDEX idx_da_woreda ON da_users(woreda);
CREATE INDEX idx_da_kebele ON da_users(kebele);

CREATE INDEX idx_da_contact_number ON da_users(contact_number);
CREATE INDEX idx_da_manager_mobile ON da_users(reporting_manager_mobile);

CREATE INDEX idx_da_last_updated ON da_users(last_updated);
CREATE INDEX idx_da_total ON da_users(total_data_collected);

