const db = require('./db');

db.query('DESCRIBE pose_frames', (err, results) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Table structure:');
    results.forEach(row => {
      console.log(`${row.Field}: ${row.Type}`);
    });
  }
  db.end();
});