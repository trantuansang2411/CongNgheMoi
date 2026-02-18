const svc = require('../services/review.service');

const createReview = async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createReview(req.user.id, req.body) }); } catch (e) { next(e); } };
const updateReview = async (req, res, next) => { try { res.json({ success: true, data: await svc.updateReview(req.user.id, req.params.reviewId, req.body) }); } catch (e) { next(e); } };
const deleteReview = async (req, res, next) => { try { res.json({ success: true, data: await svc.deleteReview(req.user.id, req.params.reviewId) }); } catch (e) { next(e); } };
const getReviewsByCourse = async (req, res, next) => { try { res.json({ success: true, data: await svc.getReviewsByCourse(req.params.courseId, +req.query.page || 1, +req.query.limit || 20) }); } catch (e) { next(e); } };
const getCourseStats = async (req, res, next) => { try { res.json({ success: true, data: await svc.getCourseStats(req.params.courseId) }); } catch (e) { next(e); } };

module.exports = { createReview, updateReview, deleteReview, getReviewsByCourse, getCourseStats };
