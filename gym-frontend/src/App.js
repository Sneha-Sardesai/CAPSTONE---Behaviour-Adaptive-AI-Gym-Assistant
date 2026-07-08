import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css';
import Navbar from './components/navbar';
import Home from './components/home';
import Login from './components/login';
import Signup from './components/Signup';
import Workout from './components/Workout';
import WorkoutSession from './components/WorkoutSession';

function App() {
  return (
     <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sign-up" element={<Signup />}/>
        <Route path="/workout" element={<Workout />} />
        <Route path="/session" element={<WorkoutSession />} />
      </Routes>
    </BrowserRouter>
    
  );
}

export default App;
