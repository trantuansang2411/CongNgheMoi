const Lesson = require('../models/mongoose/Lesson.model');

async function create(data) {
    return Lesson.create(data);
}

async function findBySection(sectionId) {
    return Lesson.find({ sectionId }).sort({ orderIndex: 1 });
}

async function findByCourse(courseId) {
    return Lesson.find({ courseId }).sort({ orderIndex: 1 });
}

async function findById(id) {
    return Lesson.findById(id);
}

async function update(id, data) {
    return Lesson.findByIdAndUpdate(id, data, { new: true });
}

async function remove(id) {
    return Lesson.findByIdAndDelete(id);
}

async function reorder(sectionId, orderedIds) {
    const ops = orderedIds.map((id, index) =>
        Lesson.findByIdAndUpdate(id, { orderIndex: index })
    );
    return Promise.all(ops);
}

async function findPreviewLessons(courseId) {
    return Lesson.find({ courseId, isPreview: true }).sort({ orderIndex: 1 });
}

module.exports = { create, findBySection, findByCourse, findById, update, remove, reorder, findPreviewLessons };
