const userService = require('../services/user.service');
const path = require('path');
const fs = require('fs');

async function getProfile(req, res, next) {
    try {
        const profile = await userService.getProfile(req.user.id, req.user.email);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
    try {
        const profile = await userService.updateProfile(req.user.id, req.body);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}

async function applyInstructor(req, res, next) {
    try {
        const dataWithEmail = { ...req.body, email: req.user.email || '' };

        // If file uploaded, add profileImageUrl
        if (req.file) {
            dataWithEmail.profileImageUrl = `/uploads/instructor-applications/${req.file.filename}`;
        }

        const application = await userService.applyInstructor(req.user.id, dataWithEmail);
        res.status(201).json({ success: true, data: application });
    } catch (err) { next(err); }
}

async function getApplication(req, res, next) {
    try {
        const application = await userService.getApplication(req.user.id);
        res.json({ success: true, data: application });
    } catch (err) { next(err); }
}

async function getInstructorProfile(req, res, next) {
    try {
        const profile = await userService.getInstructorProfile(req.params.userId);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}
async function updateInstructorProfile(req, res, next) {
    try {
        const profile = await userService.updateInstructorProfile(req.user.id, req.body);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}
async function getMyInstructorProfile(req, res, next) {
    try {
        const profile = await userService.getInstructorProfile(req.user.id);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}

async function uploadUserAvatar(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: { message: 'Vui lòng chọn file ảnh.' } });
        }

        // Xoá ảnh cũ nếu là file local
        const oldProfile = await userService.getProfile(req.user.id).catch(() => null);
        if (oldProfile?.avatarUrl?.includes('/uploads/')) {
            const oldPath = path.join(__dirname, '../../uploads', oldProfile.avatarUrl.split('/uploads/')[1]);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const avatarUrl = `/uploads/avatars/users/${req.file.filename}`;
        const profile = await userService.updateProfile(req.user.id, { avatarUrl });
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}

async function uploadInstructorAvatar(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: { message: 'Vui lòng chọn file ảnh.' } });
        }

        // Xoá ảnh cũ nếu là file local
        const oldProfile = await userService.getInstructorProfile(req.user.id).catch(() => null);
        if (oldProfile?.avatarUrl?.includes('/uploads/')) {
            const oldPath = path.join(__dirname, '../../uploads', oldProfile.avatarUrl.split('/uploads/')[1]);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const avatarUrl = `/uploads/avatars/instructors/${req.file.filename}`;
        const profile = await userService.updateInstructorProfile(req.user.id, { avatarUrl });
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}


module.exports = { getProfile, updateProfile, applyInstructor, getApplication, getInstructorProfile, updateInstructorProfile, getMyInstructorProfile, uploadUserAvatar, uploadInstructorAvatar };
