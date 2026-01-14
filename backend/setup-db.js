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
    // Note: Base tables (users, customers, etc.) are created by the main index.js createTables()
    // This script only applies water inventory extensions
    
    console.log('📄 Checking for water inventory tables...');
    
    // Check if water_tank_types table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'water_tank_types'
      );
    `);
    
    if (!checkTable.rows[0].exists) {
      console.log('📄 Applying water_inventory_schema.sql...');
      
      // Schema file should be in the same directory as this script
      const schemaPath = path.join(__dirname, 'water_inventory_schema.sql');
      
      console.log('📂 __dirname:', __dirname);
      console.log('📂 Schema path:', schemaPath);
      console.log('📂 File exists?:', fs.existsSync(schemaPath));
      
      if (!fs.existsSync(schemaPath)) {
        console.error('❌ Schema file not found! Contents of __dirname:');
        console.error(fs.readdirSync(__dirname));
        throw new Error(`Schema file not found at ${schemaPath}`);
      }
      
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
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
      
      console.log('✅ Water inventory schema setup complete!');
    } else {
      console.log('✅ Water inventory tables already exist, skipping...');
    }
    
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

