"""
Data Pipeline for Behavior-Adaptive AI Gym Assistant

This module coordinates the flow of data between:
1. ML Pose Detection (MediaPipe/Computer Vision)
2. Backend API (Node.js/Express)
3. Database (MySQL)
4. Frontend (React)

The pipeline handles:
- Real-time pose frame capture and transmission
- Form error detection and logging
- Behavioral pattern analysis
- Adaptive coaching feedback generation
"""

import cv2
import mediapipe as mp
import numpy as np
import requests
import time
import json
from collections import deque
from datetime import datetime
from flask import Flask, Response
import math
import win32com.client

# -------- Text-To-Speech Setup --------
speaker = win32com.client.Dispatch("SAPI.SpVoice")
speaker.Rate = -2

last_spoken = {}

def speak(msg, cooldown=2.0):
    current_time = time.time()
    if current_time - last_spoken.get(msg, 0) > cooldown:
        speaker.Speak(msg, 3)
        last_spoken[msg] = current_time

# -------- Angle Function ---------
def calculate_angle(a, b, c):
    a = [a.x, a.y]
    b = [b.x, b.y]
    c = [c.x, c.y]

    angle = math.degrees(
        math.atan2(c[1]-b[1], c[0]-b[0]) -
        math.atan2(a[1]-b[1], a[0]-b[0])
    )

    angle = abs(angle)

    if angle > 180:
        angle = 360 - angle

    return angle

# -------- Distance Function --------
def distance(a, b):
    return math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)

# MediaPipe setup
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    enable_segmentation=False,
)
mp_drawing = mp.solutions.drawing_utils

# Configuration
BACKEND_URL = "http://localhost:3001/api/workout"
FRAME_SKIP = 2  # Process every nth frame for efficiency

# Flask app
app = Flask(__name__)

# Global session (for demo, hardcoded)
current_session = None


class WorkoutSession:
    """Manages a single workout session with pose tracking"""

    def __init__(self, member_id, exercise_id, exercise_name):
        self.member_id = member_id
        self.exercise_id = exercise_id
        self.exercise_name = exercise_name
        self.session_id = None
        self.frame_count = 0
        self.error_history = deque(maxlen=30)  # Track last 30 errors
        self.is_active = False

        # Rep counting
        self.counter = 0
        self.stage = "up"
        self.last_rep_time = 0

        # Initialize session with backend
        self.start_session()

    def start_session(self):
        """Create a new workout session in the database"""
        try:
            payload = {
                "member_id": self.member_id,
                "exercise_id": self.exercise_id,
            }
            response = requests.post(f"{BACKEND_URL}/start", json=payload)
            response.raise_for_status()

            data = response.json()
            self.session_id = data["session_id"]
            self.is_active = True

            print(f"[SESSION STARTED] Session ID: {self.session_id}")
            print(f"Member: {self.member_id}, Exercise: {self.exercise_name}")
            return self.session_id

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Failed to start session: {e}")
            return None

    def process_frame(self, frame, landmarks):
        """
        Process a video frame with pose landmarks

        Args:
            frame: OpenCV video frame
            landmarks: MediaPipe pose landmarks
        """
        self.frame_count += 1

        # Skip frames for efficiency
        if self.frame_count % FRAME_SKIP != 0:
            return

        if landmarks:
            # Extract pose data in MediaPipe format
            pose_data = self.extract_pose_landmarks(landmarks)

            # Calculate angles for rep counting and display
            landmarks_mp = landmarks.landmark
            l_hip = landmarks_mp[mp_pose.PoseLandmark.LEFT_HIP.value]
            r_hip = landmarks_mp[mp_pose.PoseLandmark.RIGHT_HIP.value]
            l_knee = landmarks_mp[mp_pose.PoseLandmark.LEFT_KNEE.value]
            r_knee = landmarks_mp[mp_pose.PoseLandmark.RIGHT_KNEE.value]
            l_ankle = landmarks_mp[mp_pose.PoseLandmark.LEFT_ANKLE.value]
            r_ankle = landmarks_mp[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
            l_shoulder = landmarks_mp[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            r_shoulder = landmarks_mp[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            nose = landmarks_mp[mp_pose.PoseLandmark.NOSE.value]

            l_knee_angle = calculate_angle(l_hip, l_knee, l_ankle)
            r_knee_angle = calculate_angle(r_hip, r_knee, r_ankle)
            avg_knee_angle = (l_knee_angle + r_knee_angle) / 2.0
            l_hip_angle = calculate_angle(l_shoulder, l_hip, l_knee)
            r_hip_angle = calculate_angle(r_shoulder, r_hip, r_knee)
            avg_hip_angle = (l_hip_angle + r_hip_angle) / 2.0

            # Send pose data to backend
            self.send_pose_frame(pose_data)

            # Detect errors locally for real-time feedback
            errors = self.detect_form_errors(pose_data)

            # Log errors to backend
            error = None
            for error in errors:
                self.log_form_error(error)
                self.error_history.append(error)
                speak(error['description'], cooldown=3.0)

            # Rep counting
            if avg_knee_angle < 125 and self.stage == "up" and abs(l_knee_angle - r_knee_angle) <= 60:
                self.stage = "down"

            if avg_knee_angle > 160 and self.stage == "down":
                current_time = time.time()
                if current_time - self.last_rep_time > 1.0:
                    self.stage = "up"
                    self.counter += 1
                    self.last_rep_time = current_time

                    # Determine rep quality based on form errors and depth
                    rep_quality = "good" if len(errors) == 0 else "bad"

                    # Log rep to database
                    self.log_rep(self.counter, rep_quality, avg_knee_angle, avg_knee_angle, avg_knee_angle)

                    print(f"Rep {self.counter}: {rep_quality.upper()} (angle: {avg_knee_angle:.1f}°)")
                    speak(str(self.counter), cooldown=0.5)
                else:
                    self.stage = "up"

            # Praise/encouragement
            in_good_squat_depth = 50 <= avg_knee_angle <= 125
            if in_good_squat_depth and len(errors) == 0:
                speak("Good squat", cooldown=2.0)
            elif in_good_squat_depth and len(errors) > 0:
                speak("Bad squat", cooldown=3.0)

            if 125 < avg_knee_angle < 160 and self.stage == "up" and len(errors) == 0:
                speak("Go lower", cooldown=4.0)

            # Generate real-time feedback
            feedback = self.generate_real_time_feedback(error)

            if feedback:
                speak(feedback['message'], cooldown=2.0)

            return {
                "frame_number": self.frame_count,
                "errors": errors,
                "feedback": feedback,
                "angles": {"knee": avg_knee_angle, "hip": avg_hip_angle},
                "reps": self.counter,
            }

        return None

    def extract_pose_landmarks(self, landmarks):
        """
        Convert MediaPipe landmarks to standard format

        Returns: Dictionary with all landmark positions
        """
        landmark_dict = {}

        for idx, name in enumerate(
            [
                "nose",
                "left_eye_inner",
                "left_eye",
                "left_eye_outer",
                "right_eye_inner",
                "right_eye",
                "right_eye_outer",
                "left_ear",
                "right_ear",
                "mouth_left",
                "mouth_right",
                "left_shoulder",
                "right_shoulder",
                "left_elbow",
                "right_elbow",
                "left_wrist",
                "right_wrist",
                "left_pinky",
                "right_pinky",
                "left_index",
                "right_index",
                "left_thumb",
                "right_thumb",
                "left_hip",
                "right_hip",
                "left_knee",
                "right_knee",
                "left_ankle",
                "right_ankle",
                "left_heel",
                "right_heel",
                "left_foot_index",
                "right_foot_index",
            ]
        ):
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                landmark_dict[name] = {
                    "x": float(lm.x),
                    "y": float(lm.y),
                    "z": float(lm.z),
                    "visibility": float(lm.visibility),
                }

        return landmark_dict
    

    # def send_pose_frame(self, pose_data):
    #     """Send pose frame data to backend storage"""
    #     try:
    #         payload = {
    #             "session_id": self.session_id,
    #             "frame_number": self.frame_count,
    #             "pose_landmarks": pose_data,
    #         }

    #         response = requests.post(f"{BACKEND_URL}/pose-data", json=payload, timeout=2)
    #         response.raise_for_status()

    #         frame_id = response.json().get("frame_id")
    #         return frame_id

    #     except requests.exceptions.RequestException as e:
    #         print(f"[WARN] Failed to send pose frame: {e}")
    #         return None

    def send_pose_frame(self, pose_data):
        """Send pose frame data to backend (JSON + FLATTENED for SQL)"""
        try:
            def xy(name):
                return (
                    pose_data.get(name, {}).get("x"),
                    pose_data.get(name, {}).get("y"),
                )

            payload = {
                # REQUIRED BY BACKEND
                "session_id": self.session_id,
                "frame_number": self.frame_count,
                "pose_landmarks": pose_data,   # 🔑 DO NOT REMOVE

                # LEFT ARM
                "left_shoulder_x": xy("left_shoulder")[0],
                "left_shoulder_y": xy("left_shoulder")[1],
                "left_elbow_x": xy("left_elbow")[0],
                "left_elbow_y": xy("left_elbow")[1],
                "left_wrist_x": xy("left_wrist")[0],
                "left_wrist_y": xy("left_wrist")[1],

                # RIGHT ARM
                "right_shoulder_x": xy("right_shoulder")[0],
                "right_shoulder_y": xy("right_shoulder")[1],
                "right_elbow_x": xy("right_elbow")[0],
                "right_elbow_y": xy("right_elbow")[1],
                "right_wrist_x": xy("right_wrist")[0],
                "right_wrist_y": xy("right_wrist")[1],

                # LEFT LEG
                "left_hip_x": xy("left_hip")[0],
                "left_hip_y": xy("left_hip")[1],
                "left_knee_x": xy("left_knee")[0],
                "left_knee_y": xy("left_knee")[1],
                "left_ankle_x": xy("left_ankle")[0],
                "left_ankle_y": xy("left_ankle")[1],

                # RIGHT LEG
                "right_hip_x": xy("right_hip")[0],
                "right_hip_y": xy("right_hip")[1],
                "right_knee_x": xy("right_knee")[0],
                "right_knee_y": xy("right_knee")[1],
                "right_ankle_x": xy("right_ankle")[0],
                "right_ankle_y": xy("right_ankle")[1],

                # OPTIONAL ANGLES (safe NULLs)
                "left_arm_angle": None,
                "right_arm_angle": None,
                "left_leg_angle": None,
                "right_leg_angle": None,
                "back_angle": None,
            }

            response = requests.post(
                f"{BACKEND_URL}/session/pose-data",
                json=payload,
                timeout=2
            )
            response.raise_for_status()

            return response.json().get("frame_id")

        except requests.exceptions.RequestException as e:
            print(f"[WARN] Failed to send pose frame: {e}")
            return None
        
    def detect_form_errors(self, pose_data):
        """Detect form errors based on exercise type"""
        errors = []

        # Import the pose analysis utility
        try:
            from utils.poseAnalysis import detectFormErrors, calculateAngles

            # Extract keypoint coordinates
            landmarks = {
                key: {"x": v["x"], "y": v["y"], "z": v["z"]}
                for key, v in pose_data.items()
                if key in [
                    "nose",
                    "left_shoulder",
                    "right_shoulder",
                    "left_elbow",
                    "right_elbow",
                    "left_wrist",
                    "right_wrist",
                    "left_hip",
                    "right_hip",
                    "left_knee",
                    "right_knee",
                    "left_ankle",
                    "right_ankle",
                ]
            }

            angles = calculateAngles(landmarks)
            errors = detectFormErrors(self.exercise_name, angles, landmarks)

        except Exception as e:
            print(f"[ERROR] Form error detection failed: {e}")

        return errors

    def log_form_error(self, error):
        """Log a detected form error to the backend"""
        try:
            payload = {
                "session_id": self.session_id,
                "error_type": error.get("type", "unknown"),
                "severity": error.get("severity", "medium"),
                "body_part": error.get("body_part", "unknown"),
                "description": error.get("description", ""),
            }

            response = requests.post(
                f"{BACKEND_URL}/form-error", json=payload, timeout=2
            )
            response.raise_for_status()

            error_id = response.json().get("error_id")
            is_recurring = response.json().get("is_recurring_pattern", False)

            # Print real-time feedback
            severity_emoji = "🔴" if error["severity"] == "high" else "🟡"
            print(
                f"{severity_emoji} {error['description']}"
                + (" [RECURRING]" if is_recurring else "")
            )

            return error_id

        except requests.exceptions.RequestException as e:
            print(f"[WARN] Failed to log form error: {e}")
            return None

    def log_rep(self, rep_number, rep_type, min_angle, max_angle, avg_angle):
        """Log a completed rep to the backend"""
        try:
            payload = {
                "session_id": self.session_id,
                "rep_number": rep_number,
                "rep_type": rep_type,
                "min_angle": min_angle,
                "max_angle": max_angle,
                "avg_angle": avg_angle,
            }

            response = requests.post(
                f"{BACKEND_URL}/log-rep", json=payload, timeout=2
            )
            response.raise_for_status()

            rep_id = response.json().get("rep_id")
            return rep_id

        except requests.exceptions.RequestException as e:
            print(f"[WARN] Failed to log rep: {e}")
            return None

    def generate_real_time_feedback(self, error):
        """Generate real-time adaptive coaching feedback"""
        if not error:
            return None

        # Check error frequency (simple heuristic)
        recent_same_errors = sum(
            1 for e in self.error_history if e.get("type") == error.get("type")
        )

        if recent_same_errors > 3:
            # Recurring error - use short reminder
            feedback_type = "short_reminder"
            message = f"Remember: {error['description'].split('-')[-1].strip()}"
        else:
            # New error - provide guidance
            feedback_type = "detailed"
            message = "Let's work on this: " + error["description"]

        return {
            "type": feedback_type,
            "message": message,
            "confidence": 0.8 if feedback_type == "short_reminder" else 0.6,
        }

    def end_session(self, total_reps=0, total_sets=0):
        """End the workout session and trigger analysis"""
        if not self.is_active:
            return None

        try:
            payload = {
                "session_id": self.session_id,
                "total_reps": total_reps,
                "total_sets": total_sets,
            }

            response = requests.post(f"{BACKEND_URL}/end", json=payload)
            response.raise_for_status()

            data = response.json()
            self.is_active = False

            print(f"\n[SESSION ENDED] Analysis complete")
            print(f"Patterns identified: {data.get('patterns_identified', [])}")

            return data

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Failed to end session: {e}")
            return None

    def get_feedback(self):
        """Retrieve coaching feedback for the session"""
        try:
            response = requests.get(f"{BACKEND_URL}/{self.session_id}/feedback")
            response.raise_for_status()

            data = response.json()
            return data.get("feedback", [])

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Failed to retrieve feedback: {e}")
            return []

    def get_patterns(self):
        """Retrieve identified behavioral patterns"""
        try:
            response = requests.get(f"{BACKEND_URL}/{self.session_id}/patterns")
            response.raise_for_status()

            data = response.json()
            return data.get("patterns", [])

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Failed to retrieve patterns: {e}")
            return []


class WorkoutPipeline:
    """Main pipeline that orchestrates the entire workflow"""

    def __init__(self):
        self.session = None
        self.cap = None

    def start_workout(self, member_id, exercise_id, exercise_name, video_source=0):
        """Start a new workout with video capture and pose analysis"""

        # Create session
        self.session = WorkoutSession(member_id, exercise_id, exercise_name)

        # Open video source
        self.cap = cv2.VideoCapture(video_source)

        if not self.cap.isOpened():
            print("[ERROR] Failed to open video source")
            return False

        print(f"\n[PIPELINE STARTED] Press 'q' to stop workout\n")

        # Main loop
        frame_display_config = {"frame_count": 0, "fps": 0, "start_time": time.time()}

        try:
            while self.cap.isOpened():
                ret, frame = self.cap.read()

                if not ret:
                    break

                # Process frame with MediaPipe
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(frame_rgb)

                # Get timestamp for UI
                h, w, c = frame.shape

                # Process pose landmarks if available
                frame_data = None
                if results.pose_landmarks:
                    frame_data = self.session.process_frame(frame, results.pose_landmarks)

                    # Draw pose on frame
                    mp_drawing.draw_landmarks(
                        frame,
                        results.pose_landmarks,
                        mp_pose.POSE_CONNECTIONS,
                    )

                # Display frame data
                if frame_data:
                    y_offset = 30
                    if frame_data["errors"]:
                        cv2.putText(
                            frame,
                            f"Errors: {len(frame_data['errors'])}",
                            (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.7,
                            (0, 0, 255),
                            2,
                        )
                        y_offset += 30

                    if frame_data["feedback"]:
                        feedback = frame_data["feedback"]
                        cv2.putText(
                            frame,
                            f"Feedback: {feedback['type']}",
                            (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            (0, 255, 0),
                            2,
                        )

                # Display frame count and FPS
                frame_display_config["frame_count"] += 1
                elapsed = time.time() - frame_display_config["start_time"]
                if elapsed > 0:
                    frame_display_config["fps"] = frame_display_config["frame_count"] / elapsed

                cv2.putText(
                    frame,
                    f"Frame: {self.session.frame_count} | FPS: {frame_display_config['fps']:.1f}",
                    (10, h - 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 255, 255),
                    1,
                )

                # Display frame
                cv2.imshow("Workout Session - Press Q to Stop", frame)

                # Exit on 'q'
                if cv2.waitKey(5) & 0xFF == ord("q"):
                    break

        finally:
            self.end_workout()

    def end_workout(self, total_reps=0, total_sets=0):
        """Cleanup and end the workout session"""
        print("\n[PIPELINE STOPPING] Cleaning up...\n")

        if self.session:
            # End the session
            result = self.session.end_session(total_reps, total_sets)

            if result:
                # Display summary
                print("=" * 50)
                print("WORKOUT SUMMARY")
                print("=" * 50)
                print(f"Session ID: {self.session.session_id}")
                print(f"Total Frames Processed: {self.session.frame_count}")

                patterns = self.session.get_patterns()
                if patterns:
                    print(f"\nBehavioral Patterns Identified: {len(patterns)}")
                    for pattern in patterns:
                        print(f"  - {pattern['error_type']}: Score {pattern.get('pattern_score', 0):.1f}")

                feedback = self.session.get_feedback()
                if feedback:
                    print(f"\nCoaching Feedback Generated: {len(feedback)} messages")

        if self.cap:
            self.cap.release()

        cv2.destroyAllWindows()
        print("[PIPELINE STOPPED] Session ended gracefully\n")


# Global camera and session
cap = cv2.VideoCapture(0)
frame_count = 0

def generate_frames():
    global current_session, frame_count
    
    # Initialize session if not exists (hardcoded for demo)
    if current_session is None:
        current_session = WorkoutSession(member_id=1, exercise_id=1, exercise_name="Squats")
    
    while True:
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)

        frame_data = None
        if results.pose_landmarks:
            frame_data = current_session.process_frame(frame, results.pose_landmarks)
            
            # Draw pose landmarks
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
            )

        # Add overlays
        h, w, c = frame.shape
        y_offset = 30
        
        if frame_data:
            if frame_data["errors"]:
                cv2.putText(
                    frame,
                    f"Errors: {len(frame_data['errors'])}",
                    (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2,
                )
                y_offset += 30

            if frame_data["feedback"]:
                feedback = frame_data["feedback"]
                cv2.putText(
                    frame,
                    f"Feedback: {feedback['message']}",
                    (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2,
                )

        # Add detailed overlays like in pose_test.py
        if frame_data and "angles" in frame_data:
            avg_knee_angle = frame_data["angles"]["knee"]
            in_good_squat_depth = 50 <= avg_knee_angle <= 125
            y = 40

            if in_good_squat_depth and len(frame_data["errors"]) == 0:
                cv2.putText(frame, "GOOD SQUAT", (30, y), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
                y += 50
            elif in_good_squat_depth and len(frame_data["errors"]) > 0:
                cv2.putText(frame, "BAD SQUAT", (30, y), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
                y += 50

            if 125 < avg_knee_angle < 160 and current_session.stage == "up" and len(frame_data["errors"]) == 0:
                cv2.putText(frame, "Go Lower", (30, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 165, 255), 2)
                y += 40

            for error in frame_data["errors"]:
                cv2.putText(frame, error['description'], (30, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
                y += 40

            # Display angles
            cv2.putText(frame, f"Knee Angle: {int(frame_data['angles']['knee'])}", (30, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.putText(frame, f"Hip Angle: {int(frame_data['angles']['hip'])}", (30, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.putText(frame, f"Reps: {frame_data['reps']}", (30, 280), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        # Display frame count
        frame_count += 1
        cv2.putText(
            frame,
            f"Frame: {frame_count}",
            (10, h - 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
        )

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()


@app.route('/video')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/')
def index():
    return 'AI Gym Assistant Pipeline is running.'


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)
