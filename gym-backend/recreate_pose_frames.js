const db = require('./db');

const dropQuery = 'DROP TABLE IF EXISTS pose_frames';
const createQuery = `
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

    FOREIGN KEY (session_id)
        REFERENCES workout_sessions(session_id)
        ON DELETE CASCADE
);
`;

db.query(dropQuery, (err) => {
  if (err) {
    console.error('Error dropping table:', err);
    db.end();
    return;
  }
  console.log('Table dropped');

  db.query(createQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Table created successfully');
    }
    db.end();
  });
});