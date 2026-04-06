require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./config/db');

async function seed() {
  db.prepare('DELETE FROM import_logs').run();
  db.prepare('DELETE FROM financial_records').run();
  db.prepare('DELETE FROM users').run();

  const passwordAdmin = await bcrypt.hash('Admin@1234', 10);
  const passwordTest = await bcrypt.hash('Test@1234', 10);

  const users = [
    { name: 'Admin', email: 'admin@finance.dev', password: passwordAdmin, role: 'ADMIN' },
    { name: 'Analyst', email: 'analyst@finance.dev', password: passwordTest, role: 'ANALYST' },
    { name: 'Viewer', email: 'viewer@finance.dev', password: passwordTest, role: 'VIEWER' }
  ];

  const insertUser = db.prepare('INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)');
  users.forEach((user) => insertUser.run(user.name, user.email, user.password, user.role, 'ACTIVE'));

  const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@finance.dev');
  const categories = ['Salary', 'Freelance', 'Rent', 'Groceries', 'Utilities', 'Transport', 'Entertainment', 'Health'];
  const types = ['INCOME', 'EXPENSE'];
  const sources = ['MANUAL', 'CSV', 'EXCEL'];
  const insertRecord = db.prepare(`
    INSERT INTO financial_records (user_id, amount, type, category, date, time, notes, source, is_deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  const now = new Date();
  for (let index = 0; index < 30; index += 1) {
    const type = types[index % types.length];
    const category = categories[index % categories.length];
    const source = sources[index % sources.length];
    const date = new Date(now);
    date.setMonth(date.getMonth() - Math.floor(index / 5));
    date.setDate((index % 27) + 1);
    const dateString = date.toISOString().slice(0, 10);
    const time = `${String(8 + (index % 10)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}:${String((index * 13) % 60).padStart(2, '0')}`;
    const amount = type === 'INCOME' ? 1200 + index * 100 : 80 + index * 25;
    insertRecord.run(admin.id, amount, type, category, dateString, time, `Sample ${category.toLowerCase()} record ${index + 1}`, source);
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete');
}

seed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});