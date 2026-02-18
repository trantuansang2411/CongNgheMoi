const LessonResource = require('../models/mongoose/LessonResource.model');

async function create(data) {
    return LessonResource.create(data);
}

async function findByLesson(lessonId) {
    return LessonResource.find({ lessonId, deletedAt: null });
}

async function findById(id) {
    return LessonResource.findById(id);
}

async function update(id, data) {
    return LessonResource.findByIdAndUpdate(id, data, { new: true });
}

async function softDelete(id) {
    return LessonResource.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
}

module.exports = { create, findByLesson, findById, update, softDelete };
