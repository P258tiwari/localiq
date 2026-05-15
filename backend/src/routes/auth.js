import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, getMe, changePassword } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const r = Router();

r.post('/login',
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
  login
);

r.post('/logout', verifyToken, logout);

r.get('/me', verifyToken, getMe);

r.post('/change-password',
  verifyToken,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate,
  changePassword
);

export default r;
