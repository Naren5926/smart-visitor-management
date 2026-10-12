const { Router } = require('express');
const {
  listTeachers,
  createVisit,
  myVisits,
  cancelVisit,
  getPass,
  verifyArrival,
  decideVisit,
} = require('../controllers/visitController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createVisitSchema, decisionSchema, arrivalSchema } = require('../validators/visitSchemas');
const { ROLES } = require('../constants/roles');

const router = Router();
router.use(authenticate);

const student = authorize(ROLES.VISITOR);

// Students
router.get('/teachers', student, listTeachers);
router.post('/', student, validate(createVisitSchema), createVisit);
router.get('/mine', student, myVisits);
router.post('/:id/cancel', student, cancelVisit);
router.get('/:id/pass', student, getPass);
router.post('/:id/verify-arrival', student, validate(arrivalSchema), verifyArrival);

// Teachers
router.post('/:id/decision', authorize(ROLES.HOST), validate(decisionSchema), decideVisit);

module.exports = router;
