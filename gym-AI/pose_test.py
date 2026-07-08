import cv2
import mediapipe as mp
import math
import time
import win32com.client
from flask import Flask, Response

# -------- Text-To-Speech Setup --------
speaker = win32com.client.Dispatch('SAPI.SpVoice')
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

# -------- MediaPipe Setup --------
mp_pose = mp.solutions.pose
pose = mp_pose.Pose()
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

counter = 0
stage = 'up'
last_rep_time = 0

app = Flask(__name__)

def generate_frames():
    global counter, stage, last_rep_time

    while True:
        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            l_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            r_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            l_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
            r_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
            l_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
            r_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
            l_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            r_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            nose = landmarks[mp_pose.PoseLandmark.NOSE.value]

            vis_threshold = 0.1
            all_visible = (
                l_hip.visibility > vis_threshold and r_hip.visibility > vis_threshold and
                l_knee.visibility > vis_threshold and r_knee.visibility > vis_threshold and
                l_ankle.visibility > vis_threshold and r_ankle.visibility > vis_threshold
            )

            if not all_visible:
                cv2.putText(frame, 'Ensure full body is visible', (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            else:
                l_knee_angle = calculate_angle(l_hip, l_knee, l_ankle)
                r_knee_angle = calculate_angle(r_hip, r_knee, r_ankle)
                avg_knee_angle = (l_knee_angle + r_knee_angle) / 2.0

                l_hip_angle = calculate_angle(l_shoulder, l_hip, l_knee)
                r_hip_angle = calculate_angle(r_shoulder, r_hip, r_knee)
                avg_hip_angle = (l_hip_angle + r_hip_angle) / 2.0

                shoulder_dist = distance(l_shoulder, r_shoulder)
                feet_distance = distance(l_ankle, r_ankle)

                feedback = []

                if feet_distance < shoulder_dist * 0.4:
                    feedback.append('Spread Legs More')
                elif feet_distance > shoulder_dist * 2.5:
                    feedback.append('Legs Too Wide')

                if abs(l_knee_angle - r_knee_angle) > 60:
                    feedback.append('Bend Both Knees')

                if nose.y > l_shoulder.y and avg_knee_angle < 90:
                    feedback.append('Lift Head')

                if avg_knee_angle < 140 and avg_hip_angle < 50:
                    feedback.append('Keep Back Straight')

                if avg_knee_angle < 50:
                    feedback.append('Too Low')

                in_good_squat_depth = 50 <= avg_knee_angle <= 125

                if avg_knee_angle < 125 and stage == 'up' and abs(l_knee_angle - r_knee_angle) <= 60:
                    stage = 'down'

                if avg_knee_angle > 160 and stage == 'down':
                    current_time = time.time()
                    if current_time - last_rep_time > 1.0:
                        stage = 'up'
                        counter += 1
                        last_rep_time = current_time
                        print('Rep:', counter)
                        speak(str(counter), cooldown=0.5)
                    else:
                        stage = 'up'

                y = 40

                if in_good_squat_depth and len(feedback) == 0:
                    cv2.putText(frame, 'GOOD SQUAT', (30, y), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
                    y += 50
                    speak('Good squat', cooldown=2.0)
                elif in_good_squat_depth and len(feedback) > 0:
                    cv2.putText(frame, 'BAD SQUAT', (30, y), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
                    y += 50
                    speak('Bad squat', cooldown=3.0)

                if 125 < avg_knee_angle < 160 and stage == 'up' and len(feedback) == 0:
                    cv2.putText(frame, 'Go Lower', (30, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 165, 255), 2)
                    y += 40
                    speak('Go lower', cooldown=4.0)

                for msg in feedback:
                    cv2.putText(frame, msg, (30, y), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
                    y += 40
                    speak(msg, cooldown=3.0)

                cv2.putText(frame, f'Knee Angle: {int(avg_knee_angle)}', (30, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                cv2.putText(frame, f'Hip Angle: {int(avg_hip_angle)}', (30, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                cv2.putText(frame, f'Reps: {counter}', (30, 280), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                mp_draw.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()


@app.route('/video')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/')
def index():
    return 'Pose streaming API is running.'


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)
