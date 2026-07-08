USE mygym;
-- ===============================
-- STEP 1: Ensure users table exists
-- ===============================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
-- ===============================
-- STEP 2: Ensure default user (Aditi) exists
-- ===============================
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
-- ===============================
-- STEP 3: Add user_id column ONLY if missing
-- ===============================
SET @col_exists := (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'mygym'
            AND TABLE_NAME = 'workout_sessions'
            AND COLUMN_NAME = 'user_id'
    );
SET @sql := IF(
        @col_exists = 0,
        'ALTER TABLE workout_sessions ADD COLUMN user_id INT',
        'SELECT ''Column user_id already exists'';'
    );
PREPARE stmt
FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- ===============================
-- STEP 4: Assign ALL existing sessions to Aditi
-- ===============================
UPDATE workout_sessions
SET user_id = 1
WHERE user_id IS NULL
    OR user_id = 0;
-- ===============================
-- STEP 5: Enforce NOT NULL (safe)
-- ===============================
ALTER TABLE workout_sessions
MODIFY COLUMN user_id INT NOT NULL;
-- ===============================
-- STEP 6: Add index ONLY if missing
-- ===============================
SET @idx_exists := (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = 'mygym'
            AND TABLE_NAME = 'workout_sessions'
            AND INDEX_NAME = 'idx_workout_sessions_user_id'
    );
SET @sql := IF(
        @idx_exists = 0,
        'CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id)',
        'SELECT ''Index already exists'';'
    );
PREPARE stmt
FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- ===============================
-- STEP 7: Add FK ONLY if missing
-- ===============================
SET @fk_exists := (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = 'mygym'
            AND TABLE_NAME = 'workout_sessions'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND CONSTRAINT_NAME = 'fk_workout_sessions_user_id'
    );
SET @sql := IF(
        @fk_exists = 0,
        'ALTER TABLE workout_sessions
     ADD CONSTRAINT fk_workout_sessions_user_id
     FOREIGN KEY (user_id)
     REFERENCES users(user_id)
     ON DELETE CASCADE',
        'SELECT ''Foreign key already exists'';'
    );
PREPARE stmt
FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
-- ===============================
-- DONE
-- ===============================
SELECT 'workout_sessions aligned with users (Aditi as default)' AS status;