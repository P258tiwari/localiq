import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { getCategories, createCategory, updateCategory, deleteCategory, recommendForClient } from '../controllers/categoriesController.js';

const r = Router();
r.use(verifyToken);

r.get('/',    getCategories);
r.post('/',   requireAdmin, createCategory);
r.put('/:id', requireAdmin, updateCategory);
r.delete('/:id', requireAdmin, deleteCategory);

r.post('/recommend/:client_id', recommendForClient);

export default r;
