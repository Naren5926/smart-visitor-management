const { Router } = require('express');
const { listUsers, createUser, setUserStatus } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { adminCreateUserSchema, statusSchema } = require('../validators/schemas');
const { ROLES } = require('../constants/roles');

const router = Router();

// Everything here is admin-only, enforced on the server.
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', listUsers);
router.post('/', validate(adminCreateUserSchema), createUser);
router.patch('/:id/status', validate(statusSchema), setUserStatus);

module.exports = router;
