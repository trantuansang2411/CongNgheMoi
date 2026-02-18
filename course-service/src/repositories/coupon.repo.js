const Coupon = require('../models/mongoose/Coupon.model');

async function create(data) {
    return Coupon.create(data);
}

async function findByCourse(courseId) {
    return Coupon.find({ courseId });
}

async function findByCode(courseId, code) {
    return Coupon.findOne({ courseId, code });
}

async function findById(id) {
    return Coupon.findById(id);
}

async function update(id, data) {
    return Coupon.findByIdAndUpdate(id, data, { new: true });
}

async function remove(id) {
    return Coupon.findByIdAndDelete(id);
}

async function incrementUsage(id) {
    return Coupon.findByIdAndUpdate(id, { $inc: { usedCount: 1 } }, { new: true });
}

module.exports = { create, findByCourse, findByCode, findById, update, remove, incrementUsage };
