const svc = require('../services/wallet.service');
const getBalance = async (req, res, next) => { try { res.json({ success: true, data: await svc.getBalance(req.user.id) }); } catch (e) { next(e); } };
const getTransactions = async (req, res, next) => { try { res.json({ success: true, data: await svc.getTransactions(req.user.id, +req.query.page || 1, +req.query.limit || 20) }); } catch (e) { next(e); } };
module.exports = { getBalance, getTransactions };
