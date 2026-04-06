const router = require('express').Router();
const controller = require('./records.controller');
const auth = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const upload = require('../../middlewares/upload');

router.use(auth);
router.get('/', controller.listRecords);
router.get('/count', controller.count);
router.get('/export', requireRole('VIEWER', 'ANALYST', 'ADMIN'), controller.exportRecords);
router.get('/import/template', requireRole('ADMIN'), controller.importTemplate);
router.get('/import/logs', requireRole('ADMIN'), controller.importLogs);
router.post('/import', requireRole('ADMIN'), upload.single('file'), controller.importRecords);
router.get('/:id', controller.getRecord);
router.post('/', requireRole('ADMIN'), controller.createRecord);
router.patch('/:id', requireRole('ADMIN'), controller.updateRecord);
router.delete('/:id', requireRole('ADMIN'), controller.deleteRecord);
router.patch('/:id/restore', requireRole('ADMIN'), controller.restoreRecord);

module.exports = router;