from flask import Flask, Response
import cv2
import mediapipe as mp
import math
import time

app = Flask(__name__)

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


# -------- STREAM FUNCTION --------
def generate_frames():

    cap = cv2.VideoCapture(0)

    counter = 0
    stage = "up"
    last_rep_time = 0

    print("Camera started")

    while True:

        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        if results.pose_landmarks:

            landmarks = results.pose_landmarks.landmark

            # -------- Landmarks --------
            l_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            r_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]

            l_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
            r_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]

            l_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
            r_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

            l_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            r_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]

            nose = landmarks[mp_pose.PoseLandmark.NOSE.value]

            # -------- Visibility Check --------
            vis_threshold = 0.1
            all_visible = (
                l_hip.visibility > vis_threshold and r_hip.visibility > vis_threshold and
                l_knee.visibility > vis_threshold and r_knee.visibility > vis_threshold and
                l_ankle.visibility > vis_threshold and r_ankle.visibility > vis_threshold
            )

            if not all_visible:
                cv2.putText(frame, "Ensure full body is visible",
                            (30, 40), cv2.FONT_HERSHEY_SIMPLEX,
                            0.9, (0, 0, 255), 2)
            else:

                # -------- Angles --------
                l_knee_angle = calculate_angle(l_hip, l_knee, l_ankle)
                r_knee_angle = calculate_angle(r_hip, r_knee, r_ankle)
                avg_knee_angle = (l_knee_angle + r_knee_angle) / 2.0

                l_hip_angle = calculate_angle(l_shoulder, l_hip, l_knee)
                r_hip_angle = calculate_angle(r_shoulder, r_hip, r_knee)
                avg_hip_angle = (l_hip_angle + r_hip_angle) / 2.0

                # -------- Distances --------
                shoulder_dist = distance(l_shoulder, r_shoulder)
                feet_distance = distance(l_ankle, r_ankle)

                feedback = []

                # -------- Form Checks --------
                if feet_distance < shoulder_dist * 0.4:
                    feedback.append("Spread Legs More")
                elif feet_distance > shoulder_dist * 2.5:
                    feedback.append("Legs Too Wide")

                if abs(l_knee_angle - r_knee_angle) > 60:
                    feedback.append("Bend Both Knees")

                if nose.y > l_shoulder.y and avg_knee_angle < 90:
                    feedback.append("Lift Head")

                if avg_knee_angle < 140 and avg_hip_angle < 50:
                    feedback.append("Keep Back Straight")

                if avg_knee_angle < 50:
                    feedback.append("Too Low")

                in_good_squat_depth = 50 <= avg_knee_angle <= 140

                # -------- Rep Counter --------
                if avg_knee_angle < 125 and stage == "up" and abs(l_knee_angle - r_knee_angle) <= 60:
                    stage = "down"

                if avg_knee_angle > 160 and stage == "down":
                    current_time = time.time()
                    if current_time - last_rep_time > 1.0:
                        stage = "up"
                        counter += 1
                        last_rep_time = current_time
                    else:
                        stage = "up"

                # -------- Display --------
                y = 40

                if in_good_squat_depth and len(feedback) == 0:
                    cv2.putText(frame, "GOOD SQUAT",
                                (30, y), cv2.FONT_HERSHEY_SIMPLEX,
                                1, (0, 255, 0), 3)
                    y += 50

                if avg_knee_angle > 140 and stage == "up" and len(feedback) == 0:
                    cv2.putText(frame, "Go Lower",
                                (30, y), cv2.FONT_HERSHEY_SIMPLEX,
                                0.9, (0, 165, 255), 2)
                    y += 40

                for msg in feedback:
                    cv2.putText(frame, msg,
                                (30, y), cv2.FONT_HERSHEY_SIMPLEX,
                                0.9, (0, 0, 255), 2)
                    y += 40

                cv2.putText(frame, f"Knee Angle: {int(avg_knee_angle)}",
                            (30, 200), cv2.FONT_HERSHEY_SIMPLEX,
                            0.8, (255, 255, 255), 2)

                cv2.putText(frame, f"Hip Angle: {int(avg_hip_angle)}",
                            (30, 240), cv2.FONT_HERSHEY_SIMPLEX,
                            0.8, (255, 255, 255), 2)

                cv2.putText(frame, f"Reps: {counter}",
                            (30, 280), cv2.FONT_HERSHEY_SIMPLEX,
                            1, (255, 255, 255), 2)

                mp_draw.draw_landmarks(
                    frame,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS
                )

        # -------- STREAM FRAME --------
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


# -------- ROUTE --------
@app.route('/video')
def video():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


# -------- RUN --------
if __name__ == "__main__":
    app.run(port=5000)