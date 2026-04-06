const router = require('express').Router();
const controller = require('./dashboard.controller');
const auth = require('../../middlewares/auth');

router.use(auth);
router.get('/summary', controller.summary);
router.get('/by-category', controller.byCategory);
router.get('/trends', controller.trends);
router.get('/recent', controller.recent);
router.get('/frequency', controller.frequency);
router.get('/top-categories', controller.topCategories);

module.exports = router;