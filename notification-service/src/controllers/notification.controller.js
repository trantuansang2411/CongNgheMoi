const svc = require('../services/notification.service');

const getNotifications = async (req, res, next) => { try { res.json({ success: true, data: await svc.getNotifications(req.user.id, +req.query.page || 1, +req.query.limit || 20) }); } catch (e) { next(e); } };
const markRead = async (req, res, next) => { try { res.json({ success: true, data: await svc.markRead(req.user.id, req.params.notificationId) }); } catch (e) { next(e); } };
const markAllRead = async (req, res, next) => { try { res.json({ success: true, data: await svc.markAllRead(req.user.id) }); } catch (e) { next(e); } };
const unreadCount = async (req, res, next) => { try { res.json({ success: true, data: await svc.unreadCount(req.user.id) }); } catch (e) { next(e); } };

module.exports = { getNotifications, markRead, markAllRead, unreadCount };
