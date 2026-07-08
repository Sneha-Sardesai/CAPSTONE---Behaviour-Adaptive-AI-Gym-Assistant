import React, { useState } from "react";
import "../signup.css";
import { Link, useNavigate } from "react-router-dom";
import { saveAuth } from "../auth";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const calculateBMI = (h, w) => {
    if (h && w) {
      const bmiValue = (w / ((h / 100) * (h / 100))).toFixed(2);
      setBmi(bmiValue);
    } else {
      setBmi("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!username || !email || !password) {
      const message = "Username, email, and password are required.";
      setError(message);
      window.alert(message);
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      const user = data.user || data;

      if (!response.ok) {
        const message = data.error || data.message || "Signup failed. Please try again.";
        setError(message);
        window.alert(message);
        return;
      }

      saveAuth({
        token: data.token,
        user_id: user.user_id || user.id,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        member_id: data.member_id,
        member_name: data.member_name,
      });

      window.alert(`Account created successfully. Welcome, ${user.name || user.username}!`);
      navigate("/");
    } catch (fetchError) {
      console.error(fetchError);
      const message = "Unable to create account. Please try again later.";
      setError(message);
      window.alert(message);
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input type="tel" placeholder="Phone Number" />

        <input
          type="number"
          placeholder="Height (cm)"
          value={height}
          onChange={(e) => {
            setHeight(e.target.value);
            calculateBMI(e.target.value, weight);
          }}
        />

        <input
          type="number"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value);
            calculateBMI(height, e.target.value);
          }}
        />

        <input type="text" placeholder="BMI" value={bmi} readOnly />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Create Account</button>
      </form>

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}




export default Signup;
