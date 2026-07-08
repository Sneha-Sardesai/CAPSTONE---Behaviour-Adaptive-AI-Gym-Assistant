import React, { useState, useEffect } from "react";
import '../App.css';
import { Link, useNavigate } from "react-router-dom";
import { clearAuth, getCurrentUser, isAuthenticated, subscribeAuth } from "../auth";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const unsubscribe = subscribeAuth(() => {
      setUser(getCurrentUser());
    });

    return unsubscribe;
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="logo">MYGYM</div>

      <ul className="navlinks">
        <li><Link to="/">Home</Link></li>
        <li>About Us</li>
        {isAuthenticated() && user ? (
          <>
            <li className="welcome">Welcome, {user.name || user.username}</li>
            <li className="logout"><button onClick={handleLogout}>Logout</button></li>
          </>
        ) : (
          <>
            <li className="login"><Link to="/login">Login</Link></li>
            <li className="signup"><Link to="/sign-up">Sign Up</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
