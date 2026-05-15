import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/usersController.js';

const r = Router();
r.use(verifyToken);

r.get('/', requireAdmin, getUsers);

r.post('/',
  requireAdmin,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Min 8 characters'),
  body('name').notEmpty().trim().withMessage('Name required'),
  body('role').optional().isIn(['admin','member']).withMessage('Role must be admin or member'),
  validate,
  createUser
);

r.patch('/:id', requireAdmin, updateUser);
r.delete('/:id', requireAdmin, deleteUser);

export default r;
