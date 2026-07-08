import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../login.css";
import { saveAuth } from "../auth";

const Login = () => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!loginId || !password) {
      const message = "Please enter your email/username and password.";
      setError(message);
      window.alert(message);
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: loginId, username: loginId, password }),
      });

      const data = await response.json();
      const user = data.user || data;

      if (!response.ok) {
        const message = data.error || data.message || "Login failed. Please try again.";
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

      window.alert(`Login successful. Welcome back, ${user.name || user.username}!`);
      navigate("/");
    } catch (fetchError) {
      console.error(fetchError);
      const message = "Unable to login. Please try again later.";
      setError(message);
      window.alert(message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Login to MYGYM</h2>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Email or username"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        <p>
          Don't have an account? <Link to="/sign-up">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
