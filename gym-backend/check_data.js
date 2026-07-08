const db = require('./db');

const queries = [
  'SELECT COUNT(*) as pose_frames FROM pose_frames',
  'SELECT COUNT(*) as form_errors FROM form_errors',
  'SELECT COUNT(*) as rep_analysis FROM rep_analysis',
  'SELECT COUNT(*) as behavioral_patterns FROM behavioral_patterns'
];

queries.forEach((query, index) => {
  db.query(query, (err, results) => {
    if (err) {
      console.error(`Error in query ${index + 1}:`, err);
    } else {
      console.log(`${query}: ${results[0][Object.keys(results[0])[0]]}`);
    }
    if (index === queries.length - 1) {
      db.end();
    }
  });
});