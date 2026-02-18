const { Router } = require('express');
const ctrl = require('../controllers/certificate.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();
router.get('/', authenticate, ctrl.getCertificates);
router.get('/verify/:certificateId', ctrl.verify);
module.exports = router;
