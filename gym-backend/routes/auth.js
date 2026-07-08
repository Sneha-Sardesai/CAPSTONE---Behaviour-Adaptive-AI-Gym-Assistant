/**
 * Authentication Routes
 * Handles user signup and login
 * Separate module - does NOT touch reps/pose_frames/Gym-AI paths
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, requireAuth } = require('../middleware/auth');

const findOrCreateMember = (username, callback) => {
  const normalized = username.trim();
  const selectSql = 'SELECT member_id, name FROM members WHERE LOWER(name) = LOWER(?) LIMIT 1';

  db.query(selectSql, [normalized], (err, results) => {
    if (err) {
      return callback(err);
    }

    if (results.length > 0) {
      return callback(null, results[0]);
    }

    db.query('INSERT INTO members (name) VALUES (?)', [normalized], (insertErr, insertResult) => {
      if (insertErr) {
        return callback(insertErr);
      }
      callback(null, {
        member_id: insertResult.insertId,
        name: normalized
      });
    });
  });
};

// ==================== SIGN UP ====================

/**
 * POST /api/auth/signup
 * 
 * Request body:
 * {
 *   username: "john_doe",
 *   email: "john@example.com",
 *   password: "secure_password_123"
 * }
 * 
 * Response:
 * {
 *   message: "User created successfully",
 *   user_id: 2,
 *   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const checkUserSql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    db.query(checkUserSql, [username, email], async (err, results) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(409).json({
          error: 'User already exists with that username or email'
        });
      }

      // Hash password
      try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const insertSql = 'INSERT INTO users (username, email, password_hash, is_active) VALUES (?, ?, ?, TRUE)';
        db.query(insertSql, [username, email, hashedPassword], (err, result) => {
          if (err) {
            console.error('DB error:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = result.insertId;
          const token = generateToken(userId, username, email);

          findOrCreateMember(username, (memberErr, member) => {
            if (memberErr) {
              console.error('Member lookup/create failed:', memberErr);
              return res.status(500).json({ error: 'Failed to create member profile' });
            }

            console.log(`✅ New user created: ${username} (ID: ${userId})`);

            res.status(201).json({
              message: 'User created successfully',
              user_id: userId,
              username,
              email,
              member_id: member.member_id,
              member_name: member.name,
              token: token
            });
          });
        });
      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        res.status(500).json({ error: 'Failed to process password' });
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// ==================== LOGIN ====================

/**
 * POST /api/auth/login
 * 
 * Request body:
 * {
 *   username: "john_doe",
 *   password: "secure_password_123"
 * }
 * OR
 * {
 *   email: "john@example.com",
 *   password: "secure_password_123"
 * }
 * 
 * Response:
 * {
 *   message: "Login successful",
 *   user_id: 2,
 *   username: "john_doe",
 *   email: "john@example.com",
 *   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/login', (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;

    // Validation
    if (!loginIdentifier || !password) {
      return res.status(400).json({
        error: 'username/email and password are required'
      });
    }

    // Look up user by username or email
    const sql = 'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE';
    db.query(sql, [loginIdentifier, loginIdentifier], async (err, results) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(401).json({
          error: 'Invalid username or password'
        });
      }

      const user = results[0];

      // Compare password
      try {
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
          return res.status(401).json({
            error: 'Invalid username or password'
          });
        }

        // Password correct - generate token
        const token = generateToken(user.user_id, user.username, user.email);

        findOrCreateMember(user.username, (memberErr, member) => {
          if (memberErr) {
            console.error('Member lookup/create failed:', memberErr);
            return res.status(500).json({ error: 'Failed to resolve member profile' });
          }

          console.log(`🔓 Login successful: ${user.username}`);

          res.json({
            message: 'Login successful',
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            member_id: member.member_id,
            member_name: member.name,
            token: token
          });
        });
      } catch (compareError) {
        console.error('Password comparison error:', compareError);
        res.status(500).json({ error: 'Authentication failed' });
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== GET CURRENT USER ====================

/**
 * GET /api/auth/me
 * Returns current user info from token
 * Requires valid JWT token
 */
router.get('/me', requireAuth, (req, res) => {
  const { id, username, email } = req.user;
  const normalizedUsername = username.trim();

  const findMemberSql = 'SELECT member_id, name FROM members WHERE LOWER(name) = LOWER(?) LIMIT 1';
  db.query(findMemberSql, [normalizedUsername], (err, members) => {
    if (err) {
      console.error('Member lookup failed:', err);
      return res.status(500).json({ error: 'Failed to resolve member profile' });
    }

    if (members.length > 0) {
      return res.json({
        user_id: id,
        username,
        email,
        member_id: members[0].member_id,
        member_name: members[0].name
      });
    }

    const createMemberSql = 'INSERT INTO members (name) VALUES (?)';
    db.query(createMemberSql, [normalizedUsername], (createErr, result) => {
      if (createErr) {
        console.error('Member creation failed:', createErr);
        return res.status(500).json({ error: 'Failed to create member profile' });
      }

      res.json({
        user_id: id,
        username,
        email,
        member_id: result.insertId,
        member_name: normalizedUsername
      });
    });
  });
});

module.exports = router;
