// Simple test to see where server startup fails
require('dotenv').config();

console.log('1. Loading modules...');
const express = require('express');
const { Pool } = require('pg');

console.log('2. Creating Express app...');
const app = express();

console.log('3. Testing PostgreSQL connection...');
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
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected');
  
  console.log('4. Setting up routes...');
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  console.log('5. Starting server...');
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`✅ Server started on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
  });
});
