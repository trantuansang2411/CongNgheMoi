const searchService = require('../../services/search.service');
const logger = require('../../../shared/utils/logger');

async function handleCoursePublished(msg) {
    const { data } = msg;
    logger.info(`Indexing published course: ${data.courseId}`);
    await searchService.indexCourse(data);
}

module.exports = handleCoursePublished;
