import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { getTeamAssignments, assignUser, removeAssignment, getUserClients, updateAssignment } from '../controllers/teamController.js';

const r = Router();
r.use(verifyToken);

r.get('/user/:user_id',         getUserClients);

r.get('/client/:client_id',     getTeamAssignments);
r.post('/client/:client_id',    requireAdmin, assignUser);
r.put('/:id',                   requireAdmin, updateAssignment);
r.delete('/:id',                requireAdmin, removeAssignment);

export default r;
