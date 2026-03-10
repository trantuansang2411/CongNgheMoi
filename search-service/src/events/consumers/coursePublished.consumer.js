const searchService = require('../../services/search.service');
const logger = require('../../../shared/utils/logger');

async function handleCoursePublished(msg) {
    //get data from mq and call search service to index the course
    const { data } = msg;
    logger.info(`Indexing published course: ${data.courseId}`);
    // Map đầy đủ thuộc tính
    const indexData = {
        courseId: data.courseId,
        title: data.title,
        slug: data.slug,
        description: data.description,
        
        instructorId: data.instructorId,
        instructorName: data.instructorName || 'Unknown',
        
        topicId: data.topicId,
        
        basePrice: data.basePrice,
        salePrice: data.salePrice,
        currency: data.currency || 'VND',
        
        totalSections: data.totalSections || 0,
        totalLessons: data.totalLessons || 0,
        totalDurationSec: data.totalDurationSec || 0,
        
        thumbnailUrl: data.thumbnailUrl,
        
        publishedAt: data.publishedAt,
    };
    await searchService.indexCourse(indexData);
}

module.exports = handleCoursePublished;
