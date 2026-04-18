const Course = require('../models/mongoose/Course.model');
const Section = require('../models/mongoose/Section.model');
const Lesson = require('../models/mongoose/Lesson.model');
const LessonResource = require('../models/mongoose/LessonResource.model');
const Coupon = require('../models/mongoose/Coupon.model');
const InstructorProfile = require('../models/mongoose/InstructorProfile.model');
const Category = require('../models/mongoose/Category.model');
const slugify = require('slugify');

// ============ INSTRUCTOR PROFILE ============
async function upsertInstructorProfile(userId, displayName) {
    return InstructorProfile.findOneAndUpdate(
        { instructorId: userId },
        { instructorId: userId, displayName },
        { upsert: true, new: true }
    );
}

async function updateCoursesInstructorName(instructorId, displayName) {
    return Course.updateMany({ instructorId }, { instructorName: displayName });
}

async function findInstructorProfile(instructorId) {
    return InstructorProfile.findOne({ instructorId });
}

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
            .select('courseId title slug thumbnailUrl basePrice salePrice currency instructorId instructorName ratingAvg ratingCount')
            .sort({ publishedAt: -1 }).skip(skip).limit(limit),
        Course.countDocuments({ status: 'PUBLISHED', deletedAt: null }),
    ]);
    return { items, total, page, limit };
}

async function findSubmitted(status = '', page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const validStatuses = ['SUBMITTED', 'NEEDS_FIXES', 'PUBLISHED'];
    const statusFilter = status && validStatuses.includes(status) ? status : { $in: validStatuses };
    const [items, total] = await Promise.all([
        Course.find({ status: statusFilter, deletedAt: null })
            .select('courseId title instructorId instructorName thumbnailUrl basePrice salePrice currency status totalSections totalLessons totalDurationSec submittedAt')
            .sort({ submittedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Course.countDocuments({ status: statusFilter, deletedAt: null }),
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

async function findAllCategories() {
    return Category.find({ deletedAt: null })
        .select('categoryId name slug description iconUrl orderIndex')
        .sort({ orderIndex: 1, name: 1 });
}

// ============ SECTION ============
async function createSection(data) {
    return Section.create(data);
}

async function findSectionsByCourse(courseId) {
    return Section.find({ courseId }).sort({ orderIndex: 1 });
}

async function findSectionById(sectionId) {
    return Section.findOne({ sectionId });
}

async function updateSection(sectionId, data) {
    return Section.findOneAndUpdate({ sectionId }, data, { new: true });
}

async function removeSection(sectionId) {
    return Section.findOneAndDelete({ sectionId });
}

async function reorderSections(courseId, orderedIds) {
    const ops = orderedIds.map((id, index) =>
        Section.findOneAndUpdate({ _id: id, courseId },  // filter nếu chỉ cần lọc theo id thôi thì không cần _id: id nếu thêm 1 điều kiện thì cần thêm _id: id
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

async function findLessonById(lessonId) {
    // Try by UUID lessonId field first (correct usage)
    const byUuid = await Lesson.findOne({ lessonId });
    if (byUuid) return byUuid;
    // Fallback: frontend may pass MongoDB _id instead of UUID
    try {
        return await Lesson.findById(lessonId);
    } catch {
        return null;
    }
}

async function updateLesson(lessonId, data) {
    return Lesson.findOneAndUpdate({ lessonId }, data, { new: true });
}

async function removeLesson(lessonId) {
    return Lesson.findOneAndDelete({ lessonId });
}

async function reorderLessons(sectionId, orderedIds) {
    const ops = orderedIds.map((id, index) =>
        Lesson.findOneAndUpdate({ _id: id, sectionId }, { orderIndex: index }, { new: true })
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

async function findResourcesByCourse(courseId) {
    const lessons = await Lesson.find({ courseId });
    const lessonIds = lessons.map(l => l.lessonId || l._id.toString());
    return LessonResource.find({ lessonId: { $in: lessonIds }, deletedAt: null });
}

async function findResourceById(lessonResourceId) {
    return LessonResource.findOne({ resourceId: lessonResourceId });
}

async function updateResource(lessonResourceId, data) {
    return LessonResource.findOneAndUpdate({ resourceId: lessonResourceId }, data, { new: true });
}

async function softDeleteResource(lessonResourceId) {
    return LessonResource.findOneAndUpdate({ resourceId: lessonResourceId }, { deletedAt: new Date() }, { new: true });
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
    // Instructor profile
    upsertInstructorProfile, updateCoursesInstructorName, findInstructorProfile,
    // Course
    createCourse, findByCourseId, findByInstructor, findPublished, findSubmitted,
    updateCourse, softDeleteCourse, updateStatus, updateCourseStats, updateCourseRating,
    findAllCategories,
    // Section
    createSection, findSectionsByCourse, findSectionById,
    updateSection, removeSection, reorderSections,
    // Lesson
    createLesson, findLessonsBySection, findLessonsByCourse, findLessonById,
    updateLesson, removeLesson, reorderLessons, findPreviewLessons,
    // LessonResource
    createResource, findResourcesByLesson, findResourcesByCourse, findResourceById,
    updateResource, softDeleteResource,
    // Coupon
    createCoupon, findCouponsByCourse, findCouponByCode, findCouponById,
    updateCoupon, removeCoupon, incrementCouponUsage,
};
