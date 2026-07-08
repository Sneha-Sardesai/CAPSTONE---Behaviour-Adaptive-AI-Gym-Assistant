/**
 * Adaptive Coaching Engine
 *
 * Generates personalized, behavior-adaptive coaching feedback based on:
 * - User's error history and patterns
 * - Learning speed and self-correction ability
 * - Error persistence and severity
 * - Individual progress trends
 */

/**
 * Analyze user's behavioral patterns and learning style
 * Determines coaching strategy (detailed guidance vs brief reminders)
 */
function analyzeUserBehavior(db, member_id, callback) {
  const sql = `
    SELECT 
      bp.pattern_id,
      bp.error_type,
      bp.exercise_id,
      bp.occurrence_count,
      bp.pattern_score,
      bp.is_persistent,
      bp.first_detected,
      bp.last_detected,
      e.exercise_name,
      COUNT(DISTINCT fe.session_id) as session_count,
      AVG(fe.severity = 'high') as high_severity_ratio
    FROM behavioral_patterns bp
    LEFT JOIN exercises e ON bp.exercise_id = e.exercise_id
    LEFT JOIN form_errors fe ON 
      fe.error_type = bp.error_type AND 
      fe.session_id IN (
        SELECT session_id FROM workout_sessions 
        WHERE member_id = ?
      )
    WHERE bp.member_id = ?
    GROUP BY bp.pattern_id, bp.error_type
    ORDER BY bp.pattern_score DESC
    LIMIT 10
  `;

  db.query(sql, [member_id, member_id], (err, patterns) => {
    if (err) {
      return callback(err, null);
    }

    // Analyze patterns to determine user profile
    const userProfile = {
      member_id,
      total_patterns: patterns ? patterns.length : 0,
      persistent_patterns: patterns
        ? patterns.filter((p) => p.is_persistent).length
        : 0,
      patterns,
    };

    // Categorize learning style
    if (patterns && patterns.length > 0) {
      const avgScore = patterns.reduce((sum, p) => sum + p.pattern_score, 0) / patterns.length;
      const highSeverityCount = patterns.filter((p) => p.high_severity_ratio > 0.5).length;

      userProfile.learning_style = categorizeUserStyle(
        patterns.length,
        avgScore,
        highSeverityCount
      );
    } else {
      userProfile.learning_style = "new_user";
    }

    callback(null, userProfile);
  });
}

/**
 * Categorize user learning style based on error patterns
 */
function categorizeUserStyle(
  patternCount,
  avgScore,
  highSeverityCount
) {
  if (patternCount === 0) {
    return "new_user";
  }

  if (avgScore > 70) {
    // Many recurring errors
    return "needs_detailed_guidance";
  }

  if (avgScore < 30 && patternCount < 3) {
    // Quick self-corrector
    return "quick_learner";
  }

  if (highSeverityCount > patternCount / 2) {
    // Many severe errors
    return "high_risk";
  }

  return "standard_learner";
}

/**
 * Generate adaptive coaching feedback for detected error
 * Adapts message based on user profile and error history
 */
function generateAdaptiveCoaching(db, member_id, error, session_id, callback) {
  // Get user behavior profile
  analyzeUserBehavior(db, member_id, (err, userProfile) => {
    if (err) {
      return callback(err, null);
    }

    // Check if this error is recurring
    const recurringPattern = userProfile.patterns?.find(
      (p) => p.error_type === error.error_type
    );

    // Generate feedback based on user style and error recurrence
    let coaching = generateCoachingMessage(
      error,
      userProfile.learning_style,
      recurringPattern
    );

    // Insert feedback into database
    const sql = `
      INSERT INTO coaching_feedback (
        session_id,
        pattern_id,
        feedback_type,
        message,
        confidence_score
      ) VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        session_id,
        recurringPattern?.pattern_id || null,
        coaching.type,
        coaching.message,
        coaching.confidence,
      ],
      (insertErr, result) => {
        if (insertErr) {
          return callback(insertErr, null);
        }

        coaching.feedback_id = result.insertId;
        callback(null, coaching);
      }
    );
  });
}

/**
 * Generate coaching message based on learning style and error history
 */
function generateCoachingMessage(error, learningStyle, recurringPattern) {
  const errorDescKey = error.error_type.replace(/_/g, "_");
  const errorMessages = {
    knee_fold_error: "knee depth",
    back_rounding: "back alignment",
    heel_lift: "foot position",
    knee_valgus: "knee tracking",
    rounded_back: "spine position",
    excessive_forward_lean: "torso angle",
    asymmetrical_arms: "arm balance",
    sagging_hips: "hip stability",
    uneven_lift: "symmetry",
    head_drop: "head position",
    extreme_torso_angle: "body alignment",
  };

  const errorDescription = errorMessages[errorDescKey] || error.error_type;

  let coachingMessage;
  let feedbackType;
  let confidence;

  // Adapt message based on whether error is recurring
  if (recurringPattern && recurringPattern.is_persistent) {
    // Persistent error - use short reminder with encouragement
    feedbackType = "short_reminder";
    coachingMessage = getShortReminder(errorDescription, learningStyle);
    confidence = Math.min(100, 60 + recurringPattern.pattern_score);
  } else if (error.severity === "high") {
    // High severity error - prioritize safety
    feedbackType = "warning";
    coachingMessage = getWarningMessage(errorDescription, learningStyle);
    confidence = 90;
  } else {
    // New or low-severity error - detailed guidance
    feedbackType = "detailed";
    coachingMessage = getDetailedGuidance(
      errorDescription,
      error,
      learningStyle
    );
    confidence = 70;
  }

  // Add encouragement for quick learners showing improvement
  if (
    learningStyle === "quick_learner" &&
    recurringPattern &&
    recurringPattern.pattern_score < 50
  ) {
    coachingMessage += " 💪 You're improving fast!";
    feedbackType = "encouragement";
  }

  return {
    type: feedbackType,
    message: coachingMessage,
    confidence: confidence,
    learning_style: learningStyle,
  };
}

/**
 * Generate short reminder for persistent errors
 * Used for users who have demonstrated ability to self-correct
 */
function getShortReminder(errorDescription, learningStyle) {
  const reminders = {
    new_user: [
      `Remember: keep your ${errorDescription} steady.`,
      `Quick tip: focus on ${errorDescription} this rep.`,
      `Watch your ${errorDescription}.`,
    ],
    quick_learner: [
      `You know this! ${errorDescription} first.`,
      `Quick remind: ${errorDescription}.`,
      `Again? Fix ${errorDescription} and move on.`,
    ],
    standard_learner: [
      `Let's nail the ${errorDescription} this time.`,
      `Focus on ${errorDescription} - you got this!`,
      `${errorDescription} - smooth and steady.`,
    ],
    needs_detailed_guidance: [
      `Back to basics: ${errorDescription}.`,
      `Keep thinking about ${errorDescription}.`,
      `${errorDescription} - stay focused.`,
    ],
    high_risk: [
      `STOP: Fix ${errorDescription} before continuing.`,
      `Critical: Correct ${errorDescription} now.`,
      `Safety first: ${errorDescription} is wrong.`,
    ],
  };

  const messages = reminders[learningStyle] || reminders.standard_learner;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Generate warning for high-severity errors (safety risk)
 */
function getWarningMessage(errorDescription, learningStyle) {
  const warnings = {
    new_user: [
      `⚠️ Watch out! ${errorDescription} can cause injury. Let me show you the correct form.`,
      `🛑 ${errorDescription} issue detected - this is risky. Let's reset and do it right.`,
    ],
    quick_learner: [
      `⚠️ Dangerous form: ${errorDescription}. Reset and do it correctly.`,
      `🛑 High-risk: ${errorDescription}. I need you to fix this.`,
    ],
    standard_learner: [
      `⚠️ Form breakdown: ${errorDescription} - this can hurt you. Correct it.`,
      `🛑 Important: ${errorDescription} is wrong. Let's reset and try again.`,
    ],
    needs_detailed_guidance: [
      `🛑 CRITICAL: ${errorDescription} is dangerous! Stop and reset.`,
      `⚠️ Injury risk: ${errorDescription}. We need to address this carefully.`,
    ],
    high_risk: [
      `🛑 STOP IMMEDIATELY: ${errorDescription} is dangerous. Reset before next rep.`,
      `🛑 CRITICAL FORM BREAKDOWN: ${errorDescription} - STOP and reset now!`,
    ],
  };

  const messages = warnings[learningStyle] || warnings.standard_learner;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Generate detailed guidance for new errors or users who need help
 */
function getDetailedGuidance(errorDescription, error, learningStyle) {
  const guidanceMap = {
    knee_depth: {
      new_user:
        "🎯 Your knees should bend to about 90 degrees. Keep your weight in your heels. Try practicing with a chair behind you.",
      quick_learner: "🎯 Deepen your squat to 90° - use your heels as anchor points.",
      standard_learner:
        "🎯 Work on knee depth. Squat until your knees are at 90 degrees while keeping your chest up.",
      needs_detailed_guidance:
        "🎯 Let's focus on the depth of your squat. Watch your knees: they should bend to about 90°. Practice with a wall or chair for support.",
      high_risk:
        "🎯 IMPORTANT: Your knee depth affects your entire squat. Bend to 90° for proper form and injury prevention.",
    },
    knee_tracking: {
      new_user:
        "🎯 Your knees should track over your toes. Let's keep those knees from caving inward. Watch your alignment!",
      quick_learner: "🎯 Keep knees aligned with toes - no valgus (caving in).",
      standard_learner:
        "🎯 Work on knee alignment. Your knees should track over your toes, not cave inward.",
      needs_detailed_guidance:
        "🎯 Knee tracking is crucial. Your knees must stay aligned with your toes throughout the movement. Feel the outside of your feet pushing into the ground.",
      high_risk:
        "🎯 CRITICAL: Knee valgus (caving in) is a major injury risk. Keep your knees tracking over your toes.",
    },
    back_alignment: {
      new_user:
        "🎯 Keep your back straight! A neutral spine is key. Imagine a string pulling the top of your head up.",
      quick_learner: "🎯 Neutral spine - no rounding or excessive lean.",
      standard_learner:
        "🎯 Maintain a neutral back position. Avoid rounding your spine at the bottom of the movement.",
      needs_detailed_guidance:
        "🎯 Back alignment is essential. Keep your spine neutral (not rounded). Engage your core and think about maintaining a proud chest.",
      high_risk:
        "🎯 CRITICAL: Back rounding can cause serious injury! Maintain a strict neutral spine throughout.",
    },
    foot_position: {
      new_user:
        "🎯 Keep your feet flat on the ground throughout. No heel lifting! Your feet are your foundation.",
      quick_learner: "🎯 Feet stay flat - heels stay down.",
      standard_learner:
        "🎯 Maintain foot contact. Keep your heels on the ground throughout the entire movement.",
      needs_detailed_guidance:
        "🎯 Your feet need to stay completely flat and grounded. Press through your heels, not your toes. Feel your full foot contact.",
      high_risk:
        "🎯 IMPORTANT: Heel lift affects stability and can lead to poor form. Keep your feet fully planted.",
    },
  };

  // Get guidance for this specific error
  const guidance = guidanceMap[errorDescription]?.[learningStyle];

  if (guidance) {
    return guidance;
  }

  // Fallback generic guidance
  const genericGuidance = {
    new_user: `🎯 Let's work on your ${errorDescription}. I'll help you correct this form issue.`,
    quick_learner: `🎯 Correct your ${errorDescription} - you know what to do!`,
    standard_learner: `🎯 Focus on improving your ${errorDescription}. Let's adjust the form.`,
    needs_detailed_guidance: `🎯 We need to work carefully on your ${errorDescription}. Pay close attention and make small adjustments.`,
    high_risk: `🎯 Your ${errorDescription} needs immediate correction. This is important for your safety.`,
  };

  return genericGuidance[learningStyle] || genericGuidance.standard_learner;
}

/**
 * Analyze user improvement over time
 * Tracks progress in correcting persistent errors
 */
function analyzeUserImprovement(db, member_id, exercise_id, callback) {
  // Get recent sessions (last 2 weeks)
  const sql = `
    SELECT 
      ws.session_id,
      ws.session_start,
      COUNT(DISTINCT fe.error_id) as error_count,
      COUNT(DISTINCT 
        CASE WHEN fe.is_recurring = TRUE THEN fe.error_id END
      ) as recurring_error_count,
      AVG(CASE WHEN fe.severity = 'high' THEN 1 ELSE 0 END) as high_severity_ratio
    FROM workout_sessions ws
    LEFT JOIN form_errors fe ON ws.session_id = fe.session_id
    WHERE ws.member_id = ?
      AND ws.exercise_id = ?
      AND ws.session_start > DATE_SUB(NOW(), INTERVAL 14 DAY)
    GROUP BY ws.session_id
    ORDER BY ws.session_start DESC
    LIMIT 10
  `;

  db.query(sql, [member_id, exercise_id], (err, sessions) => {
    if (err) {
      return callback(err, null);
    }

    if (!sessions || sessions.length < 2) {
      return callback(null, {
        improvement_trend: "insufficient_data",
        improvement_rate: 0,
        sessions_analyzed: sessions ? sessions.length : 0,
      });
    }

    // Calculate improvement trend
    const firstSession = sessions[sessions.length - 1];
    const latestSession = sessions[0];

    const improvementRate =
      ((firstSession.error_count - latestSession.error_count) / firstSession.error_count) * 100;

    const trend =
      improvementRate > 20 ? "improving_rapidly" : improvementRate > 5 ? "improving" : "plateau";

    callback(null, {
      improvement_trend: trend,
      improvement_rate: Math.round(improvementRate),
      sessions_analyzed: sessions.length,
      first_session_errors: firstSession.error_count,
      latest_session_errors: latestSession.error_count,
    });
  });
}

/**
 * Get personalized coaching summary for member
 * High-level overview of progress and focus areas
 */
function getCoachingSummary(db, member_id, callback) {
  analyzeUserBehavior(db, member_id, (err, userProfile) => {
    if (err) {
      return callback(err, null);
    }

    const summary = {
      member_id,
      learning_style: userProfile.learning_style,
      total_patterns: userProfile.total_patterns,
      persistent_patterns: userProfile.persistent_patterns,
      main_focus_areas: userProfile.patterns ? userProfile.patterns.slice(0, 3) : [],
      recommendation: getCoachingRecommendation(userProfile),
    };

    callback(null, summary);
  });
}

/**
 * Get personalized coaching recommendation
 */
function getCoachingRecommendation(userProfile) {
  const style = userProfile.learning_style;
  const patternCount = userProfile.total_patterns;
  const persistentCount = userProfile.persistent_patterns;

  const recommendations = {
    new_user: "Welcome! Focus on learning correct form with calm, detailed guidance.",
    quick_learner:
      "You're improving fast! Keep pushing and challenge yourself with slightly harder variations.",
    standard_learner:
      "You're making good progress. Focus on consistency and the errors that appear most often.",
    needs_detailed_guidance:
      "Let's slow down and work on form fundamentals. Small corrections will make a big difference.",
    high_risk:
      "Safety first! We need to address the high-severity issues before progressing further.",
  };

  return recommendations[style];
}

module.exports = {
  analyzeUserBehavior,
  generateAdaptiveCoaching,
  generateCoachingMessage,
  analyzeUserImprovement,
  getCoachingSummary,
  categorizeUserStyle,
};
