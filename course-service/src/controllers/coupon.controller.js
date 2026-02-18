const svc = require('../services/course.service');

const createCoupon = async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await svc.createCoupon(req.params.courseId, req.user.id, req.body) }); } catch (e) { next(e); }
};
const getCoupons = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.getCoupons(req.params.courseId) }); } catch (e) { next(e); }
};
const deleteCoupon = async (req, res, next) => {
    try { res.json({ success: true, data: await svc.deleteCoupon(req.params.couponId, req.user.id) }); } catch (e) { next(e); }
};

module.exports = { createCoupon, getCoupons, deleteCoupon };
