const { Router } = require('express');
const ctrl = require('../controllers/notification.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const router = Router();
router.get('/', authenticate, ctrl.getNotifications);
router.get('/unread-count', authenticate, ctrl.unreadCount);
router.put('/:notificationId/read', authenticate, ctrl.markRead);
router.put('/read-all', authenticate, ctrl.markAllRead);
module.exports = router;
