const repo = require('../repositories/course.repo');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../shared/utils/errors');
const userGrpcClient = require('../grpc/user.client');

// ============ COURSE ============
async function createCourse(instructorId, data) {
    const course = await repo.createCourse({ ...data, instructorId });
    logger.info(`Course created: ${course.courseId}`);
    return course;
}

async function getCourse(courseId) { // gRPC
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return course;
}

async function getInstructorCourses(instructorId, page, limit) {
    return repo.findByInstructor(instructorId, page, limit);
}

async function getPublishedCourses(page, limit) {
    return repo.findPublished(page, limit);
}

async function updateCourse(courseId, instructorId, data) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return repo.updateCourse(courseId, data);
}

async function deleteCourse(courseId, instructorId) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return repo.softDeleteCourse(courseId);
}

async function submitCourse(courseId, instructorId) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    if (course.status !== 'DRAFT') throw new BadRequestError('Only draft courses can be submitted');
    return repo.updateStatus(courseId, 'SUBMITTED', { submittedAt: new Date() });
}

async function publishCourse(courseId) { // gRPC
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.status !== 'SUBMITTED') throw new BadRequestError('Course must be submitted first');

    const updated = await repo.updateStatus(courseId, 'PUBLISHED', { publishedAt: new Date() });
// Lấy thông tin instructor displayName từ profile
    let instructorName = 'Unknown';
    try {
        const instructor = await userGrpcClient.getInstructorProfile(updated.instructorId);
        instructorName = instructor.displayName || 'Unknown';
    } catch (err) {
        logger.error('Failed to get instructor name:', err.message);
    }

    try {
        await publishEvent('course.published', {
            courseId: updated.courseId,
            title: updated.title,
            slug: updated.slug,
            description: updated.description,
            
            instructorId: updated.instructorId,
            instructorName: instructorName,
            
            topicId: updated.topicId,
            
            basePrice: updated.basePrice,
            salePrice: updated.salePrice,
            currency: updated.currency,
            
            totalSections: updated.totalSections,
            totalLessons: updated.totalLessons,
            totalDurationSec: updated.totalDurationSec,
            
            thumbnailUrl: updated.thumbnailUrl,
            
            publishedAt: updated.publishedAt,
        });
    } catch (err) {
        logger.error('Failed to publish course.published event:', err.message);
    }

    return updated;
}

async function hideCourse(courseId) { // gRPC
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return repo.updateStatus(courseId, 'HIDDEN');
}

async function previewCourse(courseId, instructorId) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');

    const sections = await repo.findSectionsByCourse(courseId);
    const lessons = await repo.findLessonsByCourse(courseId);
    return { course, sections, lessons };
}

async function getCourseDetail(courseId) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.status !== 'PUBLISHED') throw new NotFoundError('Course not found');

    const sections = await repo.findSectionsByCourse(courseId);
    const lessons = await repo.findLessonsByCourse(courseId);

    return {
        course, sections, lessons: lessons.map(l => ({
            _id: l._id,
            title: l.title,
            sectionId: l.sectionId,
            orderIndex: l.orderIndex,
            durationSec: l.durationSec,
            isPreview: l.isPreview,
            videoUrl: l.isPreview ? l.videoUrl : undefined,
        }))
    };
}

async function getCoursePrice(courseId) { // gRPC
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return {
        courseId: course.courseId,
        title: course.title,
        instructorId: course.instructorId,
        basePrice: course.basePrice,
        salePrice: course.salePrice,
        currency: course.currency,
        status: course.status,
    };
}

// ============ SECTION ============
async function createSection(courseId, instructorId, data) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    const section = await repo.createSection({ ...data, courseId });
    await repo.updateCourseStats(courseId);
    return section;
}

async function getSections(courseId) {
    return repo.findSectionsByCourse(courseId);
}

async function updateSection(sectionId, instructorId, data) {
    const section = await repo.findSectionById(sectionId);
    if (!section) throw new NotFoundError('Section not found');
    const course = await repo.findByCourseId(section.courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return repo.updateSection(sectionId, data);
}

async function deleteSection(sectionId, instructorId) {
    const section = await repo.findSectionById(sectionId);
    if (!section) throw new NotFoundError('Section not found');
    const course = await repo.findByCourseId(section.courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    await repo.removeSection(sectionId);
    await repo.updateCourseStats(section.courseId);
    return { message: 'Section deleted' };
}

async function reorderSections(courseId, instructorId, orderedIds) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    await repo.reorderSections(courseId, orderedIds);
    return { message: 'Sections reordered' };
}

// ============ LESSON ============
async function createLesson(courseId, sectionId, instructorId, data) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    const lesson = await repo.createLesson({ ...data, courseId, sectionId }); // khi spread sẽ gộp thành 1 object
    await repo.updateCourseStats(courseId);
    return lesson;
}

async function getLessons(sectionId) {
    return repo.findLessonsBySection(sectionId);
}

async function updateLesson(lessonId, instructorId, data) {
    const lesson = await repo.findLessonById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    const course = await repo.findByCourseId(lesson.courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    const updated = await repo.updateLesson(lessonId, data);
    await repo.updateCourseStats(lesson.courseId);
    return updated;
}

async function deleteLesson(lessonId, instructorId) {
    const lesson = await repo.findLessonById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    const course = await repo.findByCourseId(lesson.courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    await repo.removeLesson(lessonId);
    await repo.updateCourseStats(lesson.courseId);
    return { message: 'Lesson deleted' };
}

async function reorderLessons(courseId, sectionId, instructorId, orderedIds) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    await repo.reorderLessons(sectionId, orderedIds);
    return { message: 'Lessons reordered' };
}


// ============ RESOURCES ============
async function addResource(lessonId, instructorId, data) {
    const lesson = await repo.findLessonById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    const course = await repo.findByCourseId(lesson.courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return repo.createResource({ ...data, lessonId });
}

async function getResources(lessonId) {
    return repo.findResourcesByLesson(lessonId);
}

async function deleteResource(resourceId, instructorId) {
    const resource = await repo.findResourceById(resourceId);
    if (!resource) throw new NotFoundError('Resource not found');
    const lesson = await repo.findLessonById(resource.lessonId);
    const course = await repo.findByCourseId(lesson.courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return repo.softDeleteResource(resourceId);
}

// ============ COUPON ============
async function createCoupon(courseId, instructorId, data) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return repo.createCoupon({ ...data, courseId });
}

async function getCoupons(courseId) {
    return repo.findCouponsByCourse(courseId);
}

async function validateCoupon(courseId, code) { //gRPC
    const coupon = await repo.findCouponByCode(courseId, code);
    if (!coupon) return { valid: false, message: 'Coupon not found' };
    if (coupon.status !== 'ACTIVE') return { valid: false, message: 'Coupon inactive' };
    if (new Date() < coupon.startAt) return { valid: false, message: 'Coupon not started' };
    if (new Date() > coupon.endAt) return { valid: false, message: 'Coupon expired' };
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return { valid: false, message: 'Coupon usage limit reached' };
    return {
        valid: true,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        message: 'Coupon valid',
    };
}

async function deleteCoupon(couponId, instructorId) {
    const coupon = await repo.findCouponById(couponId);
    if (!coupon) throw new NotFoundError('Coupon not found');
    const course = await repo.findByCourseId(coupon.courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return repo.removeCoupon(couponId);
}

module.exports = {
    // Course
    createCourse, getCourse, getInstructorCourses, getPublishedCourses,
    updateCourse, deleteCourse, submitCourse, publishCourse, hideCourse,
    previewCourse, getCourseDetail, getCoursePrice,
    // Section
    createSection, getSections, updateSection, deleteSection, reorderSections,
    // Lesson
    createLesson, getLessons, updateLesson, deleteLesson, reorderLessons,
    addResource, getResources, deleteResource,
    // Coupon
    createCoupon, getCoupons, validateCoupon, deleteCoupon,
};
