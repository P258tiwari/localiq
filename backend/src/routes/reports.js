import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getClientReport } from '../controllers/reportsController.js';

const r = Router();
r.use(verifyToken);

r.get('/client/:client_id', getClientReport);

export default r;
