// Simple connection test
require('dotenv').config();
const { Pool } = require('pg');

console.log('Testing PostgreSQL connection...');
console.log('Config:', {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD ? '***' : 'NOT SET'
});

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  connectionTimeoutMillis: 5000,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('Server time:', res.rows[0].now);
    pool.end();
  }
});
