const { z } = require('zod');
const { PURPOSE_VALUES } = require('../constants/visits');

const optionalText = (max) => z.string().trim().max(max).optional();

// Meeting a staff member needs a teacher and a reason; library and lab visits need neither.
const createVisitSchema = z
  .object({
    purpose: z.enum(PURPOSE_VALUES),
    teacherId: z.string().trim().min(1).max(40).optional(),
    reason: optionalText(300),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.purpose !== 'staff') return;
    if (!v.teacherId) ctx.addIssue({ code: 'custom', path: ['teacherId'], message: 'Choose a teacher' });
    if (!v.reason || v.reason.length < 3) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Tell the teacher why you want to meet' });
    }
  });

const decisionSchema = z
  .object({ decision: z.enum(['approve', 'reject']), note: optionalText(300) })
  .strict();

const arrivalSchema = z.object({ code: z.string().min(1).max(200) }).strict();

const scanSchema = z.object({ token: z.string().min(1).max(2000) }).strict();

const blockSchema = z
  .object({
    studentId: z.string().trim().min(1).max(40),
    reason: z.string().trim().min(5, 'Please explain the reason (at least 5 characters)').max(500),
  })
  .strict();

module.exports = { createVisitSchema, decisionSchema, arrivalSchema, scanSchema, blockSchema };
