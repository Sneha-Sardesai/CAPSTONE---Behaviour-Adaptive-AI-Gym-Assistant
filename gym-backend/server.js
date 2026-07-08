// --------------------------------------------------------------------------------------------

// importing dependencies
const axios=require("axios");

const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require("body-parser");

const db = require('./db');
const { authMiddleware, requireAuth } = require('./middleware/auth');

const DEFAULT_ADITI_PASSWORD_HASH = '$2b$10$OkzzDMEH9JiU/fEUvWFgeOb63qv./OPaBshM0lcuMWYKmHZxB1l7m';

const ensureAditiPassword = () => {
  const selectSql = 'SELECT password_hash FROM users WHERE username = ? OR email = ? LIMIT 1';
  db.query(selectSql, ['aditi', 'aditi@mygym.local'], (err, results) => {
    if (err) {
      console.error('Aditi password check failed:', err);
      return;
    }

    if (results.length === 0) {
      console.warn('Aditi user not found for password fix');
      return;
    }

    const currentHash = results[0].password_hash;
    if (!currentHash || currentHash === 'legacy_user_no_password') {
      db.query(
        'UPDATE users SET password_hash = ? WHERE username = ? OR email = ?',
        [DEFAULT_ADITI_PASSWORD_HASH, 'aditi', 'aditi@mygym.local'],
        (updateErr, updateResult) => {
          if (updateErr) {
            console.error('Aditi password update failed:', updateErr);
            return;
          }
          console.log(`Aditi password fix applied. Rows updated: ${updateResult.affectedRows}`);
        }
      );
    }
  });
};
// ----------------------------------------------------------------------------------------------

// configuring the app and middleware

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`➡️  Incoming: ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.json());
app.use(cors());
app.use(bodyParser.json({ limit: "10mb"}));
app.use(bodyParser.urlencoded( { extended: true}));

// Apply auth middleware GLOBALLY
// This extracts user_id from JWT token, or defaults to Aditi (user_id = 1)
app.use(authMiddleware);

ensureAditiPassword();

// tester route
app.get('/', (req, res) => {
    res.send("Server is working");
});

// ----------------------------------------------------------------------------------------------

// routes (API's)

const homeRouter = require('./routes/home');
const sessionRouter = require("./routes/session");
const coachingRouter = require("./routes/coaching");
const authRouter = require("./routes/auth");

// Auth routes (not protected - open signup/login)
app.use('/api/auth', authRouter);

// Other routes (protected by authMiddleware - gets user_id from token or defaults to Aditi)
app.use('/api/home', homeRouter);
app.use("/api/workout", sessionRouter);
app.use("/api/coaching", coachingRouter);

// ----------------------------------------------------------------------------------------------
// AI Flask camera stream proxy

app.get("/api/ai/video", (req, res) => {
    res.redirect("http://127.0.0.1:5000/video");
});
// server

app.listen(process.env.PORT || 3001, () => {
    console.log("Server started at http://localhost:3001");
});

// ----------------------------------------------------------------------------------------------




// const express = require("express");
// const cors = require("cors");

// const db = require("./db");

// const app = express();

// app.use(cors());
// app.use(express.json());

// // Home API
// app.get("/api/home", (req, res) => {
//   res.json({ message: "Welcome to MYGYM Backend 🚀" });
// });

// // Members API (from MySQL)
// app.get("/api/members", (req, res) => {

//   const sql = "SELECT * FROM members";

//   db.query(sql, (err, results) => {
//     if (err) {
//       console.error("Database error:", err);
//       res.status(500).json({ error: "Database query failed" });
//     } else {
//       res.json(results);
//     }
//   });

// });

// // Start server
// const PORT = 3001;

// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });

app.get("/api/test-db", (req, res) => {
  db.query("SELECT * FROM members", (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Database error");
    } else {
      res.json(result);
    }
  });
});

// Comprehensive database check endpoint
app.get("/api/check-data", requireAuth, (req, res) => {
  const userId = req.user.id;
  const queries = [
    // Table counts for user
    {
      name: "table_counts",
      sql: `
        SELECT 'workout_sessions' as table_name, COUNT(*) as row_count FROM workout_sessions WHERE user_id = ?
        UNION ALL
        SELECT 'pose_frames', COUNT(*) FROM pose_frames WHERE session_id IN (SELECT session_id FROM workout_sessions WHERE user_id = ?)
        UNION ALL
        SELECT 'form_errors', COUNT(*) FROM form_errors WHERE session_id IN (SELECT session_id FROM workout_sessions WHERE user_id = ?)
        UNION ALL
        SELECT 'behavioral_patterns', COUNT(*) FROM behavioral_patterns WHERE session_id IN (SELECT session_id FROM workout_sessions WHERE user_id = ?)
        UNION ALL
        SELECT 'coaching_feedback', COUNT(*) FROM coaching_feedback WHERE session_id IN (SELECT session_id FROM workout_sessions WHERE user_id = ?)
      `,
      params: [userId, userId, userId, userId, userId]
    },
    // Latest session for user
    {
      name: "latest_session",
      sql: `
        SELECT ws.session_id, m.name as member_name, e.exercise_name, ws.session_start, ws.session_end, ws.total_reps, ws.status
        FROM workout_sessions ws
        JOIN members m ON ws.member_id = m.member_id
        JOIN exercises e ON ws.exercise_id = e.exercise_id
        WHERE ws.user_id = ?
        ORDER BY ws.session_id DESC LIMIT 1
      `,
      params: [userId]
    },
    // Pose frames count for user's latest session
    {
      name: "pose_frames_latest",
      sql: `
        SELECT COUNT(*) as total_frames, MIN(frame_timestamp) as first_frame, MAX(frame_timestamp) as last_frame
        FROM pose_frames
        WHERE session_id = (SELECT MAX(session_id) FROM workout_sessions WHERE user_id = ?)
      `,
      params: [userId]
    },
    // Form errors for user's latest session
    {
      name: "form_errors_latest",
      sql: `
        SELECT error_type, body_part, severity, description, detected_at
        FROM form_errors
        WHERE session_id = (SELECT MAX(session_id) FROM workout_sessions WHERE user_id = ?)
        ORDER BY detected_at DESC LIMIT 10
      `,
      params: [userId]
    }
  ];

  const results = {};

  // Run all queries
  let completed = 0;
  queries.forEach(query => {
    db.query(query.sql, query.params || [], (err, result) => {
      if (err) {
        results[query.name] = { error: err.message };
      } else {
        results[query.name] = result;
      }

      completed++;
      if (completed === queries.length) {
        res.json(results);
      }
    });
  });
});