const crypto = require('crypto');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'carpool_enterprise_secret_2026';

// Scrypt Salted Password Hashing
const hashPassword = (password) => {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
};

// Safe, multi-format password verification (bcrypt, scrypt, and plain text)
const verifyPassword = (password, storedHash) => {
  if (!password || !storedHash || typeof storedHash !== 'string') {
    return false;
  }

  try {
    // 1. Bcrypt Hash Format ($2b$ or $2a$)
    if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
      return bcrypt.compareSync(password, storedHash);
    }

    // 2. Scrypt Salted Format (salt:key)
    if (storedHash.includes(':')) {
      const parts = storedHash.split(':');
      if (parts.length === 2 && parts[0] && parts[1]) {
        const [salt, key] = parts;
        const keyBuffer = Buffer.from(key, 'hex');
        const derivedKey = crypto.scryptSync(password, salt, 64);
        if (keyBuffer.length === derivedKey.length) {
          return crypto.timingSafeEqual(keyBuffer, derivedKey);
        }
      }
    }

    // 3. Plaintext fallback comparison for legacy seed data
    return password === storedHash;
  } catch (err) {
    console.warn('[Password Verify Warning]', err.message);
    return false;
  }
};

// HMAC JWT Token Generation
const generateToken = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 86400000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

// HMAC JWT Token Verification
const verifyToken = (token) => {
  if (!token) return null;
  try {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (err) {
    return null;
  }
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
};
