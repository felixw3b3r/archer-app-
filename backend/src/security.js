const { randomBytes, scrypt, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const deriveKey = promisify(scrypt);
const digest = value => createHash('sha256').update(value).digest('hex');
const newToken = () => randomBytes(32).toString('hex');
const exactName = value => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
const validPassword = value => typeof value === 'string' && value.length >= 4 && value.length <= 256;
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256 || typeof encoded !== 'string') return false;
  const [algorithm, salt, hash] = encoded.split(':');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
  const key = await deriveKey(password, salt, 64);
  return timingSafeEqual(key, Buffer.from(hash, 'hex'));
}
// Explicit allowlist: credentials never reach JSON responses or device caches.
function publicUser(user) {
  return {
    _id: user._id, name: user.name, surname: user.surname,
    dob: user.dob, role: user.role, createdAt: user.createdAt,
    needsActivation: !user.passwordHash && !user.password,
  };
}
module.exports = { digest, newToken, exactName, validPassword, hashPassword, verifyPassword, publicUser };
