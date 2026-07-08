const db = require('./db');

console.log('\n' + '='.repeat(70));
console.log('✅ BEHAVIOR-ADAPTIVE ML SYSTEM - STATUS CHECK');
console.log('='.repeat(70) + '\n');

const checks = [];

// Check 1: Data pipeline
function checkDataPipeline() {
  console.log('📊 1. DATA PIPELINE STATUS');
  console.log('-'.repeat(70));

  const queries = [
    { 
      name: 'Form Errors Recorded',
      sql: 'SELECT COUNT(*) as count FROM form_errors',
      threshold: 10
    },
    {
      name: 'Reps Logged',
      sql: 'SELECT COUNT(*) as count FROM rep_analysis',
      threshold: 3
    },
    {
      name: 'Workout Sessions',
      sql: 'SELECT COUNT(*) as count FROM workout_sessions',
      threshold: 1
    },
    {
      name: 'Members',
      sql: 'SELECT COUNT(*) as count FROM members',
      threshold: 1
    }
  ];

  let completed = 0;

  queries.forEach((query, idx) => {
    db.query(query.sql, (err, results) => {
      const count = err ? 0 : results[0].count;
      const status = count > 0 ? '✅' : '❌';
      const detail = count > 0 ? `${count} records` : 'No data';
      console.log(`   ${status} ${query.name}: ${detail}`);
      
      completed++;
      if (completed === queries.length) {
        checkBehavioralPatterns();
      }
    });
  });
}

// Check 2: Behavioral patterns
function checkBehavioralPatterns() {
  console.log('\n📈 2. BEHAVIORAL PATTERNS - Pattern Recognition');
  console.log('-'.repeat(70));

  const sql = `
    SELECT 
      COUNT(*) as total_patterns,
      SUM(CASE WHEN is_persistent THEN 1 ELSE 0 END) as persistent_patterns,
      AVG(pattern_score) as avg_pattern_score,
      SUM(occurrence_count) as total_occurrences
    FROM behavioral_patterns
  `;

  db.query(sql, (err, results) => {
    if (err || !results[0]) {
      console.log('   ❌ No patterns generated yet');
      checkLearningStyles();
      return;
    }

    const data = results[0];
    const status = data.total_patterns > 0 ? '✅' : '❌';

    console.log(`   ${status} Total Patterns Found: ${data.total_patterns || 0}`);
    console.log(`   🔴 Persistent Patterns: ${data.persistent_patterns || 0} (occurring 3+ times)`);
    console.log(`   📊 Average Pattern Score: ${Math.round(data.avg_pattern_score || 0)}%`);
    console.log(`   📍 Total Error Occurrences: ${data.total_occurrences || 0}`);

    if (data.total_patterns > 0) {
      showTopPatterns();
    } else {
      checkLearningStyles();
    }
  });
}

// Show top recurring errors
function showTopPatterns() {
  console.log('\n   🏆 Most Common Error Patterns:');

  const sql = `
    SELECT 
      error_type,
      exercise_id,
      occurrence_count,
      pattern_score,
      is_persistent,
      COUNT(DISTINCT member_id) as affecting_members
    FROM behavioral_patterns
    GROUP BY error_type, exercise_id
    ORDER BY occurrence_count DESC
    LIMIT 5
  `;

  db.query(sql, (err, patterns) => {
    if (!err && patterns.length > 0) {
      patterns.forEach((p, i) => {
        const badge = p.is_persistent ? '🔴' : '🟡';
        console.log(
          `      ${i + 1}. ${badge} ${p.error_type} (${p.occurrence_count}x, score: ${p.pattern_score}%, ${p.affecting_members} members)`
        );
      });
    }

    checkLearningStyles();
  });
}

// Check 3: User Learning Styles
function checkLearningStyles() {
  console.log('\n🧠 3. USER LEARNING STYLE CATEGORIZATION');
  console.log('-'.repeat(70));

  const sql = `
    SELECT 
      member_id,
      COUNT(DISTINCT error_type) as unique_errors,
      SUM(occurrence_count) as total_error_count,
      AVG(pattern_score) as avg_pattern_score,
      SUM(CASE WHEN is_persistent THEN 1 ELSE 0 END) as persistent_count
    FROM behavioral_patterns
    GROUP BY member_id
    ORDER BY total_error_count DESC
    LIMIT 5
  `;

  db.query(sql, (err, members) => {
    if (err || !members || members.length === 0) {
      console.log('   ❌ No user profiles generated yet (run analyze_behavior.js)');
      checkCoachingFeedback();
      return;
    }

    members.forEach((member, i) => {
      // Categorize learning style
      let style = 'standard_learner';
      if (member.persistent_count === 0) style = 'quick_learner';
      else if (member.avg_pattern_score > 70) style = 'needs_detailed_guidance';
      else if (member.persistent_count > member.unique_errors / 2) style = 'high_risk';
      
      const styleEmoji = {
        'new_user': '🆕',
        'quick_learner': '⚡',
        'standard_learner': '📊',
        'needs_detailed_guidance': '🎓',
        'high_risk': '⚠️'
      }[style] || '📊';

      console.log(
        `   ${styleEmoji} Member ${member.member_id}: ${style}\n` +
        `      - Unique errors: ${member.unique_errors}\n` +
        `      - Total occurrences: ${member.total_error_count}\n` +
        `      - Persistent patterns: ${member.persistent_count}\n` +
        `      - Pattern score: ${Math.round(member.avg_pattern_score)}%`
      );
    });

    checkCoachingFeedback();
  });
}

// Check 4: Adaptive Coaching Feedback
function checkCoachingFeedback() {
  console.log('\n💬 4. ADAPTIVE COACHING FEEDBACK GENERATION');
  console.log('-'.repeat(70));

  const sql = `
    SELECT 
      COUNT(*) as total_feedback,
      feedback_type,
      AVG(confidence_score) as avg_confidence
    FROM coaching_feedback
    GROUP BY feedback_type
  `;

  db.query(sql, (err, feedback) => {
    if (err) {
      console.log('   ❌ Coaching feedback table not initialized');
      showSummary();
      return;
    }

    if (!feedback || feedback.length === 0) {
      console.log('   ⚠️  No coaching feedback generated yet');
      console.log('   → Run: node analyze_behavior.js');
      showSummary();
      return;
    }

    const totalFeedback = feedback.reduce((sum, f) => sum + f.total_feedback, 0);
    console.log(`   ✅ Total Coaching Messages: ${totalFeedback}`);

    feedback.forEach((f) => {
      const typeEmoji = {
        'detailed': '📝',
        'short_reminder': '📌',
        'encouragement': '💪',
        'warning': '⚠️'
      }[f.feedback_type] || '💬';

      console.log(
        `   ${typeEmoji} ${f.feedback_type}: ${f.total_feedback} (confidence: ${Math.round(f.avg_confidence)}%)`
      );
    });

    showSummary();
  });
}

function showSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📋 SYSTEM STATUS SUMMARY');
  console.log('='.repeat(70) + '\n');

  // Check all key tables
  const tables = [
    'form_errors',
    'rep_analysis',
    'behavioral_patterns',
    'coaching_feedback'
  ];

  let checked = 0;

  tables.forEach((table) => {
    db.query(`SELECT COUNT(*) as count FROM ${table}`, (err, results) => {
      const count = err ? 0 : results[0].count;
      const status = count > 0 ? '✅' : '⏳';
      console.log(`${status} ${table}: ${count} records`);

      checked++;
      if (checked === tables.length) {
        printRecommendations();
      }
    });
  });
}

function printRecommendations() {
  console.log('\n💡 WHAT TO DO NEXT:\n');
  
  const steps = [
    {
      title: '1️⃣  If behavioral_patterns is empty:',
      action: 'node analyze_behavior.js',
      desc: 'Generate patterns from your form_errors data'
    },
    {
      title: '2️⃣  If coaching_feedback is empty:',
      action: 'node analyze_behavior.js',
      desc: 'Same script generates both patterns AND coaching'
    },
    {
      title: '3️⃣  To see adaptive coaching in action:',
      action: 'python pipeline.py',
      desc: 'Run a workout - errors auto-generate coaching feedback'
    },
    {
      title: '4️⃣  To test specific member profile:',
      action: 'Check coaching route',
      desc: 'GET /api/coaching/member/:memberId/profile'
    }
  ];

  steps.forEach(step => {
    console.log(`${step.title}`);
    console.log(`   Command: ${step.action}`);
    console.log(`   Description: ${step.desc}\n`);
  });

  console.log('='.repeat(70) + '\n');

  db.end();
}

// Start the check
checkDataPipeline();