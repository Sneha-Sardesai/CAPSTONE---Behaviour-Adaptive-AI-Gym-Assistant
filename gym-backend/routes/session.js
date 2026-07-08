const express = require("express");
const router = express.Router();
const db = require("../db");
const { calculateAngles, analyzePatterns } = require("../utils/poseAnalysis");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// ==================== START SESSION ====================

router.post("/start", (req, res) => {
  const { member_id, exercise_id } = req.body;
  const user_id = req.user.id; // From auth middleware (JWT token or default Aditi)

  if (!member_id || !exercise_id) {
    return res.status(400).json({ error: "member_id and exercise_id required" });
  }

  const sql =
    "INSERT INTO workout_sessions (member_id, exercise_id, user_id, status) VALUES (?, ?, ?, 'in_progress')";

  db.query(sql, [member_id, exercise_id, user_id], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "Failed to start session" });
    }

    res.status(201).json({
      session_id: result.insertId,
      message: "Session started",
      user_id: user_id, // Confirm which user owns this session
    });
  });
});

// ==================== POSE DATA ====================
// NOTE: pose_frames storage disabled - focus on behavioral-adaptive ML
// Form errors + rep analysis drive the adaptive coaching engine

router.post("/session/pose-data", (req, res) => {
  const { session_id, frame_number } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: "session_id required" });
  }

  // Acknowledge but skip storage - behavioral ML works from form_errors
  res.status(200).json({
    frame_id: -1,
    session_id,
    frame_number,
    note: "Pose frames acknowledged - behavioral-adaptive ML enabled"
  });
});

// ==================== FORM ERROR ====================

router.post("/form-error", (req, res) => {
  const { session_id, frame_id, error_type, severity, body_part, description } =
    req.body;

  if (!session_id || !error_type) {
    return res.status(400).json({ error: "session_id and error_type required" });
  }

  const sql = `
    INSERT INTO form_errors (
      session_id, frame_id, error_type, severity, body_part, error_description
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [session_id, frame_id, error_type, severity || "medium", body_part, description],
    (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ error: "Failed to log form error" });
      }

      res.status(201).json({ error_id: result.insertId });
    }
  );
});

// ==================== REP LOGGING ====================

router.post("/log-rep", (req, res) => {
  const { session_id, rep_number, rep_type, min_angle, max_angle, avg_angle } =
    req.body;

  if (!session_id || !rep_number || !rep_type) {
    return res.status(400).json({ error: "Missing rep data" });
  }

  const sql = `
    INSERT INTO rep_analysis (
      session_id, rep_number, rep_type, min_angle, max_angle, avg_angle
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [session_id, rep_number, rep_type, min_angle, max_angle, avg_angle],
    (err, result) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ error: "Rep insert failed" });
      }

      res.status(201).json({ rep_id: result.insertId });
    }
  );
});

// ==================== END SESSION ====================

router.post("/end", (req, res) => {
  const { session_id, total_reps, total_sets } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: "session_id required" });
  }

  const updateSQL = `
    UPDATE workout_sessions
    SET status='completed',
        session_end = NOW(),
        total_reps = ?,
        total_sets = ?
    WHERE session_id = ?
  `;

  db.query(
    updateSQL,
    [total_reps || 0, total_sets || 0, session_id],
    (err) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ error: "Failed to end session" });
      }

      res.status(200).json({ message: "Session completed" });
    }
  );
});

module.exports = router;
























// const express = require("express");
// const router = express.Router();
// const db = require("../db");
// const { calculateAngles, detectFormErrors, analyzePatterns } = require("../utils/poseAnalysis");

// // ==================== SESSION MANAGEMENT ====================

// /**
//  * POST /api/workout/session/start
//  * Start a new workout session
//  * Body: { member_id, exercise_id }
//  */
// router.post("/start", (req, res) => {
//   const { member_id, exercise_id } = req.body;

//   if (!member_id || !exercise_id) {
//     return res.status(400).json({
//       error: "Missing required fields: member_id, exercise_id",
//     });
//   }

//   const sql =
//     "INSERT INTO workout_sessions (member_id, exercise_id, status) VALUES (?, ?, 'in_progress')";

//   db.query(sql, [member_id, exercise_id], (err, result) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: "Failed to start session" });
//     }

//     res.status(201).json({
//       message: "Workout session started",
//       session_id: result.insertId,
//       timestamp: new Date(),
//     });
//   });
// });

// // ==================== POSE DATA RECEPTION ====================

// /**
//  * POST /api/workout/session/pose-data
//  * Receive real-time pose data from ML model
//  * Body: { session_id, frame_number, pose_landmarks }
//  */
// router.post("/pose-data", (req, res) => {
//   const { session_id, frame_number, pose_landmarks } = req.body;

//   if (!session_id || !pose_landmarks) {
//     return res.status(400).json({
//       error: "Missing required fields: session_id, pose_landmarks",
//     });
//   }

//   // Extract keypoints from pose_landmarks (assumes MediaPipe format)
//   const {
//     nose,
//     left_shoulder,
//     right_shoulder,
//     left_elbow,
//     right_elbow,
//     left_wrist,
//     right_wrist,
//     left_hip,
//     right_hip,
//     left_knee,
//     right_knee,
//     left_ankle,
//     right_ankle,
//   } = pose_landmarks;

//   // Calculate angles for biomechanical analysis
//   const angles = calculateAngles(pose_landmarks);

//   const sql = `
//     INSERT INTO pose_frames (
//       session_id, frame_number,
//       nose_x, nose_y, nose_confidence,
//       left_shoulder_x, left_shoulder_y, left_shoulder_confidence,
//       right_shoulder_x, right_shoulder_y, right_shoulder_confidence,
//       left_elbow_x, left_elbow_y, left_elbow_confidence,
//       right_elbow_x, right_elbow_y, right_elbow_confidence,
//       left_wrist_x, left_wrist_y, left_wrist_confidence,
//       right_wrist_x, right_wrist_y, right_wrist_confidence,
//       left_hip_x, left_hip_y, left_hip_confidence,
//       right_hip_x, right_hip_y, right_hip_confidence,
//       left_knee_x, left_knee_y, left_knee_confidence,
//       right_knee_x, right_knee_y, right_knee_confidence,
//       left_ankle_x, left_ankle_y, left_ankle_confidence,
//       right_ankle_x, right_ankle_y, right_ankle_confidence,
//       left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, back_angle
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `;

//   const values = [
//     session_id,
//     frame_number || 0,
//     nose?.x,
//     nose?.y,
//     nose?.z,
//     left_shoulder?.x,
//     left_shoulder?.y,
//     left_shoulder?.z,
//     right_shoulder?.x,
//     right_shoulder?.y,
//     right_shoulder?.z,
//     left_elbow?.x,
//     left_elbow?.y,
//     left_elbow?.z,
//     right_elbow?.x,
//     right_elbow?.y,
//     right_elbow?.z,
//     left_wrist?.x,
//     left_wrist?.y,
//     left_wrist?.z,
//     right_wrist?.x,
//     right_wrist?.y,
//     right_wrist?.z,
//     left_hip?.x,
//     left_hip?.y,
//     left_hip?.z,
//     right_hip?.x,
//     right_hip?.y,
//     right_hip?.z,
//     left_knee?.x,
//     left_knee?.y,
//     left_knee?.z,
//     right_knee?.x,
//     right_knee?.y,
//     right_knee?.z,
//     left_ankle?.x,
//     left_ankle?.y,
//     left_ankle?.z,
//     right_ankle?.x,
//     right_ankle?.y,
//     right_ankle?.z,
//     angles.left_arm,
//     angles.right_arm,
//     angles.left_leg,
//     angles.right_leg,
//     angles.back,
//   ];

//   console.log(`Inserting pose frame for session ${session_id}, frame ${frame_number}, values count: ${values.length}`);

//   db.query(sql, values, (err, result) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: "Failed to store pose data" });
//     }

//     console.log(`Pose frame inserted with id ${result.insertId}`);
//     res.status(201).json({
//       message: "Pose frame stored",
//       frame_id: result.insertId,
//     });
//   });
// });

// // ==================== FORM ERROR DETECTION & LOGGING ====================

// /**
//  * POST /api/workout/session/form-error
//  * Log detected form errors during workout
//  * Body: { session_id, frame_id, error_type, severity, body_part, description }
//  */
// router.post("/form-error", (req, res) => {
//   const { session_id, frame_id, error_type, severity, body_part, description } =
//     req.body;

//   if (!session_id || !error_type) {
//     return res.status(400).json({
//       error: "Missing required fields: session_id, error_type",
//     });
//   }

//   // Check if this is a recurring error
//   const checkRecurringSQL = `
//     SELECT is_recurring FROM behavioral_patterns 
//     WHERE member_id = (SELECT member_id FROM workout_sessions WHERE session_id = ?)
//     AND error_type = ?
//   `;

//   db.query(checkRecurringSQL, [session_id, error_type], (checkErr, checkResult) => {
//     const is_recurring = checkResult && checkResult.length > 0 && checkResult[0].is_recurring;

//     const sql = `
//       INSERT INTO form_errors (
//         session_id, frame_id, error_type, severity, body_part, error_description, is_recurring
//       ) VALUES (?, ?, ?, ?, ?, ?, ?)
//     `;

//     db.query(
//       sql,
//       [session_id, frame_id, error_type, severity || "medium", body_part, description, is_recurring],
//       (err, result) => {
//         if (err) {
//           console.error("Database error:", err);
//           return res.status(500).json({ error: "Failed to log form error" });
//         }

//         res.status(201).json({
//           message: "Form error logged",
//           error_id: result.insertId,
//           is_recurring_pattern: is_recurring,
//         });
//       }
//     );
//   });
// });

// // ==================== REP LOGGING ====================

// /**
//  * POST /api/workout/session/log-rep
//  * Log individual rep data during workout
//  * Body: { session_id, rep_number, rep_type, min_angle, max_angle, avg_angle }
//  */
// router.post("/log-rep", (req, res) => {
//   const { session_id, rep_number, rep_type, min_angle, max_angle, avg_angle } = req.body;

//   if (!session_id || !rep_number || !rep_type) {
//     return res.status(400).json({
//       error: "Missing required fields: session_id, rep_number, rep_type",
//     });
//   }

//   const sql = `
//     INSERT INTO rep_analysis (
//       session_id, rep_number, rep_type, min_angle, max_angle, avg_angle
//     ) VALUES (?, ?, ?, ?, ?, ?)
//   `;

//   db.query(sql, [session_id, rep_number, rep_type, min_angle, max_angle, avg_angle], (err, result) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: "Failed to log rep" });
//     }

//     res.status(201).json({
//       message: "Rep logged",
//       rep_id: result.insertId,
//     });
//   });
// });

// // ==================== SESSION COMPLETION & ANALYSIS ====================

// /**
//  * POST /api/workout/session/end
//  * End a workout session and trigger pattern analysis
//  * Body: { session_id, total_reps, total_sets }
//  */
// router.post("/end", (req, res) => {
//   const { session_id, total_reps, total_sets } = req.body;

//   if (!session_id) {
//     return res.status(400).json({ error: "Missing session_id" });
//   }

//   // Update session status
//   const updateSQL =
//     "UPDATE workout_sessions SET status = 'completed', session_end = NOW(), total_reps = ?, total_sets = ? WHERE session_id = ?";

//   db.query(updateSQL, [total_reps || 0, total_sets || 0, session_id], (err, result) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: "Failed to end session" });
//     }

//     // Get session info for pattern analysis
//     const getSessionSQL =
//       "SELECT member_id, exercise_id FROM workout_sessions WHERE session_id = ?";

//     db.query(getSessionSQL, [session_id], (getErr, sessionData) => {
//       if (getErr || !sessionData.length) {
//         return res.status(500).json({ error: "Session not found" });
//       }

//       const { member_id, exercise_id } = sessionData[0];

//       // Analyze patterns from this session
//       analyzePatterns(db, session_id, member_id, exercise_id, (analysisErr, patterns) => {
//         if (analysisErr) {
//           console.error("Pattern analysis error:", analysisErr);
//           return res.status(500).json({ error: "Pattern analysis failed" });
//         }

//         res.status(200).json({
//           message: "Workout session completed",
//           session_id,
//           patterns_identified: patterns,
//           timestamp: new Date(),
//         });
//       });
//     });
//   });
// });

// // ==================== FEEDBACK & COACHING ====================

// /**
//  * GET /api/workout/session/:sessionId/feedback
//  * Get adaptive coaching feedback for a session
//  */
// router.get("/:sessionId/feedback", (req, res) => {
//   const { sessionId } = req.params;

//   const sql = `
//     SELECT f.*, bp.pattern_score, e.exercise_name
//     FROM coaching_feedback f
//     LEFT JOIN behavioral_patterns bp ON f.pattern_id = bp.pattern_id
//     LEFT JOIN workout_sessions ws ON f.session_id = ws.session_id
//     LEFT JOIN exercises e ON ws.exercise_id = e.exercise_id
//     WHERE f.session_id = ?
//     ORDER BY f.generated_at DESC
//   `;

//   db.query(sql, [sessionId], (err, results) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: "Failed to retrieve feedback" });
//     }

//     res.status(200).json({
//       session_id: sessionId,
//       feedback: results || [],
//     });
//   });
// });

// /**
//  * GET /api/workout/session/:sessionId/patterns
//  * Get identified behavioral patterns for a session
//  */
// router.get("/:sessionId/patterns", (req, res) => {
//   const { sessionId } = req.params;

//   const sql = `
//     SELECT DISTINCT bp.*
//     FROM behavioral_patterns bp
//     JOIN form_errors fe ON fe.error_type = bp.error_type
//     JOIN workout_sessions ws ON fe.session_id = ws.session_id
//     WHERE ws.session_id = ?
//     ORDER BY bp.pattern_score DESC
//   `;

//   db.query(sql, [sessionId], (err, results) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: "Failed to retrieve patterns" });
//     }

//     res.status(200).json({
//       session_id: sessionId,
//       patterns: results || [],
//     });
//   });
// });

// /**
//  * GET /api/workout/session/:memberId/history
//  * Get member's persistent behavioral patterns across all sessions
//  */
// router.get("/member/:memberId/history", (req, res) => {
//   const { memberId } = req.params;

//   const sql = `
//     SELECT bp.*, e.exercise_name, COUNT(fe.error_id) as recent_occurrences
//     FROM behavioral_patterns bp
//     JOIN exercises e ON bp.exercise_id = e.exercise_id
//     LEFT JOIN form_errors fe ON fe.error_type = bp.error_type 
//       AND fe.session_id IN (
//         SELECT session_id FROM workout_sessions 
//         WHERE member_id = ? 
//         AND session_start > DATE_SUB(NOW(), INTERVAL 7 DAY)
//       )
//     WHERE bp.member_id = ? AND bp.is_persistent = TRUE
//     GROUP BY bp.pattern_id
//     ORDER BY bp.pattern_score DESC
//   `;

//   db.query(sql, [memberId, memberId], (err, results) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: "Failed to retrieve history" });
//     }

//     res.status(200).json({
//       member_id: memberId,
//       persistent_patterns: results || [],
//     });
//   });
// });

// module.exports = router;
