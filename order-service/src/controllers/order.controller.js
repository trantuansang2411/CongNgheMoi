const svc = require('../services/order.service');

const getCart = async (req, res, next) => { try { res.json({ success: true, data: await svc.getCart(req.user.id) }); } catch (e) { next(e); } };
const addToCart = async (req, res, next) => { try { res.json({ success: true, data: await svc.addToCart(req.user.id, req.body.courseId) }); } catch (e) { next(e); } };
const removeFromCart = async (req, res, next) => { try { res.json({ success: true, data: await svc.removeFromCart(req.user.id, req.params.courseId) }); } catch (e) { next(e); } };
const checkout = async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.checkout(req.user.id, req.body) }); } catch (e) { next(e); } };
const getOrders = async (req, res, next) => { try { res.json({ success: true, data: await svc.getOrders(req.user.id, +req.query.page || 1, +req.query.limit || 20) }); } catch (e) { next(e); } };
const getOrderById = async (req, res, next) => { try { res.json({ success: true, data: await svc.getOrderById(req.user.id, req.params.orderId) }); } catch (e) { next(e); } };

module.exports = { getCart, addToCart, removeFromCart, checkout, getOrders, getOrderById };
