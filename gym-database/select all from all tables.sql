use mygym;

select * from pose_frames;
select * from rep_analysis;
select * from form_errors;
select * from workout_sessions;
select * from behavioral_patterns;
select * from users;

select * from workout_sessions where user_id = 1;
select * from workout_sessions where user_id = 3;

SELECT COUNT(*) FROM pose_frames;
SELECT * FROM pose_frames ORDER BY frame_id DESC LIMIT 5;

SELECT frame_id, session_id, frame_number
FROM pose_frames
ORDER BY frame_id DESC
LIMIT 5;