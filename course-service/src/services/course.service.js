const courseRepo = require('../repositories/course.repo');
const sectionRepo = require('../repositories/section.repo');
const lessonRepo = require('../repositories/lesson.repo');
const lessonResourceRepo = require('../repositories/lessonResource.repo');
const couponRepo = require('../repositories/coupon.repo');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../shared/utils/errors');

// ============ COURSE ============
async function createCourse(instructorId, data) {
    const course = await courseRepo.create({ ...data, instructorId });
    logger.info(`Course created: ${course.courseId}`);
    return course;
}

async function getCourse(courseId) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return course;
}

async function getInstructorCourses(instructorId, page, limit) {
    return courseRepo.findByInstructor(instructorId, page, limit);
}

async function getPublishedCourses(page, limit) {
    return courseRepo.findPublished(page, limit);
}

async function updateCourse(courseId, instructorId, data) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    const updated = await courseRepo.update(courseId, data);
    return updated;
}

async function deleteCourse(courseId, instructorId) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return courseRepo.softDelete(courseId);
}

async function submitCourse(courseId, instructorId) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    if (course.status !== 'DRAFT') throw new BadRequestError('Only draft courses can be submitted');
    return courseRepo.updateStatus(courseId, 'SUBMITTED', { submittedAt: new Date() });
}

async function publishCourse(courseId) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.status !== 'SUBMITTED') throw new BadRequestError('Course must be submitted first');

    const updated = await courseRepo.updateStatus(courseId, 'PUBLISHED', { publishedAt: new Date() });

    try {
        await publishEvent('course.published', {
            courseId: updated.courseId,
            title: updated.title,
            instructorId: updated.instructorId,
            basePrice: updated.basePrice,
            salePrice: updated.salePrice,
            topicId: updated.topicId,
            publishedAt: updated.publishedAt,
        });
    } catch (err) {
        logger.error('Failed to publish course.published event:', err.message);
    }

    return updated;
}

async function hideCourse(courseId) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return courseRepo.updateStatus(courseId, 'HIDDEN');
}

async function previewCourse(courseId, instructorId) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');

    const sections = await sectionRepo.findByCourse(courseId);
    const lessons = await lessonRepo.findByCourse(courseId);
    return { course, sections, lessons };
}

async function getCourseDetail(courseId) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.status !== 'PUBLISHED') throw new NotFoundError('Course not found');

    const sections = await sectionRepo.findByCourse(courseId);
    const lessons = await lessonRepo.findByCourse(courseId);
    const previewLessons = lessons.filter((l) => l.isPreview);

    return {
        course, sections, lessons: lessons.map(l => ({
            _id: l._id,
            title: l.title,
            sectionId: l.sectionId,
            orderIndex: l.orderIndex,
            durationSec: l.durationSec,
            isPreview: l.isPreview,
            videoUrl: l.isPreview ? l.videoUrl : undefined,
        })), previewLessons
    };
}

// ============ SECTION ============
async function createSection(courseId, instructorId, data) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    const section = await sectionRepo.create({ ...data, courseId });
    await courseRepo.updateCourseStats(courseId);
    return section;
}

async function getSections(courseId) {
    return sectionRepo.findByCourse(courseId);
}

async function updateSection(sectionId, instructorId, data) {
    const section = await sectionRepo.findById(sectionId);
    if (!section) throw new NotFoundError('Section not found');
    const course = await courseRepo.findByCourseId(section.courseId);
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return sectionRepo.update(sectionId, data);
}

async function deleteSection(sectionId, instructorId) {
    const section = await sectionRepo.findById(sectionId);
    if (!section) throw new NotFoundError('Section not found');
    const course = await courseRepo.findByCourseId(section.courseId);
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    await sectionRepo.remove(sectionId);
    await courseRepo.updateCourseStats(section.courseId);
    return { message: 'Section deleted' };
}

// ============ LESSON ============
async function createLesson(courseId, sectionId, instructorId, data) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    const lesson = await lessonRepo.create({ ...data, courseId, sectionId });
    await courseRepo.updateCourseStats(courseId);
    return lesson;
}

async function getLessons(sectionId) {
    return lessonRepo.findBySection(sectionId);
}

async function updateLesson(lessonId, instructorId, data) {
    const lesson = await lessonRepo.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    const course = await courseRepo.findByCourseId(lesson.courseId);
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    const updated = await lessonRepo.update(lessonId, data);
    await courseRepo.updateCourseStats(lesson.courseId);
    return updated;
}

async function deleteLesson(lessonId, instructorId) {
    const lesson = await lessonRepo.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    const course = await courseRepo.findByCourseId(lesson.courseId);
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    await lessonRepo.remove(lessonId);
    await courseRepo.updateCourseStats(lesson.courseId);
    return { message: 'Lesson deleted' };
}

// ============ RESOURCES ============
async function addResource(lessonId, instructorId, data) {
    const lesson = await lessonRepo.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    const course = await courseRepo.findByCourseId(lesson.courseId);
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return lessonResourceRepo.create({ ...data, lessonId });
}

async function getResources(lessonId) {
    return lessonResourceRepo.findByLesson(lessonId);
}

async function deleteResource(resourceId, instructorId) {
    const resource = await lessonResourceRepo.findById(resourceId);
    if (!resource) throw new NotFoundError('Resource not found');
    const lesson = await lessonRepo.findById(resource.lessonId);
    const course = await courseRepo.findByCourseId(lesson.courseId);
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return lessonResourceRepo.softDelete(resourceId);
}

// ============ COUPON ============
async function createCoupon(courseId, instructorId, data) {
    const course = await courseRepo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return couponRepo.create({ ...data, courseId });
}

async function getCoupons(courseId) {
    return couponRepo.findByCourse(courseId);
}

async function validateCoupon(courseId, code) {
    const coupon = await couponRepo.findByCode(courseId, code);
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
    const coupon = await couponRepo.findById(couponId);
    if (!coupon) throw new NotFoundError('Coupon not found');
    const course = await courseRepo.findByCourseId(coupon.courseId);
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    return couponRepo.remove(couponId);
}

// ============ PRICING (gRPC) ============
async function getCoursePrice(courseId) {
    const course = await courseRepo.findByCourseId(courseId);
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

async function getLessonMeta(lessonId) {
    const lesson = await lessonRepo.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    const resources = await lessonResourceRepo.findByLesson(lessonId);
    return {
        lessonId: lesson._id.toString(),
        courseId: lesson.courseId,
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        durationSec: lesson.durationSec,
        isPreview: lesson.isPreview,
        resources: resources.map(r => ({
            resourceId: r._id.toString(),
            name: r.name,
            url: r.url,
            type: r.type,
            mimeType: r.mimeType,
            sizeBytes: r.sizeBytes,
        })),
    };
}

module.exports = {
    createCourse, getCourse, getInstructorCourses, getPublishedCourses,
    updateCourse, deleteCourse, submitCourse, publishCourse, hideCourse,
    previewCourse, getCourseDetail,
    createSection, getSections, updateSection, deleteSection,
    createLesson, getLessons, updateLesson, deleteLesson,
    addResource, getResources, deleteResource,
    createCoupon, getCoupons, validateCoupon, deleteCoupon,
    getCoursePrice, getLessonMeta,
};
