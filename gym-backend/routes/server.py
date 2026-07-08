from flask import Flask, Response
import cv2
import mediapipe as mp
import math

app = Flask(__name__)

# ---------- Angle Calculation ----------
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


def generate_frames():

    cap = cv2.VideoCapture(0)
    print("Camera started successfully")

    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose()
    mp_draw = mp.solutions.drawing_utils

    counter = 0
    stage = None

    while True:

        success, frame = cap.read()
        if not success:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = pose.process(rgb)

        if result.pose_landmarks:

            landmarks = result.pose_landmarks.landmark

            l_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            l_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
            l_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]

            r_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            r_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
            r_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

            left_angle = calculate_angle(l_hip, l_knee, l_ankle)
            right_angle = calculate_angle(r_hip, r_knee, r_ankle)

            knee_angle = (left_angle + right_angle) / 2

            if knee_angle > 160:
                stage = "up"

            elif 80 <= knee_angle <= 120:
                if stage == "up":
                    stage = "down"

            if knee_angle > 160 and stage == "down":
                stage = "up"
                counter += 1

            cv2.putText(frame, f"Reps: {counter}", (30,50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)

            mp_draw.draw_landmarks(
                frame,
                result.pose_landmarks,
                mp_pose.POSE_CONNECTIONS
            )

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


@app.route("/")
def home():
    return "AI Fitness Server Running"


@app.route('/video')
def video():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)