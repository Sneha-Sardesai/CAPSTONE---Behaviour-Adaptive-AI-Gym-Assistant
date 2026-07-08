import mediapipe as mp

print("MediaPipe version:", mp.__version__)

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()

print("MediaPipe working")