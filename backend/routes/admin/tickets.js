const router = require('express').Router();
const ctrl   = require('../../controllers/ticketController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get  ('/',             ctrl.getTickets);
router.get  ('/stats',        ctrl.getStats);
router.post ('/',             ctrl.createTicket);
router.patch('/:id/assign',   ctrl.assignTicket);
router.post ('/:id/reply',    ctrl.replyTicket);
router.patch('/:id/resolve',  ctrl.resolveTicket);
router.patch('/:id/close',    ctrl.closeTicket);

module.exports = router;
