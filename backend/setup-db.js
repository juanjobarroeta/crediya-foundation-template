const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🔧 Setting up database schema...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'water_inventory_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Applying water_inventory_schema.sql...');
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (err) {
        // Ignore errors for tables that already exist
        if (err.code !== '42P07' && err.code !== '42710') {
          console.warn('⚠️ Schema warning:', err.message.substring(0, 100));
        }
      }
    }
    
    console.log('✅ Database schema setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase().then(() => process.exit(0));
}

module.exports = setupDatabase;

