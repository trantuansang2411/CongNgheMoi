const Certificate = require('../models/mongoose/Certificate.model');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { NotFoundError } = require('../../shared/utils/errors');
const { v4: uuidv4 } = require('uuid');

async function getCertificatesByStudent(studentId) {
    return Certificate.find({ studentId }).sort({ issuedAt: -1 }).lean();
}

async function verifyCertificate(certificateId) {
    const cert = await Certificate.findById(certificateId).lean();
    if (!cert) throw new NotFoundError('Certificate not found');
    return { valid: true, certificate: cert };
}

async function handleCourseCompleted(data) {
    const { studentId, courseId, enrollmentId } = data;

    const existing = await Certificate.findOne({ studentId, courseId });
    if (existing) { logger.warn(`Certificate already issued: student=${studentId}, course=${courseId}`); return; }

    const certificateNo = `CERT-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const cert = await Certificate.create({
        studentId, courseId, enrollmentId, certificateNo,
        verificationUrl: `/api/v1/certificates/verify/${certificateNo}`,
    });

    await publishEvent('certificate.issued', {
        studentId, courseId, certificateId: cert._id.toString(), certificateNo,
    });
    logger.info(`Certificate issued: ${certificateNo} for student=${studentId}`);
}

module.exports = { getCertificatesByStudent, verifyCertificate, handleCourseCompleted };
