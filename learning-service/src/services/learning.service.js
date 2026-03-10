const Enrollment = require('../models/mongoose/Enrollment.model');
const LessonProgress = require('../models/mongoose/LessonProgress.model');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { NotFoundError, BadRequestError } = require('../../shared/utils/errors');
// Hàm getMyCourses sẽ truy vấn cơ sở dữ liệu để lấy danh sách các khóa học mà sinh viên đã ghi danh,
// hỗ trợ phân trang thông qua các tham số page và limit. 
async function getMyCourses(studentId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Enrollment.find({ studentId }).skip(skip).limit(limit).sort({ enrolledAt: -1 }).lean(),
        Enrollment.countDocuments({ studentId }),
    ]);
    return { items, total, page, limit };
}
// Hàm getEnrollment sẽ lấy thông tin ghi danh cụ thể của sinh viên vào một khóa học, 
async function getEnrollment(studentId, courseId) {
    const enrollment = await Enrollment.findOne({ studentId, courseId }).lean();
    if (!enrollment) throw new NotFoundError('Enrollment not found');
    return enrollment;
}
// Hàm getLessonProgress sẽ truy vấn tiến độ học tập của sinh viên cho một khóa học cụ thể,
async function getLessonProgress(studentId, courseId) {
    return LessonProgress.find({ studentId, courseId }).lean();
}
// Hàm markLessonComplete sẽ đánh dấu một bài học cụ thể là đã hoàn thành cho sinh viên,
async function markLessonComplete(studentId, courseId, lessonId, totalLessons) {
    const enrollment = await Enrollment.findOne({ studentId, courseId });
    if (!enrollment) throw new NotFoundError('Not enrolled in this course');
    // Nếu bài học đã được đánh dấu là hoàn thành trước đó, hàm sẽ trả về thông tin tiến độ hiện tại mà không thực hiện cập nhật nào.
    await LessonProgress.findOneAndUpdate(
        { studentId, courseId, lessonId },
        { completed: true, completedAt: new Date() },
        { upsert: true, new: true }
    );

    // Recalculate progress
    // Sau khi đánh dấu bài học là hoàn thành, hàm sẽ tính toán lại tiến độ học tập của sinh viên 
    // bằng cách đếm số lượng bài học đã hoàn thành và so sánh với tổng số bài học trong khóa học.
    const completedCount = await LessonProgress.countDocuments({ studentId, courseId, completed: true });
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    enrollment.progressPercent = progressPercent;
    if (progressPercent >= 100 && enrollment.status !== 'COMPLETED') {
        enrollment.status = 'COMPLETED';
        enrollment.completedAt = new Date();
        await enrollment.save();

        // Publish course.completed event
        await publishEvent('course.completed', {
            studentId, courseId, enrollmentId: enrollment._id.toString(),
        });
        logger.info(`Course completed: student=${studentId}, course=${courseId}`);
    } else {
        await enrollment.save();
    }

    return { progressPercent, completed: progressPercent >= 100 };
}

// Event handler: order.paid → create enrollment
async function handleOrderPaid(data) {
    const { studentId, items } = data;
    for (const item of items) {
        // Trước khi tạo một enrollment mới, hàm handleOrderPaid sẽ kiểm tra xem sinh viên đã được ghi danh vào khóa học đó chưa 
        // bằng cách tìm kiếm trong cơ sở dữ liệu Enrollment.
        const existing = await Enrollment.findOne({ studentId, courseId: item.courseId });
        if (existing) { logger.warn(`Already enrolled: student=${studentId}, course=${item.courseId}`); continue; }
        // Nếu sinh viên chưa được ghi danh, hàm sẽ tạo một enrollment mới cho khóa học đó 
        // với thông tin chi tiết như studentId, courseId, instructorId và titleSnapshot.
        await Enrollment.create({
            studentId, courseId: item.courseId, instructorId: item.instructorId, titleSnapshot: item.titleSnapshot,
        });
        // Sau khi tạo enrollment thành công, hàm sẽ xuất bản một sự kiện 'course.enrolled' lên RabbitMQ 
        // với thông tin chi tiết về việc ghi danh vào khóa học,
        await publishEvent('course.enrolled', { studentId, courseId: item.courseId, title: item.titleSnapshot });
        logger.info(`Student ${studentId} enrolled in course ${item.courseId}`);
    }
}

module.exports = { getMyCourses, getEnrollment, getLessonProgress, markLessonComplete, handleOrderPaid };
