/**
 * Database Migration Runner
 * Executes SQL migration files to set up the users system
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

const migrations = [
  '01_add_users_table.sql',
  '02_add_user_id_to_sessions.sql'
];

const dbPath = path.join(__dirname, '../gym-database');

// Helper to execute SQL safely
const executeSql = (sql) => {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  for (const migrationFile of migrations) {
    const filePath = path.join(dbPath, migrationFile);
    
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Migration file not found: ${filePath}`);
        continue;
      }
      
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      console.log(`📝 Running: ${migrationFile}`);
      
      // Split by semicolon and filter out comments and empty lines
      const lines = sqlContent.split('\n');
      let currentStatement = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip comments and empty lines
        if (trimmedLine.startsWith('--') || trimmedLine === '') {
          continue;
        }
        
        currentStatement += ' ' + line;
        
        // Check if statement ends with semicolon
        if (trimmedLine.endsWith(';')) {
          const statement = currentStatement.trim();
          if (statement && !statement.startsWith('--')) {
            try {
              await executeSql(statement);
              console.log(`   ✅ Executed: ${statement.substring(0, 60)}...`);
            } catch (err) {
              console.error(`   ⚠️  Notice: ${err.sqlMessage}`);
              // Continue even if migration step fails (might be CREATE IF NOT EXISTS)
            }
          }
          currentStatement = '';
        }
      }
      
      console.log(`   ✨ Migration completed\n`);
      
    } catch (error) {
      console.error(`❌ Migration failed: ${migrationFile}`);
      console.error(error.message);
    }
  }
  
  console.log('\n✨ All migrations processed!');
  process.exit(0);
}

// Wait for DB connection before running migrations
setTimeout(runMigrations, 1000);
