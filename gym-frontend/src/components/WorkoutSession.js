import React, { useState } from "react";
import "../workoutsession.css";

function WorkoutSession() {

  const [reps, setReps] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [isRunning,setIsRunning]=useState(true);

  return (

    <div className="session-page">

      <div className="session-box">

        <h1 className="session-title">Squat Workout</h1>

        {/* CAMERA SECTION */}

        <div className="camera-box">

  {isRunning ? (
    <img
      src="http://localhost:3001/api/ai/video" 
      alt="Camera Feed"
      className="camera-feed"
    />
  ) : (
    <p>Camera Stopped</p>
  )}

</div>


        {/* STATS */}

        <div className="stats">

          <div className="stat-card">
            <h3>Reps</h3>
            <p>{reps}</p>
          </div>

          <div className="stat-card">
            <h3>Status</h3>
            <p>{status}</p>
          </div>

        </div>


        {/* PROGRESS BAR */}

        <div className="progress-container">
          <div className="progress-bar"></div>
        </div>


        {/* STOP BUTTON */}

        <button 
  className="stop-btn"
  onClick={() => setIsRunning(false)}
>
  Stop Workout
</button>

      </div>

    </div>

  );
}

export default WorkoutSession;