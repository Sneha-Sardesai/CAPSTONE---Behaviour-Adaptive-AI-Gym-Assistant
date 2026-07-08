-- ===============================
-- STEP 1: Add Users System
-- ===============================
-- This migration adds user authentication support while maintaining backward compatibility
USE mygym;
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
-- Create default user (Aditi) for all existing data
-- This acts as the "system default user"
INSERT IGNORE INTO users (
        user_id,
        username,
        email,
        password_hash,
        created_at,
        is_active
    )
VALUES (
        1,
        'aditi',
        'aditi@mygym.local',
        '$2b$10$OkzzDMEH9JiU/fEUvWFgeOb63qv./OPaBshM0lcuMWYKmHZxB1l7m',
        CURRENT_TIMESTAMP,
        TRUE
    );
-- Verify the user was created
SELECT 'Users table created and Aditi initialized' as status;