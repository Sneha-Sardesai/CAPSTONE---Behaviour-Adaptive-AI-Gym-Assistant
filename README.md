# Spotter
A Behaviour-Adaptive AI Gym Assistant

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

__Overview__

Spotter is a web-based AI fitness assistant designed for individuals who prefer working out independently but still need structured guidance and form correction.
By combining real-time computer vision, pose estimation, and adaptive feedback logic, Spotter simulates the presence of a human gym trainer — observing, evaluating, and responding to the user’s movements during exercise.

Unlike traditional fitness apps that rely on static instructions, Spotter continuously analyzes user posture and performance to deliver contextual, real-time feedback.

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

__Key Objectives__

1. Provide real-time posture correction using computer vision

2. Count repetitions and detect improper form

3. Simulate trainer-like feedback and guidance

4. Track workout performance over time

5. Lay groundwork for adaptive, personalized training behavior

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

__System Architecture__

Spotter is built using a modular, service-oriented architecture consisting of four core components:

  1. Frontend (Web Interface) -- Handles user interaction, live camera feed, and feedback display.

  2. Backend (Application Server) -- Acts as the central coordinator, routing data between frontend, ML services, and the database.

  3. ML & Computer Vision Service -- Performs pose detection, joint angle analysis, rep counting, and form evaluation.

  4. Database (Persistence Layer) -- Stores user profiles, workout history, and performance metrics.

This separation ensures scalability, maintainability, and clear responsibility boundaries.

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

__Tech Stack__

1. Frontend --

      React (Web)
      HTML5
      CSS3
      JavaScript
      Browser Camera APIs
      WebSockets (for real-time feedback)

2. Backend --

      Node.js
      Express.js
      REST APIs & WebSockets

3. ML / Computer Vision -- 

      Python
      MediaPipe Pose
      OpenCV
      NumPy

4. Database -- 

      MySQL
   
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

__Core Features__

1. Live Pose Detection -- Tracks key body landmarks in real time using webcam input.

2. Posture & Angle Analysis -- Computes joint angles to evaluate exercise form.

3. Repetition Counting -- Detects completed reps based on motion patterns.

4. Real-Time Feedback -- Provides corrective and motivational feedback during workouts.

5. Adaptive Logic (Planned) -- Adjusts feedback intensity and thresholds based on user performance trends.

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Getting Started -- 

__Prerequisites__

1. Node.js (v18+ recommended)
2. Python (v3.9+)
3. MySQL
4. Webcam-enabled device

__Installation__

1. Clone the repository

      git clone https://github.com/your-username/spotter.git
      cd spotter
   
2. Frontend setup

    cd frontend
    npm install
    npm start
   
3. Backend setup

    cd backend
    npm install
    npm run devstart
   
4. ML service setup

    cd ml
    pip install -r requirements.txt
    python api/server.py

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Current Status

1. Architecture finalized
2. Pose detection prototype
3. Backend–ML integration in progress
4. Database integration pending
5. Adaptive behavior module planned

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Future Work

1. Multi-exercise support
2. Personalized workout recommendations
3. Fatigue and inconsistency detection
4. Mobile application (React Native)
5. Voice-based feedback
6. Deployment to cloud infrastructure

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Academic Context

This project is developed as part of an academic exploration into:
    1. Human–Computer Interaction (HCI)
    2. Real-time Computer Vision
    3. Intelligent Fitness Systems
    4. Behavior-adaptive AI applications

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# License

This project is licensed under the MIT License.
You are free to use, modify, and distribute this software with attribution.

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Author

Sneha Sardesai
Computer Science & Engineering
AI / ML | Computer Vision | Web Systems

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
