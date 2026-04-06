const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const { AppError } = require('../../utils/errors');

function sanitizeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function validateRegistration({ name, email, password, role }) {
  const errors = [];
  if (!name || name.trim().length < 2) errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push({ field: 'email', message: 'Valid email is required' });
  if (!password || password.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  return errors;
}

async function register(payload) {
  const { name, email, password } = payload;
  const errors = validateRegistration(payload);
  if (errors.length) throw new AppError('Validation failed', 400, errors);
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) throw new AppError('Email already exists', 409, [{ field: 'email', message: 'Email already exists' }]);
  const hashed = await bcrypt.hash(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, status)
    VALUES (?, ?, ?, ?, 'ACTIVE')
  `).run(name.trim(), email.toLowerCase(), hashed, 'VIEWER');
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, user: sanitizeUser(user) };
}

async function login({ email, password }) {
  if (!email || !password) throw new AppError('Email and password are required', 400);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || user.status !== 'ACTIVE') throw new AppError('Invalid credentials', 401);
  const matched = await bcrypt.compare(password, user.password);
  if (!matched) throw new AppError('Invalid credentials', 401);
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, user: sanitizeUser(user) };
}

module.exports = { register, login, sanitizeUser };