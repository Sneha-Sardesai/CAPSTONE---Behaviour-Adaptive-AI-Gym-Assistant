USE mygym;

-- Average angles per session
CREATE VIEW session_angle_summary AS
SELECT
    session_id,
    AVG(left_leg_angle) AS avg_left_leg_angle,
    AVG(right_leg_angle) AS avg_right_leg_angle,
    AVG(back_angle) AS avg_back_angle
FROM pose_frames
GROUP BY session_id;