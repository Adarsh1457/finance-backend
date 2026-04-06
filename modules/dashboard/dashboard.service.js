const db = require('../../config/db');
const { formatMonth, isoWeekKey } = require('../../utils/dateUtils');

function baseWhere() {
  return 'WHERE is_deleted = 0';
}

function paramsFor() {
  return [];
}

function summary(user) {
  const where = baseWhere();
  const params = paramsFor();
  const rows = db.prepare(`SELECT amount, type, category FROM financial_records ${where}`).all(...params);
  const totalIncome = rows.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0);
  const totalExpenses = rows.filter((row) => row.type === 'EXPENSE').reduce((sum, row) => sum + row.amount, 0);
  const recordCount = rows.length;
  const avgTransactionAmount = recordCount ? rows.reduce((sum, row) => sum + Math.abs(row.amount), 0) / recordCount : 0;
  const categoryMap = new Map();
  rows.forEach((row) => categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + 1));
  let mostUsedCategory = '';
  let maxCount = 0;
  categoryMap.forEach((count, category) => {
    if (count > maxCount) {
      maxCount = count;
      mostUsedCategory = category;
    }
  });
  return { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses, recordCount, avgTransactionAmount, mostUsedCategory };
}

function byCategory(user) {
  const where = baseWhere();
  const params = paramsFor();
  const rows = db.prepare(`SELECT category, amount, type FROM financial_records ${where}`).all(...params);
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.category)) map.set(row.category, { category: row.category, totalIncome: 0, totalExpense: 0, net: 0, count: 0 });
    const item = map.get(row.category);
    if (row.type === 'INCOME') item.totalIncome += row.amount; else item.totalExpense += row.amount;
    item.count += 1;
    item.net = item.totalIncome - item.totalExpense;
  });
  return Array.from(map.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

function trends(user, period = 'monthly') {
  const where = baseWhere();
  const params = paramsFor();
  const rows = db.prepare(`SELECT date, amount, type FROM financial_records ${where} ORDER BY date ASC`).all(...params);
  const map = new Map();
  rows.forEach((row) => {
    const key = period === 'weekly' ? isoWeekKey(row.date) : formatMonth(row.date);
    if (!map.has(key)) map.set(key, { period: key, income: 0, expenses: 0, net: 0, count: 0 });
    const item = map.get(key);
    if (row.type === 'INCOME') item.income += row.amount; else item.expenses += row.amount;
    item.count += 1;
    item.net = item.income - item.expenses;
  });
  return Array.from(map.values()).slice(-12);
}

function recent(user, limit = 10) {
  const where = baseWhere();
  const params = paramsFor();
  return db.prepare(`
    SELECT id, amount, type, category, date, time, notes, source, created_at
    FROM financial_records ${where}
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(...params, limit);
}

function frequency(user) {
  const where = baseWhere();
  const params = paramsFor();
  const rows = db.prepare(`SELECT date FROM financial_records ${where}`).all(...params);
  const map = new Map();
  rows.forEach((row) => map.set(row.date, (map.get(row.date) || 0) + 1));
  return Array.from(map.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
}

function topCategories(user, limit = 5) {
  const where = baseWhere();
  const params = paramsFor();
  const rows = db.prepare(`SELECT category, amount, type FROM financial_records ${where}`).all(...params);
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.category)) map.set(row.category, { category: row.category, income: 0, expense: 0, total: 0 });
    const item = map.get(row.category);
    if (row.type === 'INCOME') item.income += row.amount; else item.expense += row.amount;
    item.total = item.income + item.expense;
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, limit).map((item) => ({
    category: item.category,
    income: item.income,
    expense: item.expense,
    total: item.total
  }));
}

module.exports = { summary, byCategory, trends, recent, frequency, topCategories };