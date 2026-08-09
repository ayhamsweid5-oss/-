const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('./db');
const secret = () => process.env.JWT_SECRET;
async function login(username, password) { const r=await query('SELECT * FROM users WHERE username=$1',[username]); if(!r.rowCount || !(await bcrypt.compare(password,r.rows[0].password_hash))) return null; return jwt.sign({id:r.rows[0].id,username,r: r.rows[0].role},secret(),{expiresIn:'12h'}); }
function requireAuth(req,res,next){ try { req.user=jwt.verify((req.headers.authorization||'').replace(/^Bearer\s+/i,''),secret()); next(); } catch { res.status(401).json({error:'UNAUTHORIZED'}); } }
module.exports={login,requireAuth,bcrypt};
