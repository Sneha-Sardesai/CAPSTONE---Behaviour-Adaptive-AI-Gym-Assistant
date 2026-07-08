-- Add missing rep_analysis table to mygym.sql
-- This table stores individual rep data (good/bad classification with angles)
DROP TABLE IF EXISTS rep_analysis;
CREATE TABLE rep_analysis (
    rep_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    rep_number INT NOT NULL,
    rep_type ENUM('good', 'bad') NOT NULL,
    min_angle FLOAT,
    max_angle FLOAT,
    avg_angle FLOAT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(session_id) ON DELETE CASCADE
);