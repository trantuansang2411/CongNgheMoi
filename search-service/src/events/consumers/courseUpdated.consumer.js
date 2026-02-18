const searchService = require('../../services/search.service');
const logger = require('../../../shared/utils/logger');

async function handleCourseUpdated(msg) {
    const { data } = msg;
    logger.info(`Updating course in index: ${data.courseId}`);
    await searchService.updateCourse(data);
}

module.exports = handleCourseUpdated;
