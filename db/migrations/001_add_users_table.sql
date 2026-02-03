-- ====================================
-- Add Users Table for Dashboard Authentication
-- Run this migration after data.sql
-- ====================================

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS "users" CASCADE;

-- Create users table
CREATE TABLE "users" (
    "id" INT PRIMARY KEY,
    "username" VARCHAR(50) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "last_login" TIMESTAMPTZ
);

-- Create index on username for faster lookups
CREATE INDEX "idx_users_username" ON "users" ("username");
