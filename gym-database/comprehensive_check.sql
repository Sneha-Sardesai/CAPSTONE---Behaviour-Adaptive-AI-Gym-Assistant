-- ===========================================
-- COMPREHENSIVE DATABASE CHECK QUERIES
-- ===========================================
USE mygym;
-- 1. CHECK IF TABLES EXIST AND HAVE DATA
-- ===========================================
-- Check all AI-related tables
SELECT 'workout_sessions' as table_name,
    COUNT(*) as row_count
FROM workout_sessions
UNION ALL
SELECT 'pose_frames',
    COUNT(*)
FROM pose_frames
UNION ALL
SELECT 'form_errors',
    COUNT(*)
FROM form_errors
UNION ALL
SELECT 'rep_analysis',
    COUNT(*)
FROM rep_analysis
UNION ALL
SELECT 'behavioral_patterns',
    COUNT(*)
FROM behavioral_patterns
UNION ALL
SELECT 'coaching_feedback',
    COUNT(*)
FROM coaching_feedback;
COUNT(*)
FROM behavioral_patterns
UNION ALL
SELECT 'coaching_feedback',
    COUNT(*)
FROM coaching_feedback;
-- 2. GET LATEST SESSION INFO
-- ===========================================
-- Find the most recent session
SELECT ws.session_id,
    m.name as member_name,
    e.exercise_name,
    ws.session_start,
    ws.session_end,
    ws.total_reps,
    ws.status,
    TIMESTAMPDIFF(
        MINUTE,
        ws.session_start,
        COALESCE(ws.session_end, NOW())
    ) as duration_minutes
FROM workout_sessions ws
    JOIN members m ON ws.member_id = m.member_id
    JOIN exercises e ON ws.exercise_id = e.exercise_id
ORDER BY ws.session_id DESC
LIMIT 5;
-- 3. POSE DATA ANALYSIS
-- ===========================================
-- Get latest session ID for detailed analysis
SET @latest_session = (
        SELECT MAX(session_id)
        FROM workout_sessions
    );
-- Check pose frames for latest session
SELECT COUNT(*) as total_frames,
    MIN(frame_timestamp) as first_frame,
    MAX(frame_timestamp) as last_frame,
    TIMESTAMPDIFF(
        SECOND,
        MIN(frame_timestamp),
        MAX(frame_timestamp)
    ) as session_duration_seconds
FROM pose_frames
WHERE session_id = @latest_session;
-- Sample pose angles over time (every 10th frame)
SELECT frame_number,
    frame_timestamp,
    left_leg_angle,
    right_leg_angle,
    back_angle,
    left_arm_angle,
    right_arm_angle
FROM pose_frames
WHERE session_id = @latest_session
    AND frame_number % 10 = 0 -- Every 10th frame
ORDER BY frame_number
LIMIT 20;
-- 4. FORM ERRORS ANALYSIS
-- ===========================================
-- All form errors for latest session
SELECT error_type,
    body_part,
    severity,
    description,
    detected_at,
    is_recurring
FROM form_errors
WHERE session_id = @latest_session
ORDER BY detected_at;
-- Error frequency by type
SELECT error_type,
    body_part,
    severity,
    COUNT(*) as occurrences,
    GROUP_CONCAT(DISTINCT description SEPARATOR '; ') as descriptions
FROM form_errors
WHERE session_id = @latest_session
GROUP BY error_type,
    body_part,
    severity
ORDER BY occurrences DESC;
-- 5. BEHAVIORAL PATTERNS
-- ===========================================
-- Check if patterns were identified
SELECT bp.pattern_id,
    bp.error_type,
    bp.occurrence_count,
    bp.pattern_score,
    bp.is_persistent,
    bp.first_detected,
    bp.last_detected,
    e.exercise_name
FROM behavioral_patterns bp
    JOIN exercises e ON bp.exercise_id = e.exercise_id
WHERE bp.member_id = (
        SELECT member_id
        FROM workout_sessions
        WHERE session_id = @latest_session
    )
ORDER BY bp.pattern_score DESC;
-- 6. COACHING FEEDBACK
-- ===========================================
-- Check generated coaching feedback
SELECT cf.feedback_type,
    cf.message,
    cf.confidence_score,
    cf.generated_at,
    bp.pattern_score,
    bp.error_type
FROM coaching_feedback cf
    LEFT JOIN behavioral_patterns bp ON cf.pattern_id = bp.pattern_id
WHERE cf.session_id = @latest_session
ORDER BY cf.generated_at DESC;
-- 7. SESSION SUMMARY REPORT
-- ===========================================
-- Complete session analysis
SELECT 'SESSION SUMMARY' as report_section,
    ws.session_id,
    m.name as member_name,
    e.exercise_name,
    ws.session_start,
    ws.session_end,
    ws.total_reps,
    ws.status,
    TIMESTAMPDIFF(
        MINUTE,
        ws.session_start,
        COALESCE(ws.session_end, NOW())
    ) as duration_minutes,
    -- Pose data stats
    (
        SELECT COUNT(*)
        FROM pose_frames
        WHERE session_id = ws.session_id
    ) as total_pose_frames,
    (
        SELECT COUNT(*)
        FROM form_errors
        WHERE session_id = ws.session_id
    ) as total_form_errors,
    -- Pattern analysis
    (
        SELECT COUNT(*)
        FROM behavioral_patterns
        WHERE member_id = ws.member_id
    ) as total_patterns_identified,
    (
        SELECT AVG(pattern_score)
        FROM behavioral_patterns
        WHERE member_id = ws.member_id
    ) as avg_pattern_score,
    -- Coaching feedback
    (
        SELECT COUNT(*)
        FROM coaching_feedback
        WHERE session_id = ws.session_id
    ) as coaching_messages_generated
FROM workout_sessions ws
    JOIN members m ON ws.member_id = m.member_id
    JOIN exercises e ON ws.exercise_id = e.exercise_id
WHERE ws.session_id = @latest_session;
-- 8. ANGLE ANALYSIS FOR SQUATS
-- ===========================================
-- Analyze knee angles for squat depth (good squats: 50-125°, deep squats: <50°)
SELECT frame_number,
    frame_timestamp,
    (left_leg_angle + right_leg_angle) / 2 as avg_knee_angle,
    CASE
        WHEN (left_leg_angle + right_leg_angle) / 2 BETWEEN 50 AND 125 THEN 'Good Depth'
        WHEN (left_leg_angle + right_leg_angle) / 2 < 50 THEN 'Too Deep'
        WHEN (left_leg_angle + right_leg_angle) / 2 > 125 THEN 'Not Deep Enough'
        ELSE 'Unknown'
    END as squat_quality,
    back_angle,
    CASE
        WHEN back_angle > 160 THEN 'Good Posture'
        WHEN back_angle BETWEEN 140 AND 160 THEN 'Slight Rounding'
        ELSE 'Poor Posture'
    END as back_posture
FROM pose_frames
WHERE session_id = @latest_session
    AND frame_number % 5 = 0 -- Sample every 5th frame
ORDER BY frame_number
LIMIT 50;
-- 9. ERROR TIMELINE
-- ===========================================
-- Form errors over time
SELECT DATE_FORMAT(detected_at, '%H:%i:%s') as time,
    error_type,
    severity,
    description
FROM form_errors
WHERE session_id = @latest_session
ORDER BY detected_at;
-- 10. DATA INTEGRITY CHECKS
-- ===========================================
-- Check for orphaned records
SELECT 'Orphaned pose_frames' as issue,
    COUNT(*) as count
FROM pose_frames pf
    LEFT JOIN workout_sessions ws ON pf.session_id = ws.session_id
WHERE ws.session_id IS NULL
UNION ALL
SELECT 'Orphaned form_errors',
    COUNT(*)
FROM form_errors fe
    LEFT JOIN workout_sessions ws ON fe.session_id = ws.session_id
WHERE ws.session_id IS NULL
UNION ALL
SELECT 'Orphaned coaching_feedback',
    COUNT(*)
FROM coaching_feedback cf
    LEFT JOIN workout_sessions ws ON cf.session_id = ws.session_id
WHERE ws.session_id IS NULL;