/**
 * Utility functions for pose analysis and behavioral pattern recognition
 */

/**
 * Calculate distances between two points
 */
function getDistance(p1, p2) {
  if (!p1 || !p2) return 0;
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Calculate angle between three points (in degrees)
 * p1 is the middle point (vertex of angle)
 */
function getAngle(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return 0;

  const v1 = {
    x: p2.x - p1.x,
    y: p2.y - p1.y,
  };

  const v2 = {
    x: p3.x - p1.x,
    y: p3.y - p1.y,
  };

  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const magnitude = Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (magnitude === 0) return 0;

  const cosAngle = dotProduct / magnitude;
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  return (angleRad * 180) / Math.PI;
}

/**
 * Calculate all relevant biomechanical angles from pose landmarks
 * Input: pose_landmarks object with keypoint positions
 * Output: object with calculated angles
 */
function calculateAngles(landmarks) {
  const {
    nose,
    left_shoulder,
    right_shoulder,
    left_elbow,
    right_elbow,
    left_wrist,
    right_wrist,
    left_hip,
    right_hip,
    left_knee,
    right_knee,
    left_ankle,
    right_ankle,
  } = landmarks;

  return {
    // Arm angles (elbow flexion)
    left_arm: getAngle(left_shoulder, left_elbow, left_wrist),
    right_arm: getAngle(right_shoulder, right_elbow, right_wrist),

    // Leg angles (knee flexion)
    left_leg: getAngle(left_hip, left_knee, left_ankle),
    right_leg: getAngle(right_hip, right_knee, right_ankle),

    // Back/Torso angle (relative to vertical)
    back: getAngle(
      { x: 0, y: -1 },
      {
        x: (left_shoulder.x + right_shoulder.x) / 2,
        y: (left_shoulder.y + right_shoulder.y) / 2,
      },
      {
        x: (left_hip.x + right_hip.x) / 2,
        y: (left_hip.y + right_hip.y) / 2,
      }
    ),
  };
}

/**
 * Detect form errors based on pose data
 * Analyzes joint angles and positions against exercise-specific constraints
 */
function detectFormErrors(exercise_type, angles, landmarks) {
  const errors = [];

  switch (exercise_type.toLowerCase()) {
    case "squats":
      errors.push(...detectSquatErrors(angles, landmarks));
      break;

    case "deadlifts":
      errors.push(...detectDeadliftErrors(angles, landmarks));
      break;

    case "push-ups":
      errors.push(...detectPushupErrors(angles, landmarks));
      break;

    case "bench press":
      errors.push(...detectBenchPressErrors(angles, landmarks));
      break;

    case "plank":
      errors.push(...detectPlankErrors(angles, landmarks));
      break;

    default:
      // Generic error detection
      errors.push(...detectGenericErrors(angles, landmarks));
  }

  return errors;
}

/**
 * Squat-specific error detection
 */
function detectSquatErrors(angles, landmarks) {
  const errors = [];
  const { left_leg, right_leg, back } = angles;
  const {
    left_knee,
    right_knee,
    left_ankle,
    right_ankle,
    left_hip,
    right_hip,
  } = landmarks;

  // Knee folding - knees should flex to ~90 degrees
  if (left_leg < 70 || left_leg > 130) {
    errors.push({
      type: "knee_fold_error",
      severity: left_leg < 60 || left_leg > 140 ? "high" : "medium",
      body_part: "left_knee",
      description: `Left knee angle ${left_leg.toFixed(1)}° - target 90°`,
    });
  }

  if (right_leg < 70 || right_leg > 130) {
    errors.push({
      type: "knee_fold_error",
      severity: right_leg < 60 || right_leg > 140 ? "high" : "medium",
      body_part: "right_knee",
      description: `Right knee angle ${right_leg.toFixed(1)}° - target 90°`,
    });
  }

  // Back rounding - back should stay neutral (75-105 degrees)
  if (back < 70 || back > 110) {
    errors.push({
      type: "back_rounding",
      severity: "high",
      body_part: "back",
      description: `Back angle ${back.toFixed(1)}° - keep neutral (75-105°)`,
    });
  }

  // Heel lift detection - ankles should be relatively flat
  if (left_ankle && right_ankle) {
    const heelLiftDetected = left_ankle.y < left_knee.y * 0.95 || right_ankle.y < right_knee.y * 0.95;
    if (heelLiftDetected) {
      errors.push({
        type: "heel_lift",
        severity: "medium",
        body_part: "feet",
        description: "Heels are lifting - keep feet flat",
      });
    }
  }

  // Knee valgus/varus (knees caving in or out)
  if (left_knee && right_knee && left_hip && right_hip) {
    const kneeInward =
      Math.abs(left_knee.x - left_hip.x) < Math.abs(right_knee.x - right_hip.x) * 0.7;
    if (kneeInward) {
      errors.push({
        type: "knee_valgus",
        severity: "high",
        body_part: "knees",
        description: "Knees caving inward (valgus) - keep aligned with toes",
      });
    }
  }

  return errors;
}

/**
 * Deadlift-specific error detection
 */
function detectDeadliftErrors(angles, landmarks) {
  const errors = [];
  const { back, left_leg, right_leg } = angles;

  // Back should be straight (nearly vertical during movement)
  if (back < 60 || back > 120) {
    errors.push({
      type: "rounded_back",
      severity: back < 50 || back > 130 ? "high" : "medium",
      body_part: "back",
      description: `Back angle ${back.toFixed(1)}° - keep spine neutral`,
    });
  }

  // Excessive forward lean
  if (back < 70) {
    errors.push({
      type: "excessive_forward_lean",
      severity: "high",
      body_part: "torso",
      description: "Leaning too far forward - engage back muscles",
    });
  }

  return errors;
}

/**
 * Push-up-specific error detection
 */
function detectPushupErrors(angles, landmarks) {
  const errors = [];
  const { left_arm, right_arm, back } = angles;

  // Elbow angle should be ~90 degrees at bottom
  const armAngleDiff = Math.abs(left_arm - right_arm);
  if (armAngleDiff > 20) {
    errors.push({
      type: "asymmetrical_arms",
      severity: "medium",
      body_part: "arms",
      description: `Arm angles differ by ${armAngleDiff.toFixed(1)}° - push evenly`,
    });
  }

  // Hips should stay level (back angle 0-10 degrees variation)
  if (back < -10 || back > 20) {
    errors.push({
      type: "sagging_hips",
      severity: "medium",
      body_part: "hips",
      description: "Hips sagging - keep body straight",
    });
  }

  return errors;
}

/**
 * Bench press-specific error detection
 */
function detectBenchPressErrors(angles, landmarks) {
  const errors = [];
  const { left_arm, right_arm, back } = angles;

  // Arms should move symmetrically
  const armAngleDiff = Math.abs(left_arm - right_arm);
  if (armAngleDiff > 15) {
    errors.push({
      type: "uneven_lift",
      severity: "medium",
      body_part: "arms",
      description: `Arms uneven by ${armAngleDiff.toFixed(1)}° - maintain control`,
    });
  }

  return errors;
}

/**
 * Plank-specific error detection
 */
function detectPlankErrors(angles, landmarks) {
  const errors = [];
  const { back } = angles;
  const { left_shoulder, right_shoulder, left_hip, right_hip, nose } = landmarks;

  // Back should be perfectly level
  if (back < -10 || back > 15) {
    errors.push({
      type: "sagging_hips",
      severity: "high",
      body_part: "hips",
      description: "Hips sagging - engage core and keep body straight",
    });
  }

  // Head alignment (should be neutral with spine)
  const headAlignment = nose.y - (left_hip.y + right_hip.y) / 2;
  if (Math.abs(headAlignment) > 0.2) {
    errors.push({
      type: "head_drop",
      severity: "low",
      body_part: "head",
      description: "Keep head neutral - don't look up or down",
    });
  }

  return errors;
}

/**
 * Generic error detection for unknown exercises
 */
function detectGenericErrors(angles, landmarks) {
  const errors = [];

  // Check for extreme angles
  if (angles.back < 30 || angles.back > 150) {
    errors.push({
      type: "extreme_torso_angle",
      severity: "high",
      body_part: "torso",
      description: "Torso angle is extreme - check body alignment",
    });
  }

  return errors;
}

/**
 * Analyze behavioral patterns for a session
 * Updates the behavioral_patterns table with recurring errors
 */
function analyzePatterns(db, session_id, member_id, exercise_id, callback) {
  // Get all errors from this session
  const getErrorsSQL = `
    SELECT DISTINCT error_type, COUNT(*) as count
    FROM form_errors
    WHERE session_id = ?
    GROUP BY error_type
  `;

  db.query(getErrorsSQL, [session_id], (err, errors) => {
    if (err) {
      return callback(err, null);
    }

    if (!errors || errors.length === 0) {
      return callback(null, []);
    }

    const patterns = [];

    // Process each error type
    errors.forEach((error) => {
      const checkPatternSQL = `
        SELECT pattern_id, occurrence_count, is_persistent
        FROM behavioral_patterns
        WHERE member_id = ?
        AND exercise_id = ?
        AND error_type = ?
      `;

      db.query(
        checkPatternSQL,
        [member_id, exercise_id, error.error_type],
        (checkErr, existingPattern) => {
          if (!checkErr && existingPattern && existingPattern.length > 0) {
            // Update existing pattern
            const newCount = existingPattern[0].occurrence_count + error.count;
            const isPersistent = newCount >= 3; // Mark as persistent after 3+ occurrences
            const patternScore = Math.min(100, (newCount / 10) * 100); // Score out of 100

            const updateSQL = `
              UPDATE behavioral_patterns
              SET occurrence_count = ?, 
                  pattern_score = ?,
                  is_persistent = ?,
                  last_detected = NOW()
              WHERE pattern_id = ?
            `;

            db.query(
              updateSQL,
              [newCount, patternScore, isPersistent, existingPattern[0].pattern_id],
              (updateErr) => {
                if (!updateErr) {
                  patterns.push({
                    error_type: error.error_type,
                    occurrence_count: newCount,
                    is_persistent: isPersistent,
                    pattern_score: patternScore,
                  });
                }
              }
            );
          } else {
            // Create new pattern
            const insertSQL = `
              INSERT INTO behavioral_patterns
              (member_id, exercise_id, error_type, occurrence_count, pattern_score, is_persistent)
              VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(
              insertSQL,
              [member_id, exercise_id, error.error_type, error.count, 10, false],
              (insertErr) => {
                if (!insertErr) {
                  patterns.push({
                    error_type: error.error_type,
                    occurrence_count: error.count,
                    is_persistent: false,
                    pattern_score: 10,
                  });
                }
              }
            );
          }
        }
      );
    });

    // Return patterns after processing
    setTimeout(() => {
      callback(null, patterns);
    }, 100);
  });
}

/**
 * Generate adaptive coaching feedback based on patterns
 */
function generateCoachingFeedback(errorPattern, member_history) {
  let feedback_type = "detailed";
  let message = "";

  // Detailed feedback for recurring errors
  if (errorPattern.is_persistent) {
    feedback_type = "short_reminder";
    const errorTypeReadable = errorPattern.error_type.replace(/_/g, " ");
    message = `You've done this before - remember, no ${errorTypeReadable}. Keep your form tight!`;
  } else {
    feedback_type = "detailed";
    message = `Detected form issue: ${errorPattern.error_type}. Let's work on this together to improve your technique.`;
  }

  // Encouragement for good progress
  if (member_history && member_history.improvement_rate > 80) {
    feedback_type = "encouragement";
    message = "Great form improvement! You're making excellent progress.";
  }

  return {
    feedback_type,
    message,
    confidence_score: Math.min(100, errorPattern.pattern_score * 1.2),
  };
}

module.exports = {
  calculateAngles,
  detectFormErrors,
  analyzePatterns,
  generateCoachingFeedback,
  // Export helper functions for testing
  getAngle,
  getDistance,
};
