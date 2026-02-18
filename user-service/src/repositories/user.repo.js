const UserProfile = require('../models/mongoose/UserProfile.model');
const InstructorApplication = require('../models/mongoose/InstructorApplication.model');
const InstructorProfile = require('../models/mongoose/InstructorProfile.model');

// -------------- User Profile -------------- //
async function findProfileByUserId(userId) {
    return UserProfile.findOne({ userId });
}

async function createProfile(data) {
    return UserProfile.create(data);
}

async function updateProfile(userId, data) {
    return UserProfile.findOneAndUpdate({ userId }, data, { new: true, upsert: true });
}

// -------------- Instructor Application -------------- //
async function createInstructorApplication(data) {
    return InstructorApplication.create(data);
}

async function findApplicationByUserId(userId) {
    return InstructorApplication.findOne({ userId }).sort({ createdAt: -1 });
}

async function findApplicationById(id) {
    return InstructorApplication.findById(id);
}

async function updateApplicationStatus(id, status, reviewerId) {
    return InstructorApplication.findByIdAndUpdate(id, {
        status,
        reviewerId,
        reviewedAt: new Date(),
    }, { new: true });
}

async function listApplications(filter = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        InstructorApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        InstructorApplication.countDocuments(filter),
    ]);
    return { items, total, page, limit };
}

// -------------- Instructor Profile -------------- //
async function findInstructorProfile(userId) {
    return InstructorProfile.findOne({ userId });
}

async function createInstructorProfile(data) {
    return InstructorProfile.create(data);
}

async function updateInstructorProfile(userId, data) {
    return InstructorProfile.findOneAndUpdate({ userId }, data, { new: true });
}

async function updateInstructorStatus(userId, status) {
    return InstructorProfile.findOneAndUpdate({ userId }, { status }, { new: true });
}

module.exports = {
    findProfileByUserId,
    createProfile,
    updateProfile,
    createInstructorApplication,
    findApplicationByUserId,
    findApplicationById,
    updateApplicationStatus,
    listApplications,
    findInstructorProfile,
    createInstructorProfile,
    updateInstructorProfile,
    updateInstructorStatus,
};
