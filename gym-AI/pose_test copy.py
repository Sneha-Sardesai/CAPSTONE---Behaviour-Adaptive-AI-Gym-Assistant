import cv2
import mediapipe as mp
import math

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


# ---------- Initialize MediaPipe ----------
mp_pose = mp.solutions.pose
pose = mp_pose.Pose()
mp_draw = mp.solutions.drawing_utils


# ---------- Start Camera ----------
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Camera not detected")
    exit()

print("Camera started successfully")


# ---------- Rep Counter ----------
counter = 0
stage = None


while True:

    ret, frame = cap.read()

    if not ret:
        break

    frame = cv2.flip(frame, 1)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    result = pose.process(rgb)

    if result.pose_landmarks:

        landmarks = result.pose_landmarks.landmark

        # LEFT LEG
        l_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
        l_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
        l_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]

        # RIGHT LEG
        r_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
        r_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
        r_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]

        left_angle = calculate_angle(l_hip, l_knee, l_ankle)
        right_angle = calculate_angle(r_hip, r_knee, r_ankle)

        knee_angle = (left_angle + right_angle) / 2

        # ---------- Squat Conditions ----------
        if knee_angle > 160:
            status = "Stand Straight"
            color = (255, 255, 0)
            stage = "up"

        elif 120 < knee_angle <= 160:
            status = "Go Lower"
            color = (0, 0, 255)

        elif 80 <= knee_angle <= 120:
            status = "Good Squat"
            color = (0, 255, 0)

            if stage == "up":
                stage = "down"

        else:
            status = "Too Low"
            color = (255, 0, 0)

        # ---------- Rep Counter ----------
        if knee_angle > 160 and stage == "down":
            stage = "up"
            counter += 1
            print("Rep Completed")

        # ---------- Print Status in Terminal ----------
        print(f"Knee Angle: {int(knee_angle)} | Status: {status}")

        # ---------- Display Angle ----------
        cv2.putText(
            frame,
            f"Knee Angle: {int(knee_angle)}",
            (30, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            color,
            2
        )

        # ---------- Display Status ----------
        cv2.putText(
            frame,
            status,
            (30, 100),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            color,
            2
        )

        # ---------- Display Rep Count ----------
        cv2.putText(
            frame,
            f"Reps: {counter}",
            (30, 150),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255,255,255),
            2
        )

        # ---------- Draw Pose ----------
        mp_draw.draw_landmarks(
            frame,
            result.pose_landmarks,
            mp_pose.POSE_CONNECTIONS
        )

    

    if cv2.waitKey(1) & 0xFF == 27:
        break


cap.release()
cv2.destroyAllWindows()