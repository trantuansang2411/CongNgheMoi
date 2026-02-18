const userRepo = require('../repositories/user.repo');
const logger = require('../../shared/utils/logger');
const { NotFoundError, BadRequestError, ConflictError } = require('../../shared/utils/errors');

async function getProfile(userId) {
    let profile = await userRepo.findProfileByUserId(userId);
    if (!profile) {
        profile = await userRepo.createProfile({ userId });
    }
    return profile;
}

async function updateProfile(userId, data) {
    const profile = await userRepo.updateProfile(userId, data);
    return profile;
}

async function applyInstructor(userId, applicationData) {
    const existing = await userRepo.findApplicationByUserId(userId);
    if (existing && existing.status === 'PENDING') {
        throw new ConflictError('You already have a pending application');
    }
    if (existing && existing.status === 'APPROVED') {
        throw new ConflictError('You are already an approved instructor');
    }

    const application = await userRepo.createInstructorApplication({
        userId,
        data: applicationData,
    });

    logger.info(`Instructor application submitted: ${userId}`);
    return application;
}

async function getApplication(userId) {
    const application = await userRepo.findApplicationByUserId(userId);
    if (!application) {
        throw new NotFoundError('No application found');
    }
    return application;
}

async function reviewApplication(applicationId, status, reviewerId) {
    const application = await userRepo.findApplicationById(applicationId);
    if (!application) {
        throw new NotFoundError('Application not found');
    }
    if (application.status !== 'PENDING') {
        throw new BadRequestError('Application already reviewed');
    }

    const updated = await userRepo.updateApplicationStatus(applicationId, status, reviewerId);

    // If approved, create instructor profile
    if (status === 'APPROVED') {
        await userRepo.createInstructorProfile({
            userId: application.userId,
            displayName: application.data.fullName || 'Instructor',
            headline: application.data.headline || '',
        });
        logger.info(`Instructor approved: ${application.userId}`);
    }

    return updated;
}

async function listApplications(filter, page, limit) {
    return userRepo.listApplications(filter, page, limit);
}

async function getInstructorProfile(userId) {
    const profile = await userRepo.findInstructorProfile(userId);
    if (!profile) {
        throw new NotFoundError('Instructor profile not found');
    }
    return profile;
}

async function updateInstructorStatus(userId, status) {
    const profile = await userRepo.updateInstructorStatus(userId, status);
    if (!profile) {
        throw new NotFoundError('Instructor not found');
    }
    logger.info(`Instructor status updated: ${userId} -> ${status}`);
    return profile;
}

module.exports = {
    getProfile,
    updateProfile,
    applyInstructor,
    getApplication,
    reviewApplication,
    listApplications,
    getInstructorProfile,
    updateInstructorStatus,
};
