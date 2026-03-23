const Review = require('../models/mongoose/Review.model');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const grpcClients = require('../grpc');
const { NotFoundError, BadRequestError, ConflictError } = require('../../shared/utils/errors');

function toFallbackName(studentId) {
    if (!studentId) return 'Hoc vien';
    return `Hoc vien ${String(studentId).slice(0, 8)}`;
}

async function getStudentProfile(studentId) {
    try {
        const profile = await grpcClients.userService.getUserProfile(studentId);
        return {
            studentName: profile?.fullName || toFallbackName(studentId),
            studentAvatarUrl: profile?.avatarUrl || '',
        };
    } catch (error) {
        logger.warn(`Cannot fetch student profile for ${studentId}: ${error.message}`);
        return {
            studentName: toFallbackName(studentId),
            studentAvatarUrl: '',
        };
    }
}

async function enrichReview(review) {
    const profile = await getStudentProfile(review.studentId);
    return { ...review, ...profile };
}

async function enrichReviews(reviews) {
    const uniqueStudentIds = [...new Set(reviews.map((item) => item.studentId).filter(Boolean))];

    const profileEntries = await Promise.all(
        uniqueStudentIds.map(async (studentId) => [studentId, await getStudentProfile(studentId)])
    );
    const profileMap = new Map(profileEntries);

    return reviews.map((item) => ({
        ...item,
        ...(profileMap.get(item.studentId) || {
            studentName: toFallbackName(item.studentId),
            studentAvatarUrl: '',
        }),
    }));
}

async function createReview(studentId, { courseId, rating, comment }) {
    //validate student is enrolled in course
    const hasEnrolled = await grpcClients.learningService.hasEnrolled(studentId, courseId);
    if (!hasEnrolled) throw new BadRequestError('Student is not enrolled in this course');

    const existing = await Review.findOne({ studentId, courseId });
    if (existing) throw new ConflictError('You have already reviewed this course');

    const review = await Review.create({ studentId, courseId, rating, comment });

    const stats = await getCourseStats(courseId);
    await publishEvent('review.created', { courseId, ...stats });
    logger.info(`Review created: student=${studentId}, course=${courseId}, rating=${rating}`);

    return enrichReview(review.toObject());
}

async function updateReview(studentId, reviewId, { rating, comment }) {
    const review = await Review.findOne({ _id: reviewId, studentId });
    if (!review) throw new NotFoundError('Review not found');

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    await review.save();

    const stats = await getCourseStats(review.courseId);
    await publishEvent('review.updated', { courseId: review.courseId, ...stats });

    return enrichReview(review.toObject());
}

async function deleteReview(studentId, reviewId) {
    const review = await Review.findOneAndDelete({ _id: reviewId, studentId });
    if (!review) throw new NotFoundError('Review not found');
    return { deleted: true };
}

async function getReviewsByCourse(courseId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Review.find({ courseId, status: 'ACTIVE' }).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
        Review.countDocuments({ courseId, status: 'ACTIVE' }),
    ]);
    const enrichedItems = await enrichReviews(items);
    return { items: enrichedItems, total, page, limit };
}

async function getCourseStats(courseId) {
    const result = await Review.aggregate([
        { $match: { courseId, status: 'ACTIVE' } },
        { $group: { _id: '$courseId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (result.length === 0) return { ratingAvg: 0, ratingCount: 0 };
    return { ratingAvg: Math.round(result[0].avgRating * 100) / 100, ratingCount: result[0].count };
}

module.exports = { createReview, updateReview, deleteReview, getReviewsByCourse, getCourseStats };
