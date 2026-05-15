import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getDashboardStats, getClientAnalytics, upsertAnalytics } from '../controllers/analyticsController.js';

const r = Router();
r.use(verifyToken);

r.get('/dashboard', getDashboardStats);
r.get('/client',    getClientAnalytics);
r.post('/client',
  body('client_id').notEmpty().withMessage('client_id required'),
  body('date').notEmpty().withMessage('date required'),
  validate,
  upsertAnalytics
);

export default r;
