const svc = require('../services/certificate.service');
const getCertificates = async (req, res, next) => { try { res.json({ success: true, data: await svc.getCertificatesByStudent(req.user.id) }); } catch (e) { next(e); } };
const verify = async (req, res, next) => { try { res.json({ success: true, data: await svc.verifyCertificate(req.params.certificateId) }); } catch (e) { next(e); } };
module.exports = { getCertificates, verify };
