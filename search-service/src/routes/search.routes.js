const { Router } = require('express');
const ctrl = require('../controllers/search.controller');
const router = Router();
router.get('/', ctrl.searchCourses);
module.exports = router;
