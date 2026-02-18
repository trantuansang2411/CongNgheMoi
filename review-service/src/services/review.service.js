const Review = require('../models/mongoose/Review.model');
const { publishEvent } = require('../../shared/events/rabbitmq');
const logger = require('../../shared/utils/logger');
const { NotFoundError, BadRequestError, ConflictError } = require('../../shared/utils/errors');

async function createReview(studentId, { courseId, rating, comment }) {
    const existing = await Review.findOne({ studentId, courseId });
    if (existing) throw new ConflictError('You have already reviewed this course');

    const review = await Review.create({ studentId, courseId, rating, comment });

    const stats = await getCourseStats(courseId);
    await publishEvent('review.created', { courseId, ...stats });
    logger.info(`Review created: student=${studentId}, course=${courseId}, rating=${rating}`);

    return review;
}

async function updateReview(studentId, reviewId, { rating, comment }) {
    const review = await Review.findOne({ _id: reviewId, studentId });
    if (!review) throw new NotFoundError('Review not found');

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    await review.save();

    const stats = await getCourseStats(review.courseId);
    await publishEvent('review.updated', { courseId: review.courseId, ...stats });

    return review;
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
    return { items, total, page, limit };
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
