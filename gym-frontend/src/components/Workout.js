import React, { useState, useEffect } from "react";
import "../workout.css";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders, isAuthenticated, getCurrentUser } from "../auth";

const exerciseMap = {
  squat: 1,
  pushup: 2,
};

const Workout = () => {
  const navigate = useNavigate();
  const [exercise, setExercise] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const user = getCurrentUser();
    if (user && user.member_id) {
      setMemberId(user.member_id);
    } else {
      console.error("No member_id found for user");
    }
  }, [navigate]);

  const startWorkout = async () => {
    if (exercise === "") {
      alert("Please select an exercise first");
      return;
    }

    const exercise_id = exerciseMap[exercise];
    if (!exercise_id) {
      alert("Please choose a valid exercise.");
      return;
    }

    if (!memberId) {
      alert("Could not determine a gym member. Please try again later.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/workout/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          member_id: memberId,
          exercise_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.message || "Unable to start workout");
        return;
      }

      navigate("/session");
    } catch (error) {
      console.error(error);
      alert("Backend not responding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workout-page">
      <div className="workout-box">
        <h1>Select Your Workout</h1>

        <select
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
        >
          <option value="">Choose Exercise</option>
          <option value="squat">Squat</option>
          <option value="pushup">Push Up</option>
        </select>

        <br /><br />

        <button onClick={startWorkout} disabled={loading}>
          {loading ? "Starting..." : "Start Workout"}
        </button>
      </div>
    </div>
  );
};

export default Workout;
