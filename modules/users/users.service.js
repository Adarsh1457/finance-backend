const bcrypt = require('bcrypt');
const db = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { sanitizeUser } = require('../auth/auth.service');

const validRoles = ['VIEWER', 'ANALYST', 'ADMIN'];
const validStatuses = ['ACTIVE', 'INACTIVE'];

function paginateQuery(baseQuery, params, page, limit, orderClause = 'ORDER BY created_at DESC') {
  const count = db.prepare(`SELECT COUNT(*) as total FROM (${baseQuery})`).get(...params).total;
  const offset = (page - 1) * limit;
  const rows = db.prepare(`${baseQuery} ${orderClause} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows, total: count };
}

function validateUserPayload(payload, partial = false) {
  const errors = [];
  if (!partial || payload.name !== undefined) {
    if (!payload.name || String(payload.name).trim().length < 2) errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }
  if (!partial || payload.email !== undefined) {
    if (!payload.email || !/^\S+@\S+\.\S+$/.test(payload.email)) errors.push({ field: 'email', message: 'Valid email is required' });
  }
  if (!partial || payload.password !== undefined) {
    if (!payload.password || String(payload.password).length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }
  if (payload.role !== undefined && !validRoles.includes(String(payload.role).toUpperCase())) errors.push({ field: 'role', message: 'Invalid role' });
  if (payload.status !== undefined && !validStatuses.includes(String(payload.status).toUpperCase())) errors.push({ field: 'status', message: 'Invalid status' });
  return errors;
}

function listUsers({ page = 1, limit = 10, role, status }) {
  const clauses = [];
  const params = [];
  if (role) {
    clauses.push('role = ?');
    params.push(String(role).toUpperCase());
  }
  if (status) {
    clauses.push('status = ?');
    params.push(String(status).toUpperCase());
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const baseQuery = `SELECT id, name, email, role, status, created_at, updated_at FROM users ${where}`;
  const { rows, total } = paginateQuery(baseQuery, params, page, limit);
  return {
    data: rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

function getUserById(id) {
  const user = db.prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?').get(id);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

async function createUser(payload) {
  const errors = validateUserPayload(payload);
  if (errors.length) throw new AppError('Validation failed', 400, errors);
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(String(payload.email).toLowerCase());
  if (existing) throw new AppError('Email already exists', 409, [{ field: 'email', message: 'Email already exists' }]);
  const password = await bcrypt.hash(payload.password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(String(payload.name).trim(), String(payload.email).toLowerCase(), password, String(payload.role || 'VIEWER').toUpperCase(), String(payload.status || 'ACTIVE').toUpperCase());
  return sanitizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid));
}

async function updateUser(id, payload) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) throw new AppError('User not found', 404);
  const errors = validateUserPayload(payload, true);
  if (errors.length) throw new AppError('Validation failed', 400, errors);
  if (payload.email && payload.email.toLowerCase() !== user.email.toLowerCase()) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(payload.email.toLowerCase());
    if (existing) throw new AppError('Email already exists', 409, [{ field: 'email', message: 'Email already exists' }]);
  }
  const nextName = payload.name !== undefined ? String(payload.name).trim() : user.name;
  const nextEmail = payload.email !== undefined ? String(payload.email).toLowerCase() : user.email;
  const nextRole = payload.role !== undefined ? String(payload.role).toUpperCase() : user.role;
  const nextStatus = payload.status !== undefined ? String(payload.status).toUpperCase() : user.status;
  db.prepare(`
    UPDATE users
    SET name = ?, email = ?, role = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(nextName, nextEmail, nextRole, nextStatus, id);
  return getUserById(id);
}

function deactivateUser(id) {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) throw new AppError('User not found', 404);
  db.prepare(`UPDATE users SET status = 'INACTIVE', updated_at = datetime('now') WHERE id = ?`).run(id);
  return { id, status: 'INACTIVE' };
}

module.exports = { listUsers, getUserById, createUser, updateUser, deactivateUser };