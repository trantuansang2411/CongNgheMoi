const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function indexCourse(data) {
    return prisma.courseIndex.upsert({
        where: { courseId: data.courseId },
        create: data,
        update: data,
    });
}

async function removeCourse(courseId) {
    return prisma.courseIndex.delete({ where: { courseId } }).catch(() => null);
}

async function searchCourses({ keyword, topicId, minPrice, maxPrice, sortBy, page = 1, limit = 20 }) {
    const where = {};
    // Tìm kiếm theo tên khóa học (case-insensitive nghĩa là không phân biệt hoa thường)
    if (keyword) where.title = { contains: keyword, mode: 'insensitive' };
    if (topicId) where.topicId = topicId;
    if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = Number(minPrice);
        if (maxPrice !== undefined) where.price.lte = Number(maxPrice);
    }

    const orderBy = {};
    if (sortBy === 'price_asc') orderBy.price = 'asc';
    else if (sortBy === 'price_desc') orderBy.price = 'desc';
    else if (sortBy === 'rating') orderBy.ratingAvg = 'desc';
    else orderBy.publishedAt = 'desc';

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        prisma.courseIndex.findMany({ where, orderBy, skip, take: limit }),
        prisma.courseIndex.count({ where }),
    ]);
    return { items, total, page, limit };
}

async function updateRating(courseId, ratingAvg, ratingCount) {
    return prisma.courseIndex.update({ where: { courseId }, data: { ratingAvg, ratingCount } }).catch(() => null);
}

module.exports = { prisma, indexCourse, removeCourse, searchCourses, updateRating };
