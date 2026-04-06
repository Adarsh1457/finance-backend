const xlsx = require('xlsx');
const { createObjectCsvStringifier } = require('csv-writer');

function toCsvBuffer(records) {
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'id', title: 'ID' },
      { id: 'amount', title: 'Amount' },
      { id: 'type', title: 'Type' },
      { id: 'category', title: 'Category' },
      { id: 'date', title: 'Date' },
      { id: 'time', title: 'Time' },
      { id: 'notes', title: 'Notes' },
      { id: 'source', title: 'Source' },
      { id: 'created_at', title: 'Created At' }
    ]
  });
  const content = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
  return Buffer.from(content, 'utf8');
}

function toExcelBuffer(records) {
  const worksheet = xlsx.utils.json_to_sheet(records.map((record) => ({
    ID: record.id,
    Amount: record.amount,
    Type: record.type,
    Category: record.category,
    Date: record.date,
    Time: record.time,
    Notes: record.notes,
    Source: record.source,
    'Created At': record.created_at
  })));
  const headerRange = xlsx.utils.decode_range(worksheet['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col += 1) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'D9EAF7' } } };
  }
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Records');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
}

function templateCsvBuffer() {
  return Buffer.from('amount,type,category,date,time,notes\n1000,INCOME,Salary,2026-04-01,09:00:00,Example row\n', 'utf8');
}

function templateExcelBuffer() {
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.aoa_to_sheet([
    ['amount', 'type', 'category', 'date', 'time', 'notes'],
    [1000, 'INCOME', 'Salary', '2026-04-01', '09:00:00', 'Example row']
  ]);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Template');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { toCsvBuffer, toExcelBuffer, templateCsvBuffer, templateExcelBuffer };