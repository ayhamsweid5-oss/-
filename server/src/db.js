require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NETLIFY_DB_URL || process.env.DATABASE_URL });
module.exports = { pool, query: (text, params) => pool.query(text, params) };

