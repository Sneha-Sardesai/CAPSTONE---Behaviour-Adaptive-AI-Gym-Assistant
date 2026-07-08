USE mygym;

INSERT INTO workout_sessions (member_id, exercise_id, total_reps, good_reps, bad_reps, status)
VALUES (1, 1, 12, 9, 3, 'completed');

INSERT INTO rep_analysis (session_id, rep_number, rep_type, min_angle, max_angle, avg_angle)
VALUES
(1, 1, 'good', 70, 160, 115),
(1, 2, 'bad', 60, 120, 90);