-- Alpha Groups Initial Schema
-- Created: 2026-02-16
-- This migration creates the core database schema for Alpha Groups

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- GROUPS TABLE
-- ============================================================================
-- Stores information about reputation-gated groups
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_group_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    bronze_threshold INT DEFAULT 300,
    silver_threshold INT DEFAULT 500,
    gold_threshold INT DEFAULT 700,
    auto_kick_enabled BOOLEAN DEFAULT true,
    recheck_frequency VARCHAR(50) DEFAULT 'daily',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MEMBERS TABLE
-- ============================================================================
-- Stores member information for each group
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    telegram_username VARCHAR(255),
    wallet_address VARCHAR(255) NOT NULL,
    fairscore INT,
    tier VARCHAR(50),  -- 'bronze', 'silver', 'gold', 'none'
    last_checked TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, telegram_id)
);

-- ============================================================================
-- VERIFICATIONS TABLE
-- ============================================================================
-- Audit log of wallet verifications (immutable record)
CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    signature TEXT NOT NULL,
    message TEXT NOT NULL,
    nonce VARCHAR(255) NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADMINS TABLE
-- ============================================================================
-- Stores admin user accounts for dashboard access
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- ============================================================================
-- GROUP_ADMINS TABLE
-- ============================================================================
-- Junction table for many-to-many relationship between groups and admins
CREATE TABLE IF NOT EXISTS group_admins (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, admin_id)
);

-- ============================================================================
-- ACTIVITY_LOG TABLE
-- ============================================================================
-- Tracks all member state changes for debugging and analytics
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    action VARCHAR(100),  -- 'verified', 'kicked', 'promoted', 'demoted', 'checked'
    old_score INT,
    new_score INT,
    old_tier VARCHAR(50),
    new_tier VARCHAR(50),
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USED_NONCES TABLE
-- ============================================================================
-- Prevents replay attacks by tracking used nonces from SIWS signatures
CREATE TABLE IF NOT EXISTS used_nonces (
    nonce VARCHAR(255) PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);
