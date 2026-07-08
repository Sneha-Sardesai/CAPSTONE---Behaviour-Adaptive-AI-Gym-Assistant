USE mygym;

-- 1. CHECK IF ANY DATA EXISTS

SELECT 'workout_sessions' AS table_name,
       COUNT(*) AS records
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
FROM rep_analysis;

-- 2. GET LATEST SESSION

SELECT ws.session_id,
    m.name,
    e.exercise_name,
    ws.session_start,
    ws.total_reps,
    ws.status
FROM workout_sessions ws
    JOIN members m ON ws.member_id = m.member_id
    JOIN exercises e ON ws.exercise_id = e.exercise_id
ORDER BY ws.session_id DESC
LIMIT 1;

-- 3. CHECK POSE FRAMES FOR LATEST SESSION

SET @latest_session = (
        SELECT MAX(session_id)
        FROM workout_sessions
    );
SELECT COUNT(*) as pose_frames_stored
FROM pose_frames
WHERE session_id = @latest_session;

-- 4. CHECK FORM ERRORS FOR LATEST SESSION  

SELECT error_type,
    body_part,
    severity,
    COUNT(*) as count
FROM form_errors
WHERE session_id = @latest_session
GROUP BY error_type,
    body_part,
    severity;
    
-- 5. CHECK REPS FOR LATEST SESSION

SELECT rep_number,
    rep_type,
    ROUND(avg_angle, 1) as angle
FROM rep_analysis
WHERE session_id = @latest_session
ORDER BY rep_number;

-- 6. SESSION SUMMARY

SELECT COUNT(DISTINCT pf.frame_id) as pose_frames,
    COUNT(DISTINCT fe.error_id) as form_errors,
    COUNT(DISTINCT ra.rep_id) as reps_logged,
    COUNT(DISTINCT bp.pattern_id) as patterns_identified
FROM workout_sessions ws
    LEFT JOIN pose_frames pf ON ws.session_id = pf.session_id
    LEFT JOIN form_errors fe ON ws.session_id = fe.session_id
    LEFT JOIN rep_analysis ra ON ws.session_id = ra.session_id
    LEFT JOIN behavioral_patterns bp ON ws.member_id = bp.member_id
WHERE ws.session_id = @latest_session;