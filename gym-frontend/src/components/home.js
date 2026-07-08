import React, { useState, useEffect } from 'react';
import gym_pic from "../images/gym_pic.jpg";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, isAuthenticated, subscribeAuth } from "../auth";

const Home = () => {
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  useEffect(() => {
    const unsubscribe = subscribeAuth(() => {
      setCurrentUser(getCurrentUser());
    });

    // fetch home message
    fetch('http://localhost:3001/api/home')
      .then(res => res.json())
      .then(data => setMsg(data.message))
      .catch(err => console.error(err));

    // fetch members
    fetch('http://localhost:3001/api/test-db')
      .then(res => res.json())
      .then(data => {
        console.log("Members:", data);
        setMembers(data);
      })
      .catch(err => console.error(err));

    return unsubscribe;
  }, []);

  return (
    <>
      <div
        className="homepic"
        style={{ backgroundImage: `url(${gym_pic})` }}   
      >
        <div className="hero">
          <div className="tagline">Smart Training. Real Results.</div>

          <div className="backend-msg" style={{ color: "white" }}>
            {msg}
          </div>

          {currentUser ? (
            <div className="home-welcome" style={{ color: "white", position: 'absolute', top: 20, right: 20 }}>
              Logged in as <strong>{currentUser.name || currentUser.username}</strong>
            </div>
          ) : null}

          {/* Members list */}
          <h3 style={{ color: "white", marginTop: "20px" }}>Gym Members</h3>

          {members.map(member => (
            <div key={member.member_id} style={{ color: "white" }}>
              {member.name} - Age {member.age}
            </div>
          ))}

          <button className="start" onClick={() => {
            if (isAuthenticated()) {
              navigate('/workout');
            } else {
              navigate('/login');
            }
          }}>
            Start Workout
          </button>
        </div>
      </div>

      <div className="features">
        <div className="feature-title">Why Choose MYGYM ?</div>

        <div className='feature-cards'>
          <div className='card'>
            <h3>AI Personal Trainer</h3>
            <p>Smart coaching that adapts to your body and goals.</p>
          </div>

          <div className='card'>
            <h3>Smart Workout Tracking</h3>
            <p>Track every rep, set, and calorie in real time.</p>
          </div>

          <div className="card">
            <h3>Personalized Fitness Plans</h3>
            <p>Custom workouts and diet plans made for you.</p>
          </div>
        </div>

        <div className="footer">
          <p>📧 support@mygym.ai</p>
          <p>📞 +91 98765 43210</p>
          <p>📍 India</p>
        </div>
      </div>
    </>
  );
}

export default Home;