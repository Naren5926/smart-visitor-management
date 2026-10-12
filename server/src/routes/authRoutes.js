const { Router } = require('express');
const { register, login, me, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const { registerSchema, loginSchema, changePasswordSchema } = require('../validators/schemas');

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', authenticate, me);
router.post('/change-password', authLimiter, authenticate, validate(changePasswordSchema), changePassword);

module.exports = router;
