const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/start", (req, res) => {
  const { member_id, exercise_id } = req.body;

  if (!member_id || !exercise_id) {
    return res.status(400).json({
      message: "Missing member_id or exercise_id",
    });
  }

  const sql = "INSERT INTO workout_sessions (member_id, exercise_id) VALUES (?, ?)";
  db.query(sql, [member_id, exercise_id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    const session_id = result.insertId;
    res.status(200).json({
      message: "Workout session started successfully",
      session_id: session_id,
    });
  });
});

router.post("/pose-data", (req, res) => {
  const { session_id, frame_number, pose_landmarks } = req.body;

  if (!session_id || !pose_landmarks) {
    return res.status(400).json({ message: "Missing session_id or pose_landmarks" });
  }

  // Extract relevant landmarks
  const lm = pose_landmarks;
  const sql = `INSERT INTO pose_frames (
    session_id, frame_number,
    nose_x, nose_y, nose_confidence,
    left_shoulder_x, left_shoulder_y, left_shoulder_confidence,
    right_shoulder_x, right_shoulder_y, right_shoulder_confidence,
    left_elbow_x, left_elbow_y, left_elbow_confidence,
    right_elbow_x, right_elbow_y, right_elbow_confidence,
    left_wrist_x, left_wrist_y, left_wrist_confidence,
    right_wrist_x, right_wrist_y, right_wrist_confidence,
    left_hip_x, left_hip_y, left_hip_confidence,
    right_hip_x, right_hip_y, right_hip_confidence,
    left_knee_x, left_knee_y, left_knee_confidence,
    right_knee_x, right_knee_y, right_knee_confidence,
    left_ankle_x, left_ankle_y, left_ankle_confidence,
    right_ankle_x, right_ankle_y, right_ankle_confidence
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    session_id, frame_number,
    lm.nose?.x, lm.nose?.y, lm.nose?.visibility,
    lm.left_shoulder?.x, lm.left_shoulder?.y, lm.left_shoulder?.visibility,
    lm.right_shoulder?.x, lm.right_shoulder?.y, lm.right_shoulder?.visibility,
    lm.left_elbow?.x, lm.left_elbow?.y, lm.left_elbow?.visibility,
    lm.right_elbow?.x, lm.right_elbow?.y, lm.right_elbow?.visibility,
    lm.left_wrist?.x, lm.left_wrist?.y, lm.left_wrist?.visibility,
    lm.right_wrist?.x, lm.right_wrist?.y, lm.right_wrist?.visibility,
    lm.left_hip?.x, lm.left_hip?.y, lm.left_hip?.visibility,
    lm.right_hip?.x, lm.right_hip?.y, lm.right_hip?.visibility,
    lm.left_knee?.x, lm.left_knee?.y, lm.left_knee?.visibility,
    lm.right_knee?.x, lm.right_knee?.y, lm.right_knee?.visibility,
    lm.left_ankle?.x, lm.left_ankle?.y, lm.left_ankle?.visibility,
    lm.right_ankle?.x, lm.right_ankle?.y, lm.right_ankle?.visibility,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.status(200).json({ frame_id: result.insertId });
  });
});

router.post("/form-error", (req, res) => {
  const { session_id, error_type, severity, body_part, description } = req.body;

  if (!session_id || !error_type) {
    return res.status(400).json({ message: "Missing session_id or error_type" });
  }

  // Insert error
  const sql = "INSERT INTO form_errors (session_id, error_type, severity, body_part, error_description) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [session_id, error_type, severity || 'medium', body_part, description], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    const error_id = result.insertId;

    // Check for recurring pattern
    const checkSql = "SELECT COUNT(*) as count FROM behavioral_patterns WHERE member_id = (SELECT member_id FROM workout_sessions WHERE session_id = ?) AND exercise_id = (SELECT exercise_id FROM workout_sessions WHERE session_id = ?) AND error_type = ?";
    db.query(checkSql, [session_id, session_id, error_type], (err2, result2) => {
      if (err2) {
        console.error("Database error:", err2);
        return res.status(500).json({ error: "Database query failed" });
      }
      const is_recurring = result2[0].count > 0;
      res.status(200).json({ error_id: error_id, is_recurring_pattern: is_recurring });
    });
  });
});

router.post("/end", (req, res) => {
  const { session_id, total_reps, total_sets } = req.body;

  if (!session_id) {
    return res.status(400).json({ message: "Missing session_id" });
  }

  const sql = "UPDATE workout_sessions SET session_end = NOW(), total_reps = ?, total_sets = ?, status = 'completed' WHERE session_id = ?";
  db.query(sql, [total_reps || 0, total_sets || 0, session_id], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.status(200).json({ message: "Session ended successfully" });
  });
});

module.exports = router;

