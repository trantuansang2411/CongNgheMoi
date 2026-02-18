const Section = require('../models/mongoose/Section.model');

async function create(data) {
    return Section.create(data);
}

async function findByCourse(courseId) {
    return Section.find({ courseId }).sort({ orderIndex: 1 });
}

async function findById(id) {
    return Section.findById(id);
}

async function update(id, data) {
    return Section.findByIdAndUpdate(id, data, { new: true });
}

async function remove(id) {
    return Section.findByIdAndDelete(id);
}

async function reorder(courseId, orderedIds) {
    const ops = orderedIds.map((id, index) =>
        Section.findByIdAndUpdate(id, { orderIndex: index })
    );
    return Promise.all(ops);
}

module.exports = { create, findByCourse, findById, update, remove, reorder };
