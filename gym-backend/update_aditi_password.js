const db = require('./db');
const hash = '$2b$10$OkzzDMEH9JiU/fEUvWFgeOb63qv./OPaBshM0lcuMWYKmHZxB1l7m';

db.query(
  'UPDATE users SET password_hash = ? WHERE username = ? OR email = ?',
  [hash, 'aditi', 'aditi@mygym.local'],
  (err, result) => {
    if (err) {
      console.error('DB update error', err);
      process.exit(1);
    }
    console.log('Aditi password updated rows:', result.affectedRows);
    db.end();
  }
);
