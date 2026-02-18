const searchService = require('../../services/search.service');
const logger = require('../../../shared/utils/logger');

async function handleCourseDeleted(msg) {
    const { data } = msg;
    logger.info(`Removing course from index: ${data.courseId}`);
    await searchService.removeCourse(data.courseId);
}

module.exports = handleCourseDeleted;
