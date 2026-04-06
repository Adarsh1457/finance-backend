const csvParser = require('csv-parser');
const xlsx = require('xlsx');
const { Readable } = require('stream');
const db = require('../../config/db');
const { AppError } = require('../../utils/errors');
const { nowTime, toIsoDate } = require('../../utils/dateUtils');

const allowedTypes = ['INCOME', 'EXPENSE'];

function normalizeHeaders(row) {
  const normalized = {};
  Object.keys(row).forEach((key) => {
    normalized[String(key).trim().toLowerCase()] = row[key];
  });
  return normalized;
}

function validateRow(row, rowNumber) {
  const errors = [];
  const amount = Number(row.amount);
  const type = String(row.type || '').trim().toUpperCase();
  const category = String(row.category || '').trim();
  const date = toIsoDate(row.date);
  const time = row.time ? String(row.time).trim() : nowTime();
  const notes = row.notes ? String(row.notes).trim() : '';

  if (!Number.isFinite(amount) || amount <= 0) errors.push('amount must be a positive number');
  if (!allowedTypes.includes(type)) errors.push('type must be INCOME or EXPENSE');
  if (!category) errors.push('category is required');
  if (!date) errors.push('date must be valid');

  return { valid: errors.length === 0, value: { amount, type, category, date, time, notes }, errors, rowNumber };
}

function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from([buffer.toString('utf8')])
      .pipe(csvParser())
      .on('data', (row) => rows.push(normalizeHeaders(row)))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function parseExcel(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' }).map(normalizeHeaders);
}

function isDuplicate(record) {
  const exists = db.prepare(`
    SELECT id FROM financial_records
    WHERE amount = ? AND type = ? AND category = ? AND date = ? AND is_deleted = 0
  `).get(record.amount, record.type, record.category, record.date);
  return Boolean(exists);
}

function saveImportLog({ userId, filename, fileType, totalRows, successRows, failedRows, errors }) {
  db.prepare(`
    INSERT INTO import_logs (user_id, filename, file_type, total_rows, success_rows, failed_rows, errors)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, filename, fileType, totalRows, successRows, failedRows, JSON.stringify(errors));
}

async function importBuffer({ buffer, filename, mimeType, userId }) {
  const isCsv = /csv/i.test(mimeType) || filename.toLowerCase().endsWith('.csv');
  const isExcel = /spreadsheet|excel/i.test(mimeType) || /xlsx?|xls/i.test(filename.toLowerCase());
  if (!isCsv && !isExcel) throw new AppError('Unsupported file type', 400);
  const rows = isCsv ? await parseCsv(buffer) : parseExcel(buffer);
  const errors = [];
  let inserted = 0;

  const insert = db.prepare(`
    INSERT INTO financial_records (user_id, amount, type, category, date, time, notes, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((records) => {
    records.forEach((row, index) => {
      const checked = validateRow(row, index + 2);
      if (!checked.valid) {
        errors.push({ row: checked.rowNumber, reason: checked.errors.join('; ') });
        return;
      }
      if (isDuplicate(checked.value)) {
        errors.push({ row: checked.rowNumber, reason: 'duplicate row skipped' });
        return;
      }
      insert.run(userId, checked.value.amount, checked.value.type, checked.value.category, checked.value.date, checked.value.time, checked.value.notes, isCsv ? 'CSV' : 'EXCEL');
      inserted += 1;
    });
  });

  transaction(rows);
  saveImportLog({ userId, filename, fileType: isCsv ? 'CSV' : 'EXCEL', totalRows: rows.length, successRows: inserted, failedRows: rows.length - inserted, errors });
  return { total: rows.length, inserted, failed: rows.length - inserted, errors };
}

function listImportLogs({ page = 1, limit = 10 }) {
  const total = db.prepare('SELECT COUNT(*) AS total FROM import_logs').get().total;
  const rows = db.prepare(`
    SELECT id, filename, file_type, total_rows, success_rows, failed_rows, errors, imported_at
    FROM import_logs
    ORDER BY imported_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, (page - 1) * limit);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

module.exports = { importBuffer, listImportLogs };