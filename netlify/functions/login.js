/* serverless auth login */
const crypto = require('crypto');
const SECRET_KEY = process.env.AUTH_SECRET;
if (!SECRET_KEY) throw new Error('AUTH_SECRET env var tidak dikonfigurasi.');

/* generate session token */
function generateToken(username) {
  const expiresAt = Date.now() + 3600 * 1000;
  const payload = JSON.stringify({ user: username, exp: expiresAt });
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  const token = Buffer.from(payload).toString('base64') + '.' + signature;
  return { token, expiresAt };
}

/* login handler */
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}');

    if (!username || !password) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, message: 'Username dan Password wajib diisi.' }) };
    }

    /* verify env credentials */
    const u1 = process.env.USER1_NAME, p1 = process.env.USER1_PASS;
    const u2 = process.env.USER2_NAME, p2 = process.env.USER2_PASS;
    const uSim = process.env.SIMULATION_USER || 'simulasi';
    const pSim = process.env.SIMULATION_PASS || 'simulasi123';

    let validUser = null;
    if (username.trim() === uSim && password === pSim) validUser = uSim;
    else if (u1 && p1 && username.trim() === u1 && password === p1) validUser = u1;
    else if (u2 && p2 && username.trim() === u2 && password === p2) validUser = u2;

    if (validUser) {
      const { token, expiresAt } = generateToken(validUser);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, token, user: validUser, expiresAt, message: 'Login berhasil.' })
      };
    }

    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, message: 'Username atau Password salah.' }) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, message: 'Kesalahan server login.' }) };
  }
};
