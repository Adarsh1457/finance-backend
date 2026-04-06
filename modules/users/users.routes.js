const router = require('express').Router();
const controller = require('./users.controller');
const auth = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');

router.use(auth, requireRole('ADMIN'));
router.get('/', controller.listUsers);
router.get('/:id', controller.getUser);
router.post('/', controller.createUser);
router.patch('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

module.exports = router;