const Course = require('../models/mongoose/Course.model');
const Section = require('../models/mongoose/Section.model');
const Lesson = require('../models/mongoose/Lesson.model');
const LessonResource = require('../models/mongoose/LessonResource.model');
const Coupon = require('../models/mongoose/Coupon.model');
const slugify = require('slugify');

// ============ COURSE ============
async function createCourse(data) {
    data.slug = slugify(data.title, { lower: true, strict: true }) + '-' + Date.now();
    return Course.create(data);
}

async function findByCourseId(courseId) { //gRPC
    return Course.findOne({ courseId, deletedAt: null });
}

async function findByInstructor(instructorId, page = 1, limit = 20) {
    const skip = (page - 1) * limit; // Tính số lượng phần tử cần bỏ qua
    const [items, total] = await Promise.all([
        Course.find({ instructorId, deletedAt: null }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Course.countDocuments({ instructorId, deletedAt: null }),
    ]);
    return { items, total, page, limit };
}

async function findPublished(page = 1, limit = 20) {
    const skip = (page - 1) * limit; // Tính số lượng phần tử cần bỏ qua
    const [items, total] = await Promise.all([
        Course.find({ status: 'PUBLISHED', deletedAt: null })
            .select('courseId title slug thumbnailUrl basePrice salePrice currency instructorId ratingAvg ratingCount')
            .sort({ publishedAt: -1 }).skip(skip).limit(limit),
        Course.countDocuments({ status: 'PUBLISHED', deletedAt: null }),
    ]);
    return { items, total, page, limit };
}

async function updateCourse(courseId, data) {
    return Course.findOneAndUpdate({ courseId, deletedAt: null }, // filter
        data, //update
        { new: true }); //options có new true thì sẽ trả về dữ liệu mới update nếu không có sẽ là dữ liệu cũ
}

async function softDeleteCourse(courseId) {
    return Course.findOneAndUpdate({ courseId }, { deletedAt: new Date() }, { new: true });
}

async function updateStatus(courseId, status, extra = {}) { // extra là object chứa các trường muốn update thêm
    return Course.findOneAndUpdate({ courseId }, { status, ...extra }, { new: true });
} //gRPC

async function updateCourseStats(courseId) {
    const totalSections = await Section.countDocuments({ courseId });
    const lessons = await Lesson.find({ courseId });
    const totalLessons = lessons.length;
    const totalDurationSec = lessons.reduce((sum, l) => sum + (l.durationSec || 0), 0);

    return Course.findOneAndUpdate(
        { courseId },
        { totalSections, totalLessons, totalDurationSec },
        { new: true }
    );
}

async function updateCourseRating(courseId, ratingAvg, ratingCount) {
    return Course.findOneAndUpdate({ courseId }, { ratingAvg, ratingCount }, { new: true });
}

// ============ SECTION ============
async function createSection(data) {
    return Section.create(data);
}

async function findSectionsByCourse(courseId) {
    return Section.find({ courseId }).sort({ orderIndex: 1 });
}

async function findSectionById(id) {
    return Section.findById(id);
}

async function updateSection(id, data) {
    return Section.findByIdAndUpdate(id, data, { new: true });
}

async function removeSection(id) {
    return Section.findByIdAndDelete(id);
}

async function reorderSections(courseId, orderedIds) {
    const ops = orderedIds.map((id, index) =>
        Section.findByIdAndUpdate({ _id: id, courseId },  // filter nếu chỉ cần lọc theo id thôi thì không cần _id: id nếu thêm 1 điều kiện thì cần thêm _id: id
            { orderIndex: index }, // update
            { new: true } // options
        )
    );
    return Promise.all(ops);
}

// ============ LESSON ============
async function createLesson(data) {
    return Lesson.create(data);
}

async function findLessonsBySection(sectionId) {
    return Lesson.find({ sectionId }).sort({ orderIndex: 1 });
}

async function findLessonsByCourse(courseId) {
    return Lesson.find({ courseId }).sort({ orderIndex: 1 });
}

async function findLessonById(id) {
    return Lesson.findById(id);
}

async function updateLesson(id, data) {
    return Lesson.findByIdAndUpdate(id, data, { new: true });
}

async function removeLesson(id) {
    return Lesson.findByIdAndDelete(id);
}

async function reorderLessons(sectionId, orderedIds) {
    const ops = orderedIds.map((id, index) =>
        Lesson.findByIdAndUpdate({ _id: id, sectionId }, { orderIndex: index }, { new: true })
    );
    return Promise.all(ops);
}

async function findPreviewLessons(courseId) {
    return Lesson.find({ courseId, isPreview: true }).sort({ orderIndex: 1 });
}

// ============ LESSON RESOURCE ============
async function createResource(data) {
    return LessonResource.create(data);
}

async function findResourcesByLesson(lessonId) {
    return LessonResource.find({ lessonId, deletedAt: null });
}

async function findResourceById(id) {
    return LessonResource.findById(id);
}

async function updateResource(id, data) {
    return LessonResource.findByIdAndUpdate(id, data, { new: true });
}

async function softDeleteResource(id) {
    return LessonResource.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });
}

// ============ COUPON ============
async function createCoupon(data) {
    return Coupon.create(data);
}

async function findCouponsByCourse(courseId) {
    return Coupon.find({ courseId });
}

async function findCouponByCode(courseId, code) { //gRPC
    return Coupon.findOne({ courseId, code });
}

async function findCouponById(id) {
    return Coupon.findById(id);
}

async function updateCoupon(id, data) {
    return Coupon.findByIdAndUpdate(id, data, { new: true });
}

async function removeCoupon(id) {
    return Coupon.findByIdAndDelete(id);
}

async function incrementCouponUsage(id) {
    return Coupon.findByIdAndUpdate(id, { $inc: { usedCount: 1 } }, { new: true });
}

module.exports = {
    // Course
    createCourse, findByCourseId, findByInstructor, findPublished,
    updateCourse, softDeleteCourse, updateStatus, updateCourseStats, updateCourseRating,
    // Section
    createSection, findSectionsByCourse, findSectionById,
    updateSection, removeSection, reorderSections,
    // Lesson
    createLesson, findLessonsBySection, findLessonsByCourse, findLessonById,
    updateLesson, removeLesson, reorderLessons, findPreviewLessons,
    // LessonResource
    createResource, findResourcesByLesson, findResourceById,
    updateResource, softDeleteResource,
    // Coupon
    createCoupon, findCouponsByCourse, findCouponByCode, findCouponById,
    updateCoupon, removeCoupon, incrementCouponUsage,
};
