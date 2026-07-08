const db = require('./db');

const queries = [
  'DROP TABLE IF EXISTS form_errors',
  'DROP TABLE IF EXISTS rep_analysis',
  'DROP TABLE IF EXISTS behavioral_patterns',
  'DROP TABLE IF EXISTS pose_frames',
  'DROP TABLE IF EXISTS workout_sessions',
  'DROP TABLE IF EXISTS workouts',
  'DROP TABLE IF EXISTS exercises',
  'DROP TABLE IF EXISTS members'
];

let index = 0;

function runNext() {
  if (index >= queries.length) {
    console.log('All tables dropped');
    recreateTables();
    return;
  }

  db.query(queries[index], (err) => {
    if (err) {
      console.error(`Error dropping ${queries[index]}:`, err);
    } else {
      console.log(`Dropped ${queries[index]}`);
    }
    index++;
    runNext();
  });
}

function recreateTables() {
  const createQueries = [
    `CREATE TABLE members (
        member_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INT,
        height FLOAT COMMENT 'cm',
        weight FLOAT COMMENT 'kg',
        bmi DECIMAL(5,2)
            GENERATED ALWAYS AS (weight / POWER(height / 100, 2)) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE exercises (
        exercise_id INT AUTO_INCREMENT PRIMARY KEY,
        exercise_name VARCHAR(100) NOT NULL,
        muscle_group VARCHAR(50),
        difficulty ENUM('Beginner','Intermediate','Advanced'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE workouts (
        workout_id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        workout_date DATE DEFAULT (CURRENT_DATE),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id)
            REFERENCES members(member_id)
            ON DELETE CASCADE
    )`,
    `CREATE TABLE workout_sessions (
        session_id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        exercise_id INT NOT NULL,
        session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('in_progress','completed') DEFAULT 'in_progress',
        FOREIGN KEY (member_id)
            REFERENCES members(member_id)
            ON DELETE CASCADE,
        FOREIGN KEY (exercise_id)
            REFERENCES exercises(exercise_id)
            ON DELETE CASCADE
    )`,
    `CREATE TABLE pose_frames (
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

        FOREIGN KEY (session_id)
            REFERENCES workout_sessions(session_id)
            ON DELETE CASCADE
    )`,
    `CREATE TABLE form_errors (
        error_id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        frame_id INT,
        error_type VARCHAR(50) NOT NULL,
        severity ENUM('low','medium','high') DEFAULT 'medium',
        body_part VARCHAR(50),
        error_description TEXT,
        is_recurring BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (session_id)
            REFERENCES workout_sessions(session_id)
            ON DELETE CASCADE,
        FOREIGN KEY (frame_id) REFERENCES pose_frames(frame_id) ON DELETE SET NULL
    )`,
    `CREATE TABLE rep_analysis (
        rep_id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        rep_number INT NOT NULL,
        rep_type ENUM('good','bad') NOT NULL,
        min_angle FLOAT,
        max_angle FLOAT,
        avg_angle FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (session_id)
            REFERENCES workout_sessions(session_id)
            ON DELETE CASCADE
    )`,
    `CREATE TABLE behavioral_patterns (
        pattern_id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        error_type VARCHAR(50) NOT NULL,
        is_persistent BOOLEAN DEFAULT FALSE,
        is_recurring BOOLEAN DEFAULT FALSE,
        frequency INT DEFAULT 0,
        last_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (member_id)
            REFERENCES members(member_id)
            ON DELETE CASCADE
    )`
  ];

  let createIndex = 0;

  function runCreate() {
    if (createIndex >= createQueries.length) {
      console.log('All tables recreated');
      db.end();
      return;
    }

    db.query(createQueries[createIndex], (err) => {
      if (err) {
        console.error(`Error creating table ${createIndex + 1}:`, err);
      } else {
        console.log(`Created table ${createIndex + 1}`);
      }
      createIndex++;
      runCreate();
    });
  }

  runCreate();
}

runNext();