const express = require("express");
const router = express.Router();
const db = require("../db");
const {
  analyzeUserBehavior,
  generateAdaptiveCoaching,
  analyzeUserImprovement,
  getCoachingSummary,
} = require("../utils/adaptiveCoaching");

/**
 * POST /api/coaching/feedback
 * Generate adaptive coaching feedback for a detected error
 * Body: { member_id, session_id, error }
 */
router.post("/feedback", (req, res) => {
  const { member_id, session_id, error } = req.body;

  if (!member_id || !session_id || !error) {
    return res.status(400).json({
      error: "Missing required fields: member_id, session_id, error",
    });
  }

  // Generate adaptive coaching
  generateAdaptiveCoaching(db, member_id, error, session_id, (err, coaching) => {
    if (err) {
      console.error("Coaching generation error:", err);
      return res.status(500).json({
        error: "Failed to generate coaching feedback",
      });
    }

    res.status(200).json({
      message: "Coaching feedback generated",
      coaching: coaching,
    });
  });
});

/**
 * GET /api/coaching/member/:memberId/profile
 * Get member's learning profile and behavioral analysis
 */
router.get("/member/:memberId/profile", (req, res) => {
  const { memberId } = req.params;

  analyzeUserBehavior(db, memberId, (err, profile) => {
    if (err) {
      console.error("Profile analysis error:", err);
      return res.status(500).json({
        error: "Failed to analyze member profile",
      });
    }

    res.status(200).json({
      member_id: memberId,
      profile: profile,
    });
  });
});

/**
 * GET /api/coaching/member/:memberId/summary
 * Get personalized coaching summary and recommendations
 */
router.get("/member/:memberId/summary", (req, res) => {
  const { memberId } = req.params;

  getCoachingSummary(db, memberId, (err, summary) => {
    if (err) {
      console.error("Summary generation error:", err);
      return res.status(500).json({
        error: "Failed to generate coaching summary",
      });
    }

    res.status(200).json({
      summary: summary,
    });
  });
});

/**
 * GET /api/coaching/member/:memberId/exercise/:exerciseId/improvement
 * Analyze user improvement on specific exercise
 */
router.get("/member/:memberId/exercise/:exerciseId/improvement", (req, res) => {
  const { memberId, exerciseId } = req.params;

  analyzeUserImprovement(db, memberId, exerciseId, (err, improvement) => {
    if (err) {
      console.error("Improvement analysis error:", err);
      return res.status(500).json({
        error: "Failed to analyze improvement",
      });
    }

    res.status(200).json({
      member_id: memberId,
      exercise_id: exerciseId,
      improvement: improvement,
    });
  });
});

/**
 * GET /api/coaching/member/:memberId/recommendations
 * Get detailed recommendations for all exercises
 */
router.get("/member/:memberId/recommendations", (req, res) => {
  const { memberId } = req.params;

  // Get all persistent patterns for the member
  const sql = `
    SELECT 
      bp.pattern_id,
      bp.exercise_id,
      bp.error_type,
      bp.pattern_score,
      bp.is_persistent,
      e.exercise_name,
      COUNT(DISTINCT ws.session_id) as session_count
    FROM behavioral_patterns bp
    JOIN exercises e ON bp.exercise_id = e.exercise_id
    LEFT JOIN form_errors fe ON 
      fe.error_type = bp.error_type AND 
      fe.session_id IN (
        SELECT session_id FROM workout_sessions 
        WHERE member_id = ?
      )
    LEFT JOIN workout_sessions ws ON fe.session_id = ws.session_id
    WHERE bp.member_id = ? AND bp.is_persistent = TRUE
    GROUP BY bp.pattern_id
    ORDER BY e.exercise_name, bp.pattern_score DESC
  `;

  db.query(sql, [memberId, memberId], (err, patterns) => {
    if (err) {
      console.error("Recommendations query error:", err);
      return res.status(500).json({
        error: "Failed to get recommendations",
      });
    }

    // Group by exercise
    const recommendations = {};
    if (patterns) {
      patterns.forEach((pattern) => {
        if (!recommendations[pattern.exercise_name]) {
          recommendations[pattern.exercise_name] = [];
        }
        recommendations[pattern.exercise_name].push({
          error_type: pattern.error_type,
          priority: pattern.pattern_score > 70 ? "high" : "medium",
          focus_area: pattern.error_type.replace(/_/g, " "),
          sessions_with_error: pattern.session_count,
        });
      });
    }

    res.status(200).json({
      member_id: memberId,
      recommendations_by_exercise: recommendations,
    });
  });
});

module.exports = router;
