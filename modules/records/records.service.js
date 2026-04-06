const db = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { toIsoDate, startOfDay, endOfDay } = require('../../utils/dateUtils');
const { importBuffer, listImportLogs } = require('./records.import');
const { toCsvBuffer, toExcelBuffer, templateCsvBuffer, templateExcelBuffer } = require('./records.export');

function buildFilters(query) {
  const clauses = ['is_deleted = 0'];
  const params = [];
  if (query.type) { clauses.push('type = ?'); params.push(String(query.type).toUpperCase()); }
  if (query.category) { clauses.push('category = ?'); params.push(String(query.category).trim()); }
  if (query.source) { clauses.push('source = ?'); params.push(String(query.source).toUpperCase()); }
  if (query.startDate) { clauses.push('date >= ?'); params.push(toIsoDate(query.startDate)); }
  if (query.endDate) { clauses.push('date <= ?'); params.push(toIsoDate(query.endDate)); }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function validateRecord(payload) {
  const errors = [];
  const amount = Number(payload.amount);
  const type = String(payload.type || '').trim().toUpperCase();
  const category = String(payload.category || '').trim();
  const date = toIsoDate(payload.date);
  if (!Number.isFinite(amount) || amount <= 0) errors.push({ field: 'amount', message: 'Amount must be a positive number' });
  if (!['INCOME', 'EXPENSE'].includes(type)) errors.push({ field: 'type', message: 'Type must be INCOME or EXPENSE' });
  if (!category) errors.push({ field: 'category', message: 'Category is required' });
  if (!date) errors.push({ field: 'date', message: 'Date must be valid ISO format' });
  return { errors, value: { ...payload, amount, type, category, date } };
}

function countAll(query, user) {
  const { where, params } = buildFilters(query);
  return db.prepare(`SELECT COUNT(*) AS total FROM financial_records ${where}`).get(...params).total;
}

function listRecords(query, user) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const sortBy = ['date', 'amount', 'category', 'type'].includes(query.sortBy) ? query.sortBy : 'date';
  const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const { where, params } = buildFilters(query);
  const total = db.prepare(`SELECT COUNT(*) AS total FROM financial_records ${where}`).get(...params).total;
  const offset = (page - 1) * limit;
  const sql = `
    SELECT id, amount, type, category, date, time, created_at, source, notes
    FROM financial_records
    ${where}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(sql).all(...params, limit, offset);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

function getRecordById(id, user) {
  const record = db.prepare(`
    SELECT id, user_id, amount, type, category, date, time, notes, source, is_deleted, created_at, updated_at
    FROM financial_records
    WHERE id = ?
  `).get(id);
  if (!record || record.is_deleted) throw new AppError('Record not found', 404);
  return record;
}

function createRecord(payload, userId) {
  const { errors, value } = validateRecord(payload);
  if (errors.length) throw new AppError('Validation failed', 400, errors);
  const result = db.prepare(`
    INSERT INTO financial_records (user_id, amount, type, category, date, time, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'MANUAL')
  `).run(userId, value.amount, value.type, value.category, value.date, value.time || null, value.notes || null);
  return getRecordById(result.lastInsertRowid, { role: 'ADMIN', userId });
}

function updateRecord(id, payload) {
  const current = db.prepare('SELECT * FROM financial_records WHERE id = ?').get(id);
  if (!current || current.is_deleted) throw new AppError('Record not found', 404);
  const next = { ...current, ...payload };
  const { errors, value } = validateRecord(next);
  if (errors.length) throw new AppError('Validation failed', 400, errors);
  db.prepare(`
    UPDATE financial_records
    SET amount = ?, type = ?, category = ?, date = ?, time = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(value.amount, value.type, value.category, value.date, value.time || current.time, value.notes || current.notes, id);
  return db.prepare(`SELECT id, amount, type, category, date, time, notes, source, created_at, updated_at FROM financial_records WHERE id = ?`).get(id);
}

function deleteRecord(id) {
  const result = db.prepare('SELECT id FROM financial_records WHERE id = ? AND is_deleted = 0').get(id);
  if (!result) throw new AppError('Record not found', 404);
  db.prepare('UPDATE financial_records SET is_deleted = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id);
  return { id, is_deleted: 1 };
}

function restoreRecord(id) {
  const result = db.prepare('SELECT id FROM financial_records WHERE id = ? AND is_deleted = 1').get(id);
  if (!result) throw new AppError('Record not found', 404);
  db.prepare('UPDATE financial_records SET is_deleted = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id);
  return { id, is_deleted: 0 };
}

function importRecords(file, userId) {
  return importBuffer({ buffer: file.buffer, filename: file.originalname, mimeType: file.mimetype, userId });
}

function exportRecords(query) {
  const { where, params } = buildFilters(query);
  const rows = db.prepare(`
    SELECT id, amount, type, category, date, time, notes, source, created_at
    FROM financial_records
    ${where}
    ORDER BY date DESC, created_at DESC
  `).all(...params);
  return query.format === 'excel' ? toExcelBuffer(rows) : toCsvBuffer(rows);
}

function template(format) {
  return String(format).toLowerCase() === 'excel' ? templateExcelBuffer() : templateCsvBuffer();
}

function recentImportLogs(query) {
  return listImportLogs(query);
}

module.exports = {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  restoreRecord,
  importRecords,
  exportRecords,
  template,
  recentImportLogs,
  countAll
};