const { Router } = require('express');
const ctrl = require('../controllers/coupon.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth.middleware');
const router = Router({ mergeParams: true });

router.post('/', authenticate, authorize('INSTRUCTOR'), ctrl.createCoupon);
router.get('/', authenticate, authorize('INSTRUCTOR'), ctrl.getCoupons);
router.delete('/:couponId', authenticate, authorize('INSTRUCTOR'), ctrl.deleteCoupon);

module.exports = router;
