const { Router } = require('express');
const {
  listUsers,
  getStats,
  createUser,
  bulkCreateStudents,
  resendCredentials,
  setUserStatus,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { adminCreateUserSchema, bulkStudentsSchema, statusSchema } = require('../validators/schemas');
const { ROLES } = require('../constants/roles');

const router = Router();

// Everything here is admin-only, enforced on the server.
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', listUsers);
router.get('/stats', getStats);
router.post('/', validate(adminCreateUserSchema), createUser);
router.post('/bulk', validate(bulkStudentsSchema), bulkCreateStudents);
router.post('/:id/resend-credentials', resendCredentials);
router.patch('/:id/status', validate(statusSchema), setUserStatus);

module.exports = router;
