require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NETLIFY_DB_URL || process.env.DATABASE_URL });
let schemaPromise;
function ensureSchema() {
  if (!schemaPromise) {
    const sql = fs.readFileSync(path.resolve(__dirname, '../schema.sql'), 'utf8');
    schemaPromise = (async () => {
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await pool.query(statement);
    })().catch(error => { schemaPromise = undefined; throw error; });
  }
  return schemaPromise;
}
module.exports = { pool, query: (text, params) => pool.query(text, params), ensureSchema };
