// Clean table creation for Water Purifier only
// Removes all loan/crediya-related tables

const { Pool } = require('pg');

const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "crediya",
      password: process.env.DB_PASSWORD || "",
      port: process.env.DB_PORT || 5432,
    });

async function createCleanTables() {
  console.log("📣 Creating clean water purifier tables...");

  try {
    // 1. Stores (must be first - users reference it)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        store_id INTEGER REFERENCES stores(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Customers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        phone_alt VARCHAR(20),
        customer_type VARCHAR(50),
        rfc VARCHAR(30),
        razon_social VARCHAR(200),
        contact_person_name VARCHAR(100),
        contact_person_phone VARCHAR(20),
        birthdate DATE,
        curp VARCHAR(30),
        address TEXT,
        neighborhood VARCHAR(200),
        building_type VARCHAR(100),
        postal_code VARCHAR(10),
        city VARCHAR(100),
        state VARCHAR(100),
        delivery_instructions TEXT,
        reference_1 VARCHAR(200),
        reference_2 VARCHAR(200),
        reference_3 VARCHAR(200),
        preferred_delivery_time VARCHAR(50),
        water_consumption VARCHAR(50),
        service_type VARCHAR(100),
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Customer Departments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_departments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        floor VARCHAR(50),
        building VARCHAR(100),
        contact_name VARCHAR(100),
        contact_phone VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Expenses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100),
        amount NUMERIC(10,2),
        description TEXT,
        receipt_path TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        requested_by INTEGER REFERENCES users(id),
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Clean water purifier tables created!");
    
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    throw error;
  }
}

module.exports = createCleanTables;

// Run if called directly
if (require.main === module) {
  createCleanTables()
    .then(() => {
      console.log("✅ Done!");
      process.exit(0);
    })
    .catch(err => {
      console.error("❌ Failed:", err);
      process.exit(1);
    });
}

