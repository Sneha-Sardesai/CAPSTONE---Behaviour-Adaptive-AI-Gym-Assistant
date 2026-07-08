/**
 * JWT Authentication Middleware
 * Extracts and verifies JWT tokens from requests
 * Enables graceful fallback to Aditi user for backward compatibility
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production';

/**
 * Middleware to extract and validate JWT token
 * Stores user_id in req.user.id
 *
 * If token is missing or invalid, req.user remains null.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.user_id,
      username: decoded.username,
      email: decoded.email,
      isDefaultUser: false
    };
    console.log(`✅ Token verified for user: ${decoded.username}`);
    next();
  } catch (error) {
    console.warn('⚠️  Invalid token - clearing auth user');
    req.user = null;
    next();
  }
};

/**
 * Middleware to require authentication
 * Rejects requests without valid token
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.user_id,
      username: decoded.username,
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Generate JWT token for a user
 */
const generateToken = (userId, username, email) => {
  return jwt.sign(
    {
      user_id: userId,
      username: username,
      email: email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = {
  authMiddleware,
  requireAuth,
  generateToken,
  JWT_SECRET
};
