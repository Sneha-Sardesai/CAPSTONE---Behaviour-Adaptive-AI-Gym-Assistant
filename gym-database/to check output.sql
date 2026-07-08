USE mygym;

-- Get current session id
SELECT session_id, status, session_start
FROM workout_sessions
ORDER BY session_id DESC
LIMIT 1;

-- All squats in this session
SELECT * FROM workout_sessions;

-- Angle over time
SELECT frame_number, left_leg_angle
FROM pose_frames
WHERE session_id = (
	SELECT MAX(session_id)
    FROM workout_sessions
);

-- good vs bad reps
SELECT rep_type, COUNT(*) 
FROM rep_analysis
WHERE session_id = (
	SELECT MAX(session_id)
    FROM workout_sessions
)
GROUP BY rep_type;

-- common form errors
SELECT error_type, COUNT(*)
FROM form_errors
GROUP BY error_type;
