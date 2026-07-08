const db = require('./db');
const { analyzeUserBehavior, generateAdaptiveCoaching } = require('./utils/adaptiveCoaching');

console.log('='.repeat(60));
console.log('BEHAVIOR-ADAPTIVE ML ANALYSIS - Generating From Dataset');
console.log('='.repeat(60));

// Step 1: Aggregate form errors into behavioral patterns
function generateBehavioralPatterns() {
  console.log('\n📊 Step 1: Aggregating form errors into behavioral patterns...');
  
  const sql = `
    SELECT 
      ws.member_id,
      ws.exercise_id,
      fe.error_type,
      COUNT(*) as occurrence_count,
      SUM(CASE WHEN fe.severity = 'high' THEN 1 ELSE 0 END) as high_severity_count,
      e.exercise_name
    FROM form_errors fe
    JOIN workout_sessions ws ON fe.session_id = ws.session_id
    LEFT JOIN exercises e ON ws.exercise_id = e.exercise_id
    GROUP BY ws.member_id, ws.exercise_id, fe.error_type
    ORDER BY occurrence_count DESC
  `;

  db.query(sql, (err, patterns) => {
    if (err) {
      console.error('Error aggregating patterns:', err);
      return;
    }

    console.log(`✅ Found ${patterns.length} unique error patterns`);
    
    if (patterns.length === 0) {
      console.log('⚠️  No patterns found in form_errors');
      db.end();
      return;
    }

    // Display top patterns
    console.log('\n🔝 Top 5 Recurring Errors:');
    patterns.slice(0, 5).forEach((p, i) => {
      const isPersistent = p.occurrence_count >= 3 ? '🔴 PERSISTENT' : '🟡 EMERGING';
      console.log(
        `  ${i + 1}. ${p.error_type} (${p.occurrence_count}x) - ${p.exercise_name || 'Unknown'} ${isPersistent}`
      );
    });

    // Insert into behavioral_patterns
    insertPatternsIntoDB(patterns);
  });
}

function insertPatternsIntoDB(patterns) {
  console.log('\n💾 Step 2: Inserting patterns into behavioral_patterns table...');
  
  let inserted = 0;
  let skipped = 0;

  patterns.forEach((pattern, index) => {
    const isPersistent = pattern.occurrence_count >= 3;
    const patternScore = Math.min(100, (pattern.occurrence_count / 10) * 100);
    
    const checkSQL = `
      SELECT pattern_id FROM behavioral_patterns 
      WHERE member_id = ? AND error_type = ? AND exercise_id = ?
    `;

    db.query(
      checkSQL,
      [pattern.member_id, pattern.error_type, pattern.exercise_id],
      (checkErr, existing) => {
        if (!checkErr && existing.length === 0) {
          // Insert new pattern
          const insertSQL = `
            INSERT INTO behavioral_patterns (
              member_id, error_type, exercise_id, occurrence_count, 
              pattern_score, is_persistent, is_recurring, first_detected, last_detected
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `;

          db.query(
            insertSQL,
            [
              pattern.member_id,
              pattern.error_type,
              pattern.exercise_id,
              pattern.occurrence_count,
              patternScore,
              isPersistent,
              isPersistent
            ],
            (insertErr) => {
              if (!insertErr) {
                inserted++;
              }
              
              if (index === patterns.length - 1) {
                console.log(`✅ Inserted: ${inserted}, Skipped: ${skipped}`);
                generateUserLearningProfiles();
              }
            }
          );
        } else {
          skipped++;
          if (index === patterns.length - 1) {
            console.log(`✅ Inserted: ${inserted}, Skipped: ${skipped}`);
            generateUserLearningProfiles();
          }
        }
      }
    );
  });
}

function generateUserLearningProfiles() {
  console.log('\n🧠 Step 3: Analyzing user learning styles...');
  
  const sql = `
    SELECT DISTINCT member_id FROM behavioral_patterns
  `;

  db.query(sql, (err, members) => {
    if (err) {
      console.error('Error fetching members:', err);
      db.end();
      return;
    }

    console.log(`📈 Profiling ${members.length} members...`);

    let processed = 0;

    members.forEach((member, index) => {
      analyzeUserBehavior(db, member.member_id, (analyzeErr, userProfile) => {
        processed++;

        if (!analyzeErr && userProfile) {
          console.log(
            `  Member ${member.member_id}: ${userProfile.learning_style} (${userProfile.total_patterns} patterns, ${userProfile.persistent_patterns} persistent)`
          );
        }

        if (processed === members.length) {
          generateAdaptiveCoachingFeedback();
        }
      });
    });
  });
}

function generateAdaptiveCoachingFeedback() {
  console.log('\n🎯 Step 4: Generating adaptive coaching feedback...');
  
  const sql = `
    SELECT 
      fe.session_id,
      fe.error_type,
      fe.severity,
      fe.body_part,
      fe.error_description,
      ws.member_id
    FROM form_errors fe
    JOIN workout_sessions ws ON fe.session_id = ws.session_id
    WHERE NOT EXISTS (
      SELECT 1 FROM coaching_feedback cf 
      WHERE cf.session_id = fe.session_id 
      AND cf.pattern_id = (
        SELECT pattern_id FROM behavioral_patterns 
        WHERE member_id = ws.member_id 
        AND error_type = fe.error_type
        LIMIT 1
      )
    )
    LIMIT 20
  `;

  db.query(sql, (err, errors) => {
    if (err) {
      console.error('Error fetching errors:', err);
      db.end();
      return;
    }

    console.log(`💬 Generating coaching for ${errors.length} errors...`);

    if (errors.length === 0) {
      console.log('✅ All errors already have coaching feedback');
      displaySummary();
      return;
    }

    let processed = 0;

    errors.forEach((error) => {
      const errorObj = {
        error_type: error.error_type,
        severity: error.severity,
        body_part: error.body_part,
        description: error.error_description
      };

      generateAdaptiveCoaching(db, error.member_id, errorObj, error.session_id, (coachErr, coaching) => {
        processed++;

        if (!coachErr && coaching) {
          console.log(
            `  ✅ Feedback: ${coaching.type} (confidence: ${coaching.confidence}%)`
          );
        }

        if (processed === errors.length) {
          displaySummary();
        }
      });
    });
  });
}

function displaySummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY - Database State');
  console.log('='.repeat(60));

  const queries = [
    { name: 'Form Errors', sql: 'SELECT COUNT(*) as count FROM form_errors' },
    { name: 'Reps Logged', sql: 'SELECT COUNT(*) as count FROM rep_analysis' },
    { name: 'Behavioral Patterns', sql: 'SELECT COUNT(*) as count FROM behavioral_patterns' },
    { name: 'Coaching Feedback', sql: 'SELECT COUNT(*) as count FROM coaching_feedback' },
    { name: 'Workout Sessions', sql: 'SELECT COUNT(*) as count FROM workout_sessions' }
  ];

  let completed = 0;

  queries.forEach((query) => {
    db.query(query.sql, (err, results) => {
      if (!err && results.length > 0) {
        console.log(`  ${query.name}: ${results[0].count}`);
      }

      completed++;

      if (completed === queries.length) {
        displayTopPatterns();
      }
    });
  });
}

function displayTopPatterns() {
  console.log('\n🏆 Top 3 User Learning Profiles:');

  const sql = `
    SELECT 
      bp.member_id,
      COUNT(DISTINCT bp.error_type) as unique_errors,
      SUM(bp.occurrence_count) as total_errors,
      SUM(CASE WHEN bp.is_persistent THEN 1 ELSE 0 END) as persistent_errors,
      AVG(bp.pattern_score) as avg_pattern_score
    FROM behavioral_patterns bp
    GROUP BY bp.member_id
    ORDER BY total_errors DESC
    LIMIT 3
  `;

  db.query(sql, (err, profiles) => {
    if (!err && profiles.length > 0) {
      profiles.forEach((profile, i) => {
        console.log(`
  ${i + 1}. Member ${profile.member_id}
     - Unique error types: ${profile.unique_errors}
     - Total occurrences: ${profile.total_errors}
     - Persistent patterns: ${profile.persistent_errors}
     - Avg pattern score: ${Math.round(profile.avg_pattern_score)}%
        `);
      });
    }

    console.log('\n✅ BEHAVIOR-ADAPTIVE ML ANALYSIS COMPLETE!');
    console.log('   Your system is now ready with:');
    console.log('   ✓ Behavioral patterns identified');
    console.log('   ✓ User learning styles categorized');
    console.log('   ✓ Adaptive coaching feedback generated\n');

    db.end();
  });
}

// Start the analysis
generateBehavioralPatterns();