-- ====================================
-- Migration 001: Add Users Table for Dashboard Authentication
-- ====================================
CREATE TABLE IF NOT EXISTS "users" (
    "id"            SERIAL PRIMARY KEY,
    "username"      VARCHAR(50)  NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at"    TIMESTAMPTZ  DEFAULT NOW(),
    "last_login"    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users" ("username");
