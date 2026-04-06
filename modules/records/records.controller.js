const { asyncHandler } = require('../../utils/errors');
const { successResponse } = require('../../utils/response');
const service = require('./records.service');

const listRecords = asyncHandler(async (req, res) => {
  const result = service.listRecords(req.query, req.user);
  return successResponse(res, result.data, result.meta);
});

const getRecord = asyncHandler(async (req, res) => successResponse(res, service.getRecordById(Number(req.params.id), req.user)));

const createRecord = asyncHandler(async (req, res) => successResponse(res, service.createRecord(req.body, req.user.userId), undefined, 201));

const updateRecord = asyncHandler(async (req, res) => successResponse(res, service.updateRecord(Number(req.params.id), req.body)));

const deleteRecord = asyncHandler(async (req, res) => successResponse(res, service.deleteRecord(Number(req.params.id))));

const restoreRecord = asyncHandler(async (req, res) => successResponse(res, service.restoreRecord(Number(req.params.id))));

const importRecords = asyncHandler(async (req, res) => {
  const result = await service.importRecords(req.file, req.user.userId);
  return successResponse(res, result);
});

const importTemplate = asyncHandler(async (req, res) => {
  const format = String(req.query.format || 'csv').toLowerCase();
  const buffer = service.template(format);
  if (format === 'excel') {
    res.setHeader('Content-Disposition', 'attachment; filename=records_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } else {
    res.setHeader('Content-Disposition', 'attachment; filename=records_template.csv');
    res.setHeader('Content-Type', 'text/csv');
  }
  return res.send(buffer);
});

const exportRecords = asyncHandler(async (req, res) => {
  const format = String(req.query.format || 'csv').toLowerCase();
  const buffer = service.exportRecords({ ...req.query, format });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = format === 'excel' ? 'xlsx' : 'csv';
  res.setHeader('Content-Disposition', `attachment; filename=records_export_${timestamp}.${ext}`);
  res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
  return res.send(buffer);
});

const importLogs = asyncHandler(async (req, res) => {
  const result = service.recentImportLogs(req.query);
  return successResponse(res, result.data, result.meta);
});

const count = asyncHandler(async (req, res) => successResponse(res, { count: service.countAll(req.query, req.user) }));

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord, restoreRecord, importRecords, importTemplate, exportRecords, importLogs, count };