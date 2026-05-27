const repo = require('../repositories/course.repo');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../shared/utils/errors');
const { UPLOAD_DIR } = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// Xóa file vật lý nếu là file local (không phải URL ngoài)
function deleteLocalFile(fileUrl) {
    if (!fileUrl || fileUrl.startsWith('http')) return;
    try {
        // fileUrl dạng /course-uploads/videos/xxx.mp4
        const relative = fileUrl.replace(/^\/course-uploads\//, '');
        const fullPath = path.join(UPLOAD_DIR, relative);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            logger.info(`Deleted file: ${fullPath}`);
        }
    } catch (err) {
        logger.warn(`Failed to delete file ${fileUrl}: ${err.message}`);
    }
}

function deleteUploadedFile(url) {
    deleteLocalFile(url);
}

// ============ COURSE ============
async function handleInstructorData(userId, displayName) {
    await repo.upsertInstructorProfile(userId, displayName);
    await repo.updateCoursesInstructorName(userId, displayName);
    logger.info(`Instructor cache updated: ${userId} -> ${displayName}`);
}

async function createCourse(instructorId, data) {
    const cached = await repo.findInstructorProfile(instructorId);
    const instructorName = cached?.displayName || '';
    const course = await repo.createCourse({ ...data, instructorId, instructorName });
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

async function getSubmittedCourses(status, page, limit) {
    return repo.findSubmitted(status, page, limit);
}
async function getAllCategories() {
    return repo.findAllCategories();
}

async function updateCourse(courseId, instructorId, data) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    if (course.status === 'PUBLISHED') throw new BadRequestError('Published course cannot be edited');
    if (course.status === 'SUBMITTED') throw new BadRequestError('Submitted course cannot be edited');
    // Xóa thumbnail cũ nếu được thay bằng file mới
    if (data.thumbnailUrl && data.thumbnailUrl !== course.thumbnailUrl) {
        deleteLocalFile(course.thumbnailUrl);
    }
    return repo.updateCourse(courseId, data);
}

async function deleteCourse(courseId, instructorId) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    if (course.status === 'PUBLISHED') throw new BadRequestError('Published course cannot be deleted');
    if (course.status === 'SUBMITTED') throw new BadRequestError('Submitted course cannot be deleted');
    // Xóa thumbnail
    deleteLocalFile(course.thumbnailUrl);
    // Xóa tất cả file video và resource của các lesson trong course
    const lessons = await repo.findLessonsByCourse(courseId);
    for (const lesson of lessons) {
        deleteLocalFile(lesson.videoUrl);
        const resources = await repo.findResourcesByLesson(lesson.lessonId || lesson._id.toString());
        for (const res of resources) {
            if (res.type === 'FILE') deleteLocalFile(res.url);
        }
    }
    return repo.softDeleteCourse(courseId);
}

async function submitCourse(courseId, instructorId) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.instructorId !== instructorId) throw new ForbiddenError('Not your course');
    if (!['DRAFT', 'NEEDS_FIXES'].includes(course.status)) throw new BadRequestError('Only draft or needs-fixes courses can be submitted');
    return repo.updateStatus(courseId, 'SUBMITTED', { submittedAt: new Date() });
}


async function publishCourse(courseId) { // gRPC
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.status !== 'SUBMITTED') throw new BadRequestError('Course must be submitted first');

    const updated = await repo.updateStatus(courseId, 'PUBLISHED', { publishedAt: new Date() });

    try {
        // Query sections & lessons to enrich the event payload.
        // learning-service will use these to build a CourseSnapshot (removing gRPC dependency).
        // search-service and notification-service are NOT affected — they only read their own fields.
        const [sections, lessons] = await Promise.all([
            repo.findSectionsByCourse(courseId),
            repo.findLessonsByCourse(courseId),
        ]);

        await publishEvent('course.published', {
            courseId: updated.courseId,
            title: updated.title,
            slug: updated.slug,
            description: updated.description,

            instructorId: updated.instructorId,
            instructorName: updated.instructorName || '',

            topicId: updated.topicId,

            basePrice: updated.basePrice,
            salePrice: updated.salePrice,
            currency: updated.currency,

            totalSections: updated.totalSections,
            totalLessons: updated.totalLessons,
            totalDurationSec: updated.totalDurationSec,

            thumbnailUrl: updated.thumbnailUrl,

            publishedAt: updated.publishedAt,

            // --- Extended payload for learning-service snapshot (backward-compatible) ---
            sections: sections.map(s => ({
                sectionId: s.sectionId || s._id.toString(),
                title: s.title,
                orderIndex: s.orderIndex,
            })),
            lessons: lessons.map(l => ({
                lessonId: l.lessonId || l._id.toString(),
                sectionId: l.sectionId || '',
                title: l.title,
                orderIndex: l.orderIndex,
                durationSec: l.durationSec || 0,
                isPreview: !!l.isPreview,
                videoUrl: l.videoUrl || '',
            })),
        });
    } catch (err) {
        logger.error('Failed to publish course.published event:', err.message);
    }

    return updated;
}

async function markCourseNeedsFixes(courseId) { // gRPC
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (course.status !== 'SUBMITTED') throw new BadRequestError('Only submitted courses can be marked as needs fixes');
    return repo.updateStatus(courseId, 'NEEDS_FIXES');
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

async function getCourseReviewDetail(courseId) {
    const course = await repo.findByCourseId(courseId);
    if (!course) throw new NotFoundError('Course not found');
    if (!['SUBMITTED', 'PUBLISHED', 'NEEDS_FIXES'].includes(course.status)) {
        throw new BadRequestError('Course is not available for review');
    }
    const sections = await repo.findSectionsByCourse(courseId);
    const lessons = await repo.findLessonsByCourse(courseId);
    const resources = await repo.findResourcesByCourse(courseId);

    return { course, sections, lessons, resources };
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
    // Xóa file của các lesson trong section
    const lessons = await repo.findLessonsBySection(sectionId);
    for (const lesson of lessons) {
        deleteLocalFile(lesson.videoUrl);
        const resources = await repo.findResourcesByLesson(lesson.lessonId || lesson._id.toString());
        for (const res of resources) {
            if (res.type === 'FILE') deleteLocalFile(res.url);
        }
    }
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
    // Xóa video cũ nếu được thay bằng file mới
    if (data.videoUrl !== undefined && data.videoUrl !== lesson.videoUrl) {
        deleteLocalFile(lesson.videoUrl);
    }
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
    // Xóa video và tất cả resource file của lesson
    deleteLocalFile(lesson.videoUrl);
    const resources = await repo.findResourcesByLesson(lessonId);
    for (const res of resources) {
        if (res.type === 'FILE') deleteLocalFile(res.url);
    }
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
    // Always store UUID as lessonId (not MongoDB _id) for consistent querying
    const payload = { ...data, lessonId: lesson.lessonId };
    // Frontend sends 'title' but model uses 'name' — map it
    if (payload.title && !payload.name) {
        payload.name = payload.title;
        delete payload.title;
    }
    return repo.createResource(payload);
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
    // Xóa file vật lý nếu là FILE type
    if (resource.type === 'FILE') deleteLocalFile(resource.url);
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

async function updateCourseRating(courseId, ratingAvg, ratingCount) {
    return repo.updateCourseRating(courseId, ratingAvg, ratingCount);
}

module.exports = {
    // Course
    createCourse, getCourse, getInstructorCourses, getPublishedCourses,
    getAllCategories,
    getSubmittedCourses, updateCourse, deleteCourse, submitCourse, publishCourse, markCourseNeedsFixes,
    previewCourse, getCourseDetail, getCourseReviewDetail, updateCourseRating,
    // Section
    createSection, getSections, updateSection, deleteSection, reorderSections,
    // Lesson
    createLesson, getLessons, updateLesson, deleteLesson, reorderLessons,
    addResource, getResources, deleteResource,
    // Coupon
    createCoupon, getCoupons, validateCoupon, deleteCoupon,
    // Instructor cache
    handleInstructorData,
    // Upload cleanup
    deleteUploadedFile,
};

