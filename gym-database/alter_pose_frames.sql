-- Alter pose_frames table to match the full schema
USE mygym;
-- Add nose columns
ALTER TABLE pose_frames
ADD COLUMN nose_x FLOAT
AFTER frame_number;
ALTER TABLE pose_frames
ADD COLUMN nose_y FLOAT
AFTER nose_x;
ALTER TABLE pose_frames
ADD COLUMN nose_confidence FLOAT
AFTER nose_y;
-- Add confidence columns for existing joints
ALTER TABLE pose_frames
ADD COLUMN left_shoulder_confidence FLOAT
AFTER left_shoulder_y;
ALTER TABLE pose_frames
ADD COLUMN right_shoulder_confidence FLOAT
AFTER right_shoulder_y;
ALTER TABLE pose_frames
ADD COLUMN left_elbow_confidence FLOAT
AFTER left_elbow_y;
ALTER TABLE pose_frames
ADD COLUMN right_elbow_confidence FLOAT
AFTER right_elbow_y;
ALTER TABLE pose_frames
ADD COLUMN left_wrist_confidence FLOAT
AFTER left_wrist_y;
ALTER TABLE pose_frames
ADD COLUMN right_wrist_confidence FLOAT
AFTER right_wrist_y;
ALTER TABLE pose_frames
ADD COLUMN left_hip_confidence FLOAT
AFTER left_hip_y;
ALTER TABLE pose_frames
ADD COLUMN right_hip_confidence FLOAT
AFTER right_hip_y;
ALTER TABLE pose_frames
ADD COLUMN left_knee_confidence FLOAT
AFTER left_knee_y;
ALTER TABLE pose_frames
ADD COLUMN right_knee_confidence FLOAT
AFTER right_knee_y;
ALTER TABLE pose_frames
ADD COLUMN left_ankle_confidence FLOAT
AFTER left_ankle_y;
ALTER TABLE pose_frames
ADD COLUMN right_ankle_confidence FLOAT
AFTER right_ankle_y;
-- Add angles
ALTER TABLE pose_frames
ADD COLUMN left_arm_angle FLOAT
AFTER right_ankle_y;
ALTER TABLE pose_frames
ADD COLUMN right_arm_angle FLOAT
AFTER left_arm_angle;
ALTER TABLE pose_frames
ADD COLUMN left_leg_angle FLOAT
AFTER right_arm_angle;
ALTER TABLE pose_frames
ADD COLUMN right_leg_angle FLOAT
AFTER left_leg_angle;
ALTER TABLE pose_frames
ADD COLUMN back_angle FLOAT
AFTER right_leg_angle;