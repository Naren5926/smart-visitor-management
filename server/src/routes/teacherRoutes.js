const { Router } = require('express');
const { myRequests, liveCode, searchStudents, createBlock, myBlocks } = require('../controllers/teacherController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { blockSchema } = require('../validators/visitSchemas');
const { ROLES } = require('../constants/roles');

const router = Router();
router.use(authenticate, authorize(ROLES.HOST));

router.get('/requests', myRequests);
router.get('/live-code', liveCode);
router.get('/students', searchStudents);
router.get('/blocks', myBlocks);
router.post('/blocks', validate(blockSchema), createBlock);

module.exports = router;
