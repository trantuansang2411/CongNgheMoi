const userService = require('../services/user.service');

async function getProfile(req, res, next) {
    try {
        const profile = await userService.getProfile(req.user.id);
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
        const application = await userService.applyInstructor(req.user.id, req.body);
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
        const profile = await userService.getInstructorProfile(req.params.userId || req.user.id);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, applyInstructor, getApplication, getInstructorProfile };
