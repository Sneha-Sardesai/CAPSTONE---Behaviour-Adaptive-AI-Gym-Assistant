use mygym;

-- Get current session id
SELECT session_id, status, session_start
FROM workout_sessions
ORDER BY session_id DESC
LIMIT 1;

-- are pose frames being stored?
SELECT COUNT(*) AS total_frames
FROM pose_frames
WHERE session_id = 12;

-- inspecting raw pose data
SELECT frame_number,
       left_leg_angle,
       right_leg_angle,
       back_angle
FROM pose_frames
WHERE session_id = 12
ORDER BY frame_number
LIMIT 10;

-- are reps being recorded?
SELECT rep_number,
       rep_type,
       min_angle,
       max_angle,
       avg_angle
FROM rep_analysis
WHERE session_id = 12
ORDER BY rep_number;

-- are form errors being logged?
SELECT error_type,
       body_part,
       severity,
       description,
       detected_at
FROM form_errors
WHERE session_id = 6
ORDER BY detected_at;

-- SESSION SUMMARY
SELECT
    ws.session_id,
    ws.total_reps,
    ws.good_reps,
    ws.bad_reps,
    COUNT(DISTINCT ra.rep_id) AS reps_logged,
    COUNT(DISTINCT fe.error_id) AS errors_logged
FROM workout_sessions ws
LEFT JOIN rep_analysis ra ON ws.session_id = ra.session_id
LEFT JOIN form_errors fe ON ws.session_id = fe.session_id
WHERE ws.session_id = 12
GROUP BY ws.session_id;