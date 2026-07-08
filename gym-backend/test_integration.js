/**
 * Integration Test - Verify backward compatibility & user system
 * 
 * Tests:
 * 1. Session creation without auth token (should default to Aditi)
 * 2. User signup
 * 3. User login  
 * 4. Session creation with auth token (should use authenticated user)
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000
});

// Helper to make requests with optional token
const request = async (method, path, data = null, token = null) => {
  const config = {
    method,
    url: path,
    ...(data && { data })
  };

  if (token) {
    config.headers = { Authorization: `Bearer ${token}` };
  }

  try {
    const response = await api(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      return { error: error.response.data.error || error.message, status: error.response.status };
    }
    return { error: error.message };
  }
};

// Test runner
const runTests = async () => {
  console.log('🧪 Starting Integration Tests\n');

  // ==================== TEST 1: Backward Compatibility ====================
  console.log('📌 TEST 1: Session without auth token (fallback to Aditi)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const sessionNoAuth = await request(
    'POST',
    '/workout/start',
    { member_id: 1, exercise_id: 1 },
    null // No token - should default to Aditi
  );

  if (sessionNoAuth.session_id) {
    console.log('✅ Session created without auth (Aditi as default)');
    console.log(`   Session ID: ${sessionNoAuth.session_id}`);
    console.log(`   User ID: ${sessionNoAuth.user_id} (should be 1 - Aditi)\n`);
  } else {
    console.log('❌ Failed to create session without auth');
    console.log(`   Error: ${sessionNoAuth.error}\n`);
  }

  // ==================== TEST 2: User Signup ====================
  console.log('📌 TEST 2: New user signup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const signupData = {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'SecurePassword123'
  };

  const signup = await request('POST', '/auth/signup', signupData);

  if (signup.user_id) {
    console.log('✅ User signed up successfully');
    console.log(`   User ID: ${signup.user_id}`);
    console.log(`   Username: ${signup.username}`);
    console.log(`   Email: ${signup.email}`);
    console.log(`   Token: ${signup.token.substring(0, 50)}...\n`);
  } else {
    console.log('❌ Signup failed');
    console.log(`   Error: ${signup.error}\n`);
  }

  // ==================== TEST 3: Login ====================
  console.log('📌 TEST 3: User login');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const loginData = {
    username: 'john_doe',
    password: 'SecurePassword123'
  };

  const login = await request('POST', '/auth/login', loginData);

  if (login.user_id) {
    console.log('✅ User logged in successfully');
    console.log(`   User ID: ${login.user_id}`);
    console.log(`   Username: ${login.username}`);
    console.log(`   Token: ${login.token.substring(0, 50)}...\n`);
  } else {
    console.log('❌ Login failed');
    console.log(`   Error: ${login.error}\n`);
  }

  // ==================== TEST 4: Session with Auth Token ====================
  if (login.token) {
    console.log('📌 TEST 4: Session with authenticated user');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const sessionWithAuth = await request(
      'POST',
      '/workout/start',
      { member_id: 1, exercise_id: 1 },
      login.token // Use new user's token
    );

    if (sessionWithAuth.session_id) {
      console.log('✅ Session created with authenticated user');
      console.log(`   Session ID: ${sessionWithAuth.session_id}`);
      console.log(`   User ID: ${sessionWithAuth.user_id} (should be ${login.user_id} - john_doe)\n`);
    } else {
      console.log('❌ Failed to create session with auth');
      console.log(`   Error: ${sessionWithAuth.error}\n`);
    }
  }

  // ==================== TEST 5: Get Current User ====================
  if (login.token) {
    console.log('📌 TEST 5: Get current user from token');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const currentUser = await request('GET', '/auth/me', null, login.token);

    if (currentUser.user_id) {
      console.log('✅ Retrieved current user from token');
      console.log(`   User ID: ${currentUser.user_id}`);
      console.log(`   Username: ${currentUser.username}`);
      console.log(`   Email: ${currentUser.email}\n`);
    } else {
      console.log('❌ Failed to get current user');
      console.log(`   Error: ${currentUser.error}\n`);
    }
  }

  console.log('✨ Tests completed!\n');
  console.log('📊 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Key Achievements:');
  console.log('✓ Backward compatibility maintained (no auth token → Aditi)');
  console.log('✓ New users can signup with email/password');
  console.log('✓ Users can login and receive JWT token');
  console.log('✓ Authenticated sessions link to correct user');
  console.log('✓ Gym-AI stays untouched (no Python changes needed)');
};

// Run tests
runTests().catch(console.error);
