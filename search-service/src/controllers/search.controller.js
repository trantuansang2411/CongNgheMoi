const svc = require('../services/search.service');
const searchCourses = async (req, res, next) => {
    try {
        const { keyword, topicId, minPrice, maxPrice, sortBy, page, limit } = req.query;
        res.json({ success: true, data: await svc.searchCourses({ keyword, topicId, minPrice, maxPrice, sortBy, page: +page || 1, limit: +limit || 20 }) });
    } catch (e) { next(e); }
};
module.exports = { searchCourses };
