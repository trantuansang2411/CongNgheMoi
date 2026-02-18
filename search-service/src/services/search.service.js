const searchRepo = require('../repositories/search.repo');
const logger = require('../../shared/utils/logger');

async function searchCourses(query) {
    return searchRepo.searchCourses(query);
}

async function indexCourse(data) {
    await searchRepo.indexCourse(data);
    logger.info(`Indexed course: ${data.courseId}`);
}

async function updateCourse(data) {
    await searchRepo.indexCourse(data);
    logger.info(`Updated course index: ${data.courseId}`);
}

async function removeCourse(courseId) {
    await searchRepo.removeCourse(courseId);
    logger.info(`Removed course from index: ${courseId}`);
}

async function updateRating(courseId, ratingAvg, ratingCount) {
    await searchRepo.updateRating(courseId, ratingAvg, ratingCount);
    logger.info(`Updated rating for course: ${courseId}`);
}

module.exports = { searchCourses, indexCourse, updateCourse, removeCourse, updateRating };
