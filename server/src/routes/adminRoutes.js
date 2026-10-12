const { Router } = require('express');
const { blockLogs, liftBlock } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/block-logs', blockLogs);
router.post('/block-logs/:id/lift', liftBlock);

module.exports = router;
