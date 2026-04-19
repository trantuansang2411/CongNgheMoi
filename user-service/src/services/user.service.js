const userRepo = require('../repositories/user.repo');
const logger = require('../../shared/utils/logger');
const { NotFoundError, BadRequestError, ConflictError } = require('../../shared/utils/errors');
const rabbitmq = require('../../shared/events/rabbitmq');

async function getProfile(userId, email = '') {
    const profile = await userRepo.findProfileByUserId(userId);
    if (profile) {
        return profile;
    }

    // Self-heal missing profile when user.created event was missed.
    const safeEmail = typeof email === 'string' ? email.trim() : '';
    const fallbackName = safeEmail.includes('@') ? safeEmail.split('@')[0] : 'User';

    try {
        const createdProfile = await userRepo.createProfile({ userId, fullName: fallbackName });
        logger.warn(`Profile auto-created on /me read for user: ${userId}`);
        return createdProfile;
    } catch (err) {
        if (err?.code === 11000) {
            // Another worker created it first.
            const existing = await userRepo.findProfileByUserId(userId);
            if (existing) return existing;
        }
        throw err;
    }
}

// Được gọi từ RabbitMQ event handler khi Auth Service tạo account mới
async function createProfileFromEvent({ userId, email }) {
    const existing = await userRepo.findProfileByUserId(userId);
    if (existing) {
        logger.warn(`Profile already exists for user: ${userId}`);
        return existing;
    }
    const profile = await userRepo.createProfile({ userId, fullName: email.split('@')[0] });
    logger.info(`Profile created from event for user: ${userId}`);
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

async function getApplicationById(applicationId) {
    const application = await userRepo.findApplicationById(applicationId);
    if (!application) {
        throw new NotFoundError('Application not found');
    }
    const plainApp = application.toObject ? application.toObject() : { ...application };

    // Lấy avatar từ InstructorProfile trước, fallback về UserProfile
    const instructorProfile = await userRepo.findInstructorProfile(plainApp.userId);
    if (instructorProfile && instructorProfile.avatarUrl) {
        plainApp.avatarUrl = instructorProfile.avatarUrl;
    } else {
        const userProfile = await userRepo.findProfileByUserId(plainApp.userId);
        plainApp.avatarUrl = userProfile?.avatarUrl || '';
    }

    return plainApp;
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
        const displayName = application.data.fullName || 'Instructor';
        const profileData = {
            userId: application.userId,
            displayName,
        };
        // Copy ảnh từ đơn sang InstructorProfile
        if (application.data.profileImageUrl) {
            profileData.avatarUrl = application.data.profileImageUrl;
        }
        await userRepo.createInstructorProfile(profileData);
        await rabbitmq.publishEvent('instructor.approved', {
            userId: application.userId,
            displayName
        });
        logger.info(`Instructor approved: ${application.userId}`);
    }

    return updated;
}

async function listApplications(filter, page, limit) {
    const result = await userRepo.listApplications(filter, page, limit);

    const userIds = [...new Set(result.items.map((item) => item.userId).filter(Boolean))];
    const [userProfiles, instructorProfiles] = userIds.length > 0
        ? await Promise.all([
            userRepo.findProfilesByUserIds(userIds),
            userRepo.findInstructorProfilesByUserIds(userIds),
        ])
        : [[], []];

    const userAvatarMap = new Map(userProfiles.map((p) => [p.userId, p.avatarUrl || '']));
    const instructorAvatarMap = new Map(instructorProfiles.map((p) => [p.userId, p.avatarUrl || '']));

    return {
        ...result,
        items: result.items.map((item) => {
            const plainItem = typeof item.toObject === 'function' ? item.toObject() : item;
            // Ưu tiên avatar instructor profile, fallback về user profile, rồi ảnh trong đơn
            const avatarUrl = instructorAvatarMap.get(item.userId) || userAvatarMap.get(item.userId) || plainItem.data?.profileImageUrl || '';
            return { ...plainItem, avatarUrl };
        }),
    };
}

async function getInstructorProfile(userId) {
    const profile = await userRepo.findInstructorProfile(userId);
    if (!profile) {
        throw new NotFoundError('Instructor profile not found');
    }

    // Lấy đơn đã duyệt để kèm thông tin ứng tuyển
    const application = await userRepo.findApplicationByUserId(userId);
    const profileObj = profile.toObject ? profile.toObject() : { ...profile };

    if (application && application.status === 'APPROVED' && application.data) {
        const appData = application.data;
        profileObj.applicationData = {
            fullName: appData.fullName || '',
            birthDate: appData.birthDate || null,
            headline: appData.headline || '',
            experience: appData.experience || '',
            expertise: appData.expertise || '',
            educationLevel: appData.educationLevel || '',
            teachingTopics: appData.teachingTopics || [],
            portfolioUrl: appData.portfolioUrl || '',
            email: appData.email || '',
        };
    }

    return profileObj;
}

async function updateInstructorProfile(userId, data) {
    const profile = await userRepo.findInstructorProfile(userId);
    if (!profile) {
        throw new NotFoundError('Instructor profile not found');
    }
    const updated = await userRepo.updateInstructorProfile(userId, data);
    await rabbitmq.publishEvent('instructor.profile.updated', {
        userId,
        displayName: updated.displayName,
    });
    return updated;
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
    createProfileFromEvent,
    updateProfile,
    applyInstructor,
    getApplication,
    getApplicationById,
    reviewApplication,
    listApplications,
    getInstructorProfile,
    updateInstructorStatus,
    updateInstructorProfile
};
