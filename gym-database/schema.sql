-- ===============================
-- DATABASE
-- ===============================
CREATE DATABASE IF NOT EXISTS mygym;
USE mygym;

-- ===============================
-- CORE ENTITIES
-- ===============================

CREATE TABLE members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT,
    height FLOAT COMMENT 'cm',
    weight FLOAT COMMENT 'kg',
    bmi DECIMAL(5,2)
        GENERATED ALWAYS AS (weight / POWER(height / 100, 2)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercises (
    exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    exercise_name VARCHAR(100) NOT NULL,
    muscle_group VARCHAR(50),
    difficulty ENUM('Beginner','Intermediate','Advanced'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- WORKOUT & SESSION LAYER
-- ===============================

CREATE TABLE workouts (
    workout_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    workout_date DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE
);

CREATE TABLE workout_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    exercise_id INT NOT NULL,

    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP NULL,

    total_reps INT DEFAULT 0,
    good_reps INT DEFAULT 0,
    bad_reps INT DEFAULT 0,

    status ENUM('in_progress','completed','abandoned')
        DEFAULT 'in_progress',

    FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,

    FOREIGN KEY (exercise_id)
        REFERENCES exercises(exercise_id)
        ON DELETE CASCADE
);

-- ===============================
-- POSE FRAME DATA (RAW ML OUTPUT)
-- ===============================

CREATE TABLE pose_frames (
    frame_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    frame_number INT,
    frame_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Joint coordinates (normalized)
    left_shoulder_x FLOAT, left_shoulder_y FLOAT,
    left_elbow_x FLOAT, left_elbow_y FLOAT,
    left_wrist_x FLOAT, left_wrist_y FLOAT,

    right_shoulder_x FLOAT, right_shoulder_y FLOAT,
    right_elbow_x FLOAT, right_elbow_y FLOAT,
    right_wrist_x FLOAT, right_wrist_y FLOAT,

    left_hip_x FLOAT, left_hip_y FLOAT,
    left_knee_x FLOAT, left_knee_y FLOAT,
    left_ankle_x FLOAT, left_ankle_y FLOAT,

    right_hip_x FLOAT, right_hip_y FLOAT,
    right_knee_x FLOAT, right_knee_y FLOAT,
    right_ankle_x FLOAT, right_ankle_y FLOAT,

    -- Computed angles
    left_arm_angle FLOAT,
    right_arm_angle FLOAT,
    left_leg_angle FLOAT,
    right_leg_angle FLOAT,
    back_angle FLOAT,

    FOREIGN KEY (session_id)
        REFERENCES workout_sessions(session_id)
        ON DELETE CASCADE
);

-- ===============================
-- REP-LEVEL ANALYSIS
-- ===============================

CREATE TABLE rep_analysis (
    rep_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    rep_number INT NOT NULL,

    rep_type ENUM('good','bad') NOT NULL,

    min_angle FLOAT,
    max_angle FLOAT,
    avg_angle FLOAT,

    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id)
        REFERENCES workout_sessions(session_id)
        ON DELETE CASCADE
);

-- ===============================
-- FORM ERRORS
-- ===============================

CREATE TABLE form_errors (
    error_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    frame_id INT NULL,

    error_type VARCHAR(100),
    body_part VARCHAR(50),
    severity ENUM('low','medium','high') DEFAULT 'medium',
    description VARCHAR(255),

    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id)
        REFERENCES workout_sessions(session_id)
        ON DELETE CASCADE,

    FOREIGN KEY (frame_id)
        REFERENCES pose_frames(frame_id)
        ON DELETE SET NULL
);

-- ===============================
-- BEHAVIORAL PATTERNS (AI MEMORY)
-- ===============================

CREATE TABLE behavioral_patterns (
    pattern_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    exercise_id INT NOT NULL,

    error_type VARCHAR(100),
    occurrence_count INT DEFAULT 1,
    pattern_score FLOAT DEFAULT 0,

    first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    is_persistent BOOLEAN DEFAULT FALSE,

    UNIQUE (member_id, exercise_id, error_type),

    FOREIGN KEY (member_id)
        REFERENCES members(member_id)
        ON DELETE CASCADE,

    FOREIGN KEY (exercise_id)
        REFERENCES exercises(exercise_id)
        ON DELETE CASCADE
);

-- ===============================
-- COACHING FEEDBACK
-- ===============================

CREATE TABLE coaching_feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    pattern_id INT NULL,

    feedback_type ENUM(
        'detailed',
        'short_reminder',
        'encouragement',
        'warning'
    ),

    message VARCHAR(500),
    confidence_score FLOAT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id)
        REFERENCES workout_sessions(session_id)
        ON DELETE CASCADE,

    FOREIGN KEY (pattern_id)
        REFERENCES behavioral_patterns(pattern_id)
        ON DELETE SET NULL
);