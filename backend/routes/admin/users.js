const router = require('express').Router();
const ctrl   = require('../../controllers/userController');
const { protect, adminOnly } = require('../../middleware/auth');

router.use(protect, adminOnly);

router.get  ('/',            ctrl.getUsers);
router.post ('/',            ctrl.createUser);
router.get  ('/:id',         ctrl.getUser);
router.put  ('/:id',         ctrl.updateUser);
router.patch('/:id/status',  ctrl.updateStatus);
router.delete('/:id',        ctrl.deleteUser);
router.post ('/:id/unlock',  ctrl.unlockUser);

module.exports = router;
