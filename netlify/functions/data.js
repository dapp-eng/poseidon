/* serverless data proxy */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SECRET_KEY = process.env.AUTH_SECRET;
if (!SECRET_KEY) throw new Error('AUTH_SECRET env var tidak dikonfigurasi.');

/* verify session token */
function verifyToken(tokenString) {
  if (!tokenString) return null;
  try {
    const parts = tokenString.split('.');
    if (parts.length !== 2) return null;

    const payloadStr = Buffer.from(parts[0], 'base64').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(payloadStr).digest('hex');

    if (parts[1] !== expectedSig) return null;

    const payload = JSON.parse(payloadStr);
    if (Date.now() > payload.exp) return null;

    return payload;
  } catch (e) {
    return null;
  }
}

/* data proxy handler */
exports.handler = async function(event) {
  const filePathParam = event.queryStringParameters ? event.queryStringParameters.file : null;
  if (!filePathParam) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Parameter file wajib diisi.' }) };
  }

  /* path traversal protection */
  const safePath = path.normalize(filePathParam).replace(/^(\.\.[\/\\])+/, '');
  if (safePath.includes('..')) {
    return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Akses path tidak diizinkan.' }) };
  }

  /* verify file access */
  const publicFiles = ['meta.json', 'metrics.json'];
  const isPublic = publicFiles.includes(path.basename(safePath));

  if (!isPublic) {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!verifyToken(token)) {
      return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Akses ditolak. Sesi tidak sah atau telah kadaluarsa.' }) };
    }
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const tokenData = verifyToken(token);
    const isSimUser = tokenData && tokenData.user && tokenData.user.toLowerCase() === 'simulasi';

    const liveDataDir = process.env.LIVE_DATA_DIR;
    let dataDir = path.join(__dirname, '../../data');
    if (!isSimUser && liveDataDir && fs.existsSync(liveDataDir)) {
      dataDir = liveDataDir;
    }

    const fullPath = path.join(dataDir, safePath);
    if (!fs.existsSync(fullPath)) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Berkas data tidak ditemukan.' }) };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      body: content
    };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Gagal membaca data.', details: err.message }) };
  }
};
