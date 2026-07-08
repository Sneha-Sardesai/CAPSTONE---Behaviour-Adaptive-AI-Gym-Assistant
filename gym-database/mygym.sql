create database mygym;
use mygym;

CREATE TABLE members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    age INT,
    height FLOAT,   -- in cm
    weight FLOAT,   -- in kg
    bmi DECIMAL(5,2) GENERATED ALWAYS AS (weight / POWER(height/100, 2)) STORED
);

CREATE TABLE exercises (
    exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    exercise_name VARCHAR(100),
    muscle_group VARCHAR(50),
    difficulty VARCHAR(50)
);

CREATE TABLE workouts (
    workout_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    workout_date DATE,
    
    FOREIGN KEY (member_id) 
    REFERENCES members(member_id)
    ON DELETE CASCADE
);

CREATE TABLE workout_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    workout_id INT,
    exercise_id INT,
    sets INT,
    reps INT,
    weight FLOAT,
    
    FOREIGN KEY (workout_id) 
    REFERENCES workouts(workout_id)
    ON DELETE CASCADE,

    FOREIGN KEY (exercise_id) 
    REFERENCES exercises(exercise_id)
    ON DELETE CASCADE
);

INSERT INTO members (name, age, height, weight)
VALUES 
('Aditi', 20, 165, 55),
('Shreya', 21, 160, 50),
('Tanvi', 22, 170, 65),
('Sneha', 24, 168, 60);

-- NEW TABLES FOR BEHAVIOR-ADAPTIVE AI SYSTEM

-- Workout Sessions (tracks individual workout sessions with pose analysis)
CREATE TABLE workout_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    exercise_id INT NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP NULL,
    total_reps INT DEFAULT 0,
    total_sets INT DEFAULT 0,
    status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
    
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    INDEX idx_member_exercise (member_id, exercise_id),
    INDEX idx_session_time (session_start)
);

-- Pose Frame Data (stores real-time pose analysis from ML model)
CREATE TABLE pose_frames (
    frame_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    frame_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    frame_number INT,
    
    -- Joint coordinates (normalized 0-1)
    nose_x FLOAT, nose_y FLOAT, nose_confidence FLOAT,
    left_shoulder_x FLOAT, left_shoulder_y FLOAT, left_shoulder_confidence FLOAT,
    right_shoulder_x FLOAT, right_shoulder_y FLOAT, right_shoulder_confidence FLOAT,
    left_elbow_x FLOAT, left_elbow_y FLOAT, left_elbow_confidence FLOAT,
    right_elbow_x FLOAT, right_elbow_y FLOAT, right_elbow_confidence FLOAT,
    left_wrist_x FLOAT, left_wrist_y FLOAT, left_wrist_confidence FLOAT,
    right_wrist_x FLOAT, right_wrist_y FLOAT, right_wrist_confidence FLOAT,
    left_hip_x FLOAT, left_hip_y FLOAT, left_hip_confidence FLOAT,
    right_hip_x FLOAT, right_hip_y FLOAT, right_hip_confidence FLOAT,
    left_knee_x FLOAT, left_knee_y FLOAT, left_knee_confidence FLOAT,
    right_knee_x FLOAT, right_knee_y FLOAT, right_knee_confidence FLOAT,
    left_ankle_x FLOAT, left_ankle_y FLOAT, left_ankle_confidence FLOAT,
    right_ankle_x FLOAT, right_ankle_y FLOAT, right_ankle_confidence FLOAT,
    
    -- Computed angles (in degrees)
    left_arm_angle FLOAT,
    right_arm_angle FLOAT,
    left_leg_angle FLOAT,
    right_leg_angle FLOAT,
    back_angle FLOAT,
    
    FOREIGN KEY (session_id) REFERENCES workout_sessions(session_id) ON DELETE CASCADE,
    INDEX idx_session_time (session_id, frame_timestamp)
);

-- Form Errors (detects and logs form deviations)
CREATE TABLE form_errors (
    error_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    frame_id INT,
    error_type VARCHAR(100),  -- e.g., 'knee_fold', 'back_rounding', 'heel_lift'
    severity ENUM('low', 'medium', 'high') DEFAULT 'medium',
    body_part VARCHAR(50),
    error_description VARCHAR(255),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_recurring BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (session_id) REFERENCES workout_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (frame_id) REFERENCES pose_frames(frame_id) ON DELETE SET NULL,
    INDEX idx_session_errors (session_id),
    INDEX idx_error_type_member (error_type)
);

-- Behavioral Patterns (identifies recurring mistakes across sessions)
CREATE TABLE behavioral_patterns (
    pattern_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    exercise_id INT NOT NULL,
    error_type VARCHAR(100),
    occurrence_count INT DEFAULT 1,
    first_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_detected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pattern_score FLOAT DEFAULT 0,  -- 0-100, higher = more recurring
    is_persistent BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    UNIQUE KEY unique_member_exercise_error (member_id, exercise_id, error_type),
    INDEX idx_persistent_patterns (member_id, is_persistent)
);

-- Coaching Feedback (stores AI-generated adaptive coaching)
CREATE TABLE coaching_feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    pattern_id INT,
    feedback_type ENUM('detailed', 'short_reminder', 'encouragement', 'warning') DEFAULT 'detailed',
    message VARCHAR(500),
    confidence_score FLOAT,  -- How confident the AI is in this feedback
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_acknowledged BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (session_id) REFERENCES workout_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES behavioral_patterns(pattern_id) ON DELETE SET NULL,
    INDEX idx_session_feedback (session_id)
);

-- Insert sample data
INSERT INTO exercises (exercise_name, muscle_group, difficulty)
VALUES 
('Squats', 'Legs', 'Beginner'),
('Push-ups', 'Chest', 'Beginner'),
('Plank', 'Core', 'Beginner'),
('Deadlifts', 'Back', 'Intermediate'),
('Bench Press', 'Chest', 'Intermediate');