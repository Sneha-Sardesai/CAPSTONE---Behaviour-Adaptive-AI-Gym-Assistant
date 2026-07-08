USE mygym;

CREATE INDEX idx_member_sessions
    ON workout_sessions(member_id, exercise_id);

CREATE INDEX idx_pose_session_time
    ON pose_frames(session_id, frame_timestamp);

CREATE INDEX idx_rep_session
    ON rep_analysis(session_id, rep_type);

CREATE INDEX idx_form_errors_session
    ON form_errors(session_id);

CREATE INDEX idx_behavioral_patterns_member
    ON behavioral_patterns(member_id, is_persistent);