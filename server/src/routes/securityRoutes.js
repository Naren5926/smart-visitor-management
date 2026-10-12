const { Router } = require('express');
const { overview, scan, checkout } = require('../controllers/securityController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { scanSchema } = require('../validators/visitSchemas');
const { ROLES } = require('../constants/roles');

const router = Router();
router.use(authenticate, authorize(ROLES.SECURITY));

router.get('/overview', overview);
router.post('/scan', validate(scanSchema), scan);
router.post('/checkout/:id', checkout);

module.exports = router;
